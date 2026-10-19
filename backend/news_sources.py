"""
新聞來源模組：工商時報 (ctee)、鉅亨網 (cnyes)、Yahoo奇摩股市 (yahoo)

做法（不需要模擬瀏覽器，也沒有用到各網站的內部 API）：
  - ctee / yahoo：Google News Sitemap（robots.txt 公開列出），內含 網址 + 標題 + 發布時間
  - cnyes       ：官方 RSS（robots.txt 公開列出），內含 標題 + 連結 + 發布時間 + 摘要
  - 三者的全文  ：進入文章頁，用 extract_body() 從 HTML 抽出內文

禮貌規則：
  - 使用誠實的 User-Agent（不偽裝成瀏覽器），請在環境變數 CRAWLER_USER_AGENT 填入你的聯絡信箱
  - 抓每個網址前先檢查 robots.txt
  - 同一個網站的請求之間至少間隔 delay 秒
"""
from __future__ import annotations

import json
import logging
import os
import re
import time
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from urllib.parse import urlparse
from urllib.robotparser import RobotFileParser

import requests
from bs4 import BeautifulSoup
from defusedxml import ElementTree as ET  # 比內建 xml.etree 安全，避免惡意 XML

log = logging.getLogger("news_sources")

USER_AGENT = os.getenv(
    "CRAWLER_USER_AGENT",
    "NewsStockAnalysis-StudentProject/1.0 (graduation project; contact: your-email@example.com)",
)
TAIPEI = timezone(timedelta(hours=8))

MIN_BODY_CHARS = 80      # 內文少於這個字數就視為抓取失敗（避免存進只有幾句話的垃圾）
MAX_BODY_CHARS = 20000   # 單篇內文上限

SM_NS = {
    "sm": "http://www.sitemaps.org/schemas/sitemap/0.9",
    "news": "http://www.google.com/schemas/sitemap-news/0.9",
}

CTEE_SITEMAP = "https://www.ctee.com.tw/sitemaps/sitemap_newstoday.xml"
YAHOO_SITEMAP_INDEX = "https://tw.stock.yahoo.com/news-sitemap-index.xml"
# 預設用「全部新聞」。這個 feed 會混入很多外匯速報這類短訊，
# 想只抓特定分類，可在環境變數 CNYES_RSS_URLS 填入其他分類的 RSS（逗號分隔）。
CNYES_RSS_URLS = [
    u.strip()
    for u in os.getenv("CNYES_RSS_URLS", "https://news.cnyes.com/rss/v1/news/category/all").split(",")
    if u.strip()
]


@dataclass
class Article:
    source: str                       # ctee / cnyes / yahoo
    url: str
    title: str
    published_at: datetime | None     # UTC、不帶時區（與資料庫 DateTime 欄位一致）
    summary: str = ""
    content: str = ""


# ----------------------------------------------------------------------------
# 時間處理：一律轉成 UTC 並去掉時區資訊（models.News.published_at 預設也是 utcnow）
# ----------------------------------------------------------------------------
def _to_utc_naive(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=TAIPEI)
    return dt.astimezone(timezone.utc).replace(tzinfo=None)


def _parse_iso(s: str | None) -> datetime | None:
    s = (s or "").strip()
    if not s:
        return None
    try:
        return _to_utc_naive(datetime.fromisoformat(s.replace("Z", "+00:00")))
    except ValueError:
        return None


def _parse_rfc822(s: str | None) -> datetime | None:
    try:
        return _to_utc_naive(parsedate_to_datetime((s or "").strip()))
    except (TypeError, ValueError):
        return None


# ----------------------------------------------------------------------------
# HTTP：robots.txt 檢查 + 限速 + 失敗重試一次
# ----------------------------------------------------------------------------
class Fetcher:
    def __init__(self, delay: float = 1.5, timeout: int = 15):
        self.session = requests.Session()
        self.session.headers.update({"User-Agent": USER_AGENT, "Accept-Language": "zh-TW,zh;q=0.9"})
        self.delay = delay
        self.timeout = timeout
        self._last_request: dict[str, float] = {}
        self._robots: dict[str, RobotFileParser | None] = {}

    def _wait(self, host: str) -> None:
        gap = time.monotonic() - self._last_request.get(host, 0.0)
        if gap < self.delay:
            time.sleep(self.delay - gap)
        self._last_request[host] = time.monotonic()

    def _robots_for(self, url: str) -> RobotFileParser | None:
        p = urlparse(url)
        base = f"{p.scheme}://{p.netloc}"
        if base in self._robots:
            return self._robots[base]
        rp: RobotFileParser | None = RobotFileParser()
        try:
            self._wait(p.netloc)
            r = self.session.get(base + "/robots.txt", timeout=self.timeout)
            if r.status_code == 200:
                rp.parse(r.text.splitlines())
            elif 400 <= r.status_code < 500:
                rp.parse([])      # 沒有 robots.txt => 視為全部允許（RFC 9309）
            else:
                rp = None         # 5xx：保守起見這次不抓這個網站
        except requests.RequestException as e:
            log.warning("讀取 %s/robots.txt 失敗：%s", base, e)
            rp = None
        self._robots[base] = rp
        return rp

    def allowed(self, url: str) -> bool:
        rp = self._robots_for(url)
        # 註：內建 robotparser 不支援 Google 式萬用字元（*、$），
        # 但這三個網站針對一般爬蟲禁止的路徑與新聞文章網址無關。
        return rp is not None and rp.can_fetch(USER_AGENT, url)

    def get(self, url: str) -> requests.Response | None:
        if not self.allowed(url):
            log.warning("robots.txt 不允許或無法確認，略過：%s", url)
            return None
        host = urlparse(url).netloc
        for attempt in range(2):
            self._wait(host)
            try:
                r = self.session.get(url, timeout=self.timeout)
            except requests.RequestException as e:
                log.warning("請求失敗（第 %d 次）%s：%s", attempt + 1, url, e)
                continue
            if r.status_code == 200:
                return r
            if r.status_code in (429, 500, 502, 503, 504):
                log.warning("HTTP %s（第 %d 次）%s", r.status_code, attempt + 1, url)
                time.sleep(self.delay * 2)
                continue
            log.warning("HTTP %s，放棄：%s", r.status_code, url)
            return None
        return None


# ----------------------------------------------------------------------------
# 取得「最新新聞清單」
# ----------------------------------------------------------------------------
def parse_news_sitemap(xml_bytes: bytes, source: str) -> list[Article]:
    """Google News Sitemap（工商時報、Yahoo 共用格式）。"""
    root = ET.fromstring(xml_bytes)
    arts: list[Article] = []
    for u in root.findall("sm:url", SM_NS):
        loc = (u.findtext("sm:loc", default="", namespaces=SM_NS) or "").strip()
        title = (u.findtext("news:news/news:title", default="", namespaces=SM_NS) or "").strip()
        pub = u.findtext("news:news/news:publication_date", default="", namespaces=SM_NS)
        if loc and title:
            arts.append(Article(source, loc, title, _parse_iso(pub)))
    return arts


def parse_rss(xml_bytes: bytes, source: str) -> list[Article]:
    """RSS 2.0（鉅亨網）。description 只是摘要，全文要進文章頁抓。"""
    root = ET.fromstring(xml_bytes)
    arts: list[Article] = []
    for item in root.iter("item"):
        title = (item.findtext("title") or "").strip()
        link = (item.findtext("link") or "").strip()
        desc_html = item.findtext("description") or ""
        summary = re.sub(r"\s+", " ", BeautifulSoup(desc_html, "html.parser").get_text()).strip()
        if title and link:
            arts.append(Article(source, link, title, _parse_rfc822(item.findtext("pubDate")), summary))
    return arts


def list_ctee(f: Fetcher) -> list[Article]:
    r = f.get(CTEE_SITEMAP)
    return parse_news_sitemap(r.content, "ctee") if r else []


def list_cnyes(f: Fetcher) -> list[Article]:
    arts: list[Article] = []
    for url in CNYES_RSS_URLS:
        r = f.get(url)
        if r:
            arts.extend(parse_rss(r.content, "cnyes"))
    return arts


def list_yahoo(f: Fetcher, days: int = 2) -> list[Article]:
    """Yahoo 的 sitemap 一天一份，先讀索引，再取最近 days 天。"""
    r = f.get(YAHOO_SITEMAP_INDEX)
    if not r:
        return []
    root = ET.fromstring(r.content)
    locs = [(e.text or "").strip() for e in root.findall("sm:sitemap/sm:loc", SM_NS)]
    dated = []
    for loc in locs:
        m = re.search(r"news-sitemap-(\d{4}-\d{2}-\d{2})\.xml", loc)
        if m:
            dated.append((m.group(1), loc))
    dated.sort(reverse=True)
    arts: list[Article] = []
    for _, loc in dated[:days]:
        rr = f.get(loc)
        if rr:
            arts.extend(parse_news_sitemap(rr.content, "yahoo"))
    return arts


SOURCES = {"ctee": list_ctee, "cnyes": list_cnyes, "yahoo": list_yahoo}


def list_articles(source: str, f: Fetcher) -> list[Article]:
    """回傳該來源的新聞清單：網址去重、由新到舊排序。"""
    seen: set[str] = set()
    uniq: list[Article] = []
    for a in SOURCES[source](f):
        if a.url not in seen:
            seen.add(a.url)
            uniq.append(a)
    uniq.sort(key=lambda a: a.published_at or datetime.min, reverse=True)
    return uniq


# ----------------------------------------------------------------------------
# 抽出文章內文
# ----------------------------------------------------------------------------
# 這些開頭的段落通常是「延伸閱讀、圖說」之類，不是內文
_JUNK_PREFIXES = ("延伸閱讀", "相關新聞", "推薦閱讀", "熱門新聞", "責任編輯", "圖／", "圖:", "圖：", "※")


def _iter_json_objects(data):
    if isinstance(data, dict):
        yield data
        for v in data.values():
            yield from _iter_json_objects(v)
    elif isinstance(data, list):
        for v in data:
            yield from _iter_json_objects(v)


def _tidy(text: str) -> str:
    lines = [re.sub(r"[ \t　]+", " ", ln).strip() for ln in text.splitlines()]
    return "\n".join(ln for ln in lines if ln)


def extract_body(html: bytes | str) -> str:
    """
    通用內文抽取（不針對單一網站寫死 CSS 選擇器，網站改版時比較不容易整個壞掉）：
      1. 如果頁面有 JSON-LD 的 articleBody，直接用
      2. 否則找 <article>（沒有就整頁），挑出「文字量最多的那一群 <p>」當內文
    抓不到時回傳空字串。
    """
    soup = BeautifulSoup(html, "html.parser")

    for tag in soup.find_all("script", attrs={"type": "application/ld+json"}):
        try:
            data = json.loads(tag.string or tag.get_text() or "")
        except (ValueError, TypeError):
            continue
        for obj in _iter_json_objects(data):
            body = obj.get("articleBody")
            if isinstance(body, str) and len(body.strip()) >= MIN_BODY_CHARS:
                return _tidy(body)

    for tag in soup(["script", "style", "noscript", "nav", "header", "footer", "aside", "form", "figure", "iframe"]):
        tag.decompose()

    articles = soup.find_all("article")
    scope = max(articles, key=lambda a: len(a.get_text())) if articles else (soup.body or soup)

    groups: dict[int, tuple] = {}
    for p in scope.find_all("p"):
        text = re.sub(r"\s+", " ", p.get_text()).strip()
        if len(text) < 12 or text.startswith(_JUNK_PREFIXES):
            continue
        groups.setdefault(id(p.parent), (p.parent, []))[1].append(text)
    if not groups:
        return ""
    _, texts = max(groups.values(), key=lambda g: sum(len(t) for t in g[1]))
    return _tidy("\n".join(texts))


def fill_content(f: Fetcher, art: Article) -> bool:
    """進文章頁抓全文，成功回傳 True。"""
    r = f.get(art.url)
    if r is None:
        return False
    body = extract_body(r.content)   # 傳 bytes，讓 BeautifulSoup 依網頁宣告的編碼解碼
    if len(body) < MIN_BODY_CHARS:
        return False
    art.content = body[:MAX_BODY_CHARS]
    return True


# ----------------------------------------------------------------------------
# 從文字抽出股票代號：「統一超（2912）」→ 2912
# ----------------------------------------------------------------------------
_TICKER_RE = re.compile(r"[（(](\d{4,6})[）)]")


def extract_tickers(text: str, max_count: int = 5) -> str | None:
    found: list[str] = []
    for code in _TICKER_RE.findall(text or ""):
        if len(code) == 4 and 2020 <= int(code) <= 2035:   # 多半是西元年，例如 (2026)
            continue
        if len(code) > 4 and not code.startswith("00"):    # 5~6 碼只有 ETF（00xxx）合理
            continue
        if code not in found:
            found.append(code)
    return ",".join(found[:max_count]) or None
