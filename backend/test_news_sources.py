"""
不需要網路、不需要資料庫的基本測試。執行：  python backend/test_news_sources.py
（測試資料是依照 2026-10 實際看到的各網站格式手動整理的；網站改版時，這裡先壞就代表解析要更新。）
"""
import os
import sys
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import news_sources as ns
import news_store as store

# ---------------------------------------------------------------- 測試資料
NEWS_SITEMAP = """<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
<url><loc>https://news.example.com/news/20261019701253-430503</loc><news:news><news:publication><news:name>範例媒體</news:name><news:language>zh_TW</news:language></news:publication><news:publication_date>2026-10-19T02:10:30+08:00</news:publication_date><news:title>夏季電價結束 紡纖廠成本減壓</news:title></news:news></url>
<url><loc>https://news.example.com/news/20261019701248-431207</loc><news:news><news:publication><news:name>範例媒體</news:name><news:language>zh_TW</news:language></news:publication><news:publication_date>2026-10-19T02:10:09+08:00</news:publication_date><news:title>水源資本策略投資日商Minimus</news:title></news:news></url>
<url><loc>https://news.example.com/news/no-title</loc></url>
</urlset>"""

YAHOO_SITEMAP = """<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
<url><loc>https://tw.stock.yahoo.com/news/%E8%BB%8A%E7%94%A8-001626079.html</loc><news:news><news:publication><news:name>Yahoo奇摩股市</news:name><news:language>zh-Hant-TW</news:language></news:publication><news:publication_date>2026-10-19T00:16:26Z</news:publication_date><news:title>車用與AI雙引擎點火</news:title></news:news></url>
</urlset>"""

YAHOO_INDEX = """<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<sitemap><loc>https://tw.stock.yahoo.com/sitemaps/news-sitemap-2026-10-17.xml</loc></sitemap>
<sitemap><loc>https://tw.stock.yahoo.com/sitemaps/news-sitemap-2026-10-19.xml</loc></sitemap>
<sitemap><loc>https://tw.stock.yahoo.com/sitemaps/news-sitemap-2026-10-18.xml</loc></sitemap>
</sitemapindex>"""

CNYES_RSS = """<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/"><channel>
<title>鉅亨網</title>
<item><title><![CDATA[〈房產〉台中移居熱區大洗牌]]></title><category>台灣房市</category>
<link>https://news.cnyes.com/news/id/6633381</link><guid isPermaLink="true">https://news.cnyes.com/news/id/6633381</guid>
<description><![CDATA[<p>房市買氣冷，台中人口移居潮也出現<b>新變化</b>。</p>]]></description>
<pubDate>Mon, 19 Oct 2026 14:54:32 +0800</pubDate></item>
</channel></rss>"""

ARTICLE_HTML = """<html><head><meta charset="utf-8"><title>x</title></head><body>
<nav><p>首頁 財經 股市 外匯 基金 期貨 房產 更多選單項目</p></nav>
<div class="ad"><p>廣告：這是一段很長很長很長很長的廣告文字不應該被當成內文</p></div>
<article>
  <h1>夏季電價結束 紡纖廠成本減壓</h1>
  <div class="content">
    <p>10月15日夏季電價結束，新纖(1402)、力麗(1444)、集盛(1455)等紡纖業者指出，部分非急單先前因電費差距而延後。</p>
    <p>業者表示，進入10月中旬後，核心需求預期將逐步回溫，成本壓力也隨之減輕，生產動能可望改善。</p>
    <p>延伸閱讀：這是延伸閱讀的段落不應該出現在內文裡面</p>
    <p>短句</p>
  </div>
  <div class="related"><p>相關新聞：另一則新聞的標題放在這裡也不應該出現</p></div>
</article>
<footer><p>版權所有 轉載必究 版權所有 轉載必究 版權所有 轉載必究</p></footer>
</body></html>"""

JSONLD_HTML = """<html><head><script type="application/ld+json">
{"@context":"https://schema.org","@graph":[{"@type":"NewsArticle","headline":"t","articleBody":"%s"}]}
</script></head><body><p>無關</p></body></html>""" % ("這是 JSON-LD 內的完整文章內容。" * 10)

BLOCKLIST_ROBOTS = """# Block the following bots
User-agent: ClaudeBot
User-agent: GPTBot
User-agent: Scrapy
Disallow: /

# Allow the following bots
User-agent: Google-Extended
Allow: /
"""
YAHOO_ROBOTS = """User-agent: GPTBot
Disallow: /

User-agent: *
Disallow: /api
Disallow: /comments/
"""


class FakeResp:
    def __init__(self, status=200, text=""):
        self.status_code, self.text, self.content = status, text, text.encode("utf-8")


class FakeSession:
    def __init__(self, routes):
        self.routes, self.headers, self.calls = routes, {}, []

    def get(self, url, timeout=None):
        self.calls.append(url)
        for key, resp in self.routes.items():
            if url.endswith(key):
                return resp
        return FakeResp(404)


def make_fetcher(routes):
    f = ns.Fetcher(delay=0)
    f.session = FakeSession(routes)
    return f


# ---------------------------------------------------------------- 測試
def test_sitemap_parsing():
    arts = ns.parse_news_sitemap(NEWS_SITEMAP.encode(), "test")
    assert len(arts) == 2, "缺標題的那筆應該被略過"
    assert arts[0].url.endswith("430503") and arts[0].title.startswith("夏季電價")
    assert arts[0].published_at == datetime(2026, 10, 18, 18, 10, 30), arts[0].published_at   # +08:00 -> UTC
    y = ns.parse_news_sitemap(YAHOO_SITEMAP.encode(), "yahoo")
    assert y[0].published_at == datetime(2026, 10, 19, 0, 16, 26)


def test_rss_parsing():
    arts = ns.parse_rss(CNYES_RSS.encode(), "cnyes")
    assert len(arts) == 1
    a = arts[0]
    assert a.url == "https://news.cnyes.com/news/id/6633381"
    assert a.published_at == datetime(2026, 10, 19, 6, 54, 32)
    assert a.summary == "房市買氣冷，台中人口移居潮也出現新變化。", a.summary    # HTML 標籤已移除


def test_extract_body():
    body = ns.extract_body(ARTICLE_HTML.encode("utf-8"))
    assert "夏季電價結束，新纖(1402)" in body and "生產動能可望改善" in body
    for junk in ("廣告", "延伸閱讀", "相關新聞", "版權所有", "首頁", "短句"):
        assert junk not in body, f"不該出現：{junk}"
    assert ns.extract_body(JSONLD_HTML).startswith("這是 JSON-LD 內的完整文章內容。")
    assert ns.extract_body("<html><body><div>沒有段落</div></body></html>") == ""


def test_tickers():
    assert ns.extract_tickers("新纖(1402)、力麗（1444）及台積電(2330)，2026年(2026)展望；ETF(00878)與(123456)") == "1402,1444,2330,00878"
    assert ns.extract_tickers("沒有代號") is None
    assert ns.extract_tickers("(2330)(2330)") == "2330"


def test_robots_gate():
    f = make_fetcher({"/robots.txt": FakeResp(200, BLOCKLIST_ROBOTS)})
    assert f.allowed("https://news.example.com/news/20261019701253-430503")      # 我們不是被點名的 bot
    rp = f._robots_for("https://news.example.com/news/x")
    assert not rp.can_fetch("ClaudeBot", "https://news.example.com/news/x")      # 確認解析器真的有讀到封鎖規則
    assert not rp.can_fetch("Scrapy", "https://news.example.com/news/x")

    f = make_fetcher({"/robots.txt": FakeResp(200, YAHOO_ROBOTS)})
    assert f.allowed("https://tw.stock.yahoo.com/news/abc.html")
    assert not f.allowed("https://tw.stock.yahoo.com/api/v1/x")

    assert make_fetcher({"/robots.txt": FakeResp(404)}).allowed("https://a.example/x")        # 沒有 robots.txt -> 允許
    assert not make_fetcher({"/robots.txt": FakeResp(500)}).allowed("https://a.example/x")    # 5xx -> 保守不抓


def test_yahoo_lists_two_newest_days():
    f = make_fetcher({
        "/robots.txt": FakeResp(404),
        "news-sitemap-index.xml": FakeResp(200, YAHOO_INDEX),
        "news-sitemap-2026-10-19.xml": FakeResp(200, YAHOO_SITEMAP),
        "news-sitemap-2026-10-18.xml": FakeResp(200, YAHOO_SITEMAP.replace("001626079", "999")),
    })
    arts = ns.list_articles("yahoo", f)
    assert len(arts) == 2
    assert not any("2026-10-17" in c for c in f.session.calls), "只該抓最近兩天"


def test_fill_content():
    f = make_fetcher({"/robots.txt": FakeResp(404), "/news/1": FakeResp(200, ARTICLE_HTML),
                      "/news/2": FakeResp(200, "<html><body><p>太短</p></body></html>"), "/news/3": FakeResp(403)})
    ok = ns.Article("test", "https://x.example/news/1", "t", None)
    short = ns.Article("test", "https://x.example/news/2", "t", None)
    denied = ns.Article("test", "https://x.example/news/3", "t", None)
    assert ns.fill_content(f, ok) and "紡纖業者" in ok.content
    assert not ns.fill_content(f, short) and not ns.fill_content(f, denied)


def test_make_row_has_stable_keys():
    a = store.make_row(title="t", content="c", url="u", published_at=None, source="test")
    b = store.make_row(title="t", content="c", url="u", published_at=datetime(2026, 1, 1), source="cnyes",
                       category="大盤總經", category_score=0.9, sentiment="Positive", related_stocks="2330")
    assert set(a) == set(b)      # 批次 INSERT 要求每筆 key 一致


def test_dry_run_pipeline():
    """用假的來源跑完整的 crawl_news 流程（--dry-run --no-classify），確認不需要資料庫與模型。"""
    import crawl_news

    fake = [ns.Article("test", f"https://x.example/n/{i}", f"標題{i}", datetime(2026, 10, 19, 1, i)) for i in range(5)]
    ns.SOURCES["test"] = lambda f: list(fake)
    original_fill = ns.fill_content
    ns.fill_content = lambda f, a: (setattr(a, "content", "內文" * 60 + "(2330)") or True) if a.title != "標題4" else False
    try:
        rc = crawl_news.run(crawl_news.parse_args(["--sources", "test", "--dry-run", "--no-classify", "--limit", "4"]))
    finally:
        ns.fill_content = original_fill
        ns.SOURCES.pop("test", None)
    assert rc == 0



# ---------------------------------------------------------------- 自由時報、中央社（2026-10 依實際格式整理）
LTN_RSS = """<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel><title>自由時報 財經新聞</title>
<item><title><![CDATA[台灣人好會玩！日本「這地方」3成外國客來自台灣]]></title>
<link>https://ec.ltn.com.tw/article/breakingnews/5612705</link>
<pubDate>Wed, 21 Oct 2026 06:35:10 +0800</pubDate>
<description><![CDATA[首次發布 10-20 22:32 更新 10-21 06:35 〔財經頻道／綜合報導〕日本九州大分縣觀光人潮持續升溫…]]></description></item>
</channel></rss>"""

CNA_SITEMAP_XML = ("﻿" + """<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
<url><loc>https://www.cna.com.tw/news/afe/202610210100.aspx</loc><lastmod>2026-10-21T14:00:00+08:00</lastmod><news:news><news:publication><news:name>中央社即時新聞</news:name><news:language>zh-tw</news:language></news:publication><news:publication_date>2026-10-21T14:00:00+08:00</news:publication_date><news:title>台股收盤</news:title><news:keywords>台股,加權指數</news:keywords></news:news></url>
<url><loc>https://www.cna.com.tw/news/aipl/202610210131.aspx</loc><news:news><news:publication><news:name>中央社即時新聞</news:name><news:language>zh-tw</news:language></news:publication><news:publication_date>2026-10-21T13:00:00+08:00</news:publication_date><news:title>政治新聞</news:title></news:news></url>
<url><loc>https://www.cna.com.tw/newsworld/article/20261021n003/</loc><news:news><news:publication><news:name>中央社即時新聞</news:name><news:language>zh-tw</news:language></news:publication><news:publication_date>2026-10-21T14:20:09+08:00</news:publication_date><news:title>印尼看電影</news:title></news:news></url>
</urlset>""")

LTN_ARTICLE_HTML = """<html><head><meta charset="utf-8"></head><body>
<div class="photo"><p>（示意圖，歐新社）日本九州大分縣的外國旅客持續增加，成為近期話題。</p></div>
<div class="text">
<p>〔財經頻道／綜合報導〕台灣人喜歡到日本旅遊！日本九州大分縣觀光人潮持續升溫，受到台灣及南韓觀光客帶動，當地9月住宿人數突破43萬人。</p>
<p>請繼續往下閱讀...</p>
<p>一手掌握經濟脈動 [點我訂閱自由財經Youtube頻道]</p>
<p>據日媒報導，大分縣9月外國旅客住宿人數創下歷史新高，其中台灣旅客占比最高，約三成，連續一年維持高點。</p>
<p>不用抽 不用搶 現在用APP看新聞 保證天天中獎 [點我下載APP]</p>
<p>業者表示，匯率與航班增加是主要原因，預期年底前旺季仍將延續，帶動周邊商圈買氣。</p>
</div></body></html>"""


def test_ltn_rss():
    arts = ns.parse_rss(LTN_RSS.encode(), "ltn")
    assert len(arts) == 1 and arts[0].source == "ltn"
    assert arts[0].url == "https://ec.ltn.com.tw/article/breakingnews/5612705"
    assert arts[0].published_at == datetime(2026, 10, 20, 22, 35, 10)     # 06:35 +08:00 -> 前一天 22:35 UTC


def test_cna_keeps_only_finance_section():
    f = make_fetcher({"/robots.txt": FakeResp(404), "GoogleNewsSitemap_fromRemote_cfp.xml": FakeResp(200, CNA_SITEMAP_XML)})
    arts = ns.list_articles("cna", f)       # 含 UTF-8 BOM 也要能解析
    assert [a.title for a in arts] == ["台股收盤"], [a.title for a in arts]
    assert arts[0].source == "cna"
    assert arts[0].published_at == datetime(2026, 10, 21, 6, 0, 0)


def test_ltn_body_cleaning():
    art = ns.Article("ltn", "https://ec.ltn.com.tw/article/breakingnews/1", "t", None)
    f = make_fetcher({"/robots.txt": FakeResp(404), "/breakingnews/1": FakeResp(200, LTN_ARTICLE_HTML)})
    assert ns.fill_content(f, art)
    c = art.content
    assert c.startswith("台灣人喜歡到日本旅遊"), c[:30]                    # 電頭已移除
    for junk in ("請繼續往下閱讀", "一手掌握", "不用抽", "示意圖", "〔財經頻道"):
        assert junk not in c, f"不該出現：{junk}"
    assert "大分縣9月外國旅客住宿人數" in c and "旺季仍將延續" in c


def test_403_circuit_breaker():
    f = make_fetcher({"/robots.txt": FakeResp(404), "/news/a": FakeResp(403), "/news/b": FakeResp(403),
                      "/news/c": FakeResp(403), "/news/d": FakeResp(200, "<html></html>")})
    for name in "abc":
        assert f.get(f"https://blocked.example/news/{name}") is None
    assert "blocked.example" in f.blocked_hosts
    calls_before = len(f.session.calls)
    assert f.get("https://blocked.example/news/d") is None                 # 判定被擋後不再發請求
    assert len(f.session.calls) == calls_before


def test_ctee_removed():
    assert "ctee" not in ns.SOURCES and not hasattr(ns, "list_ctee")
    assert set(ns.SOURCES) == {"cnyes", "yahoo", "ltn", "cna"}
    import crawl_news
    assert crawl_news.parse_args([]).sources == list(ns.SOURCES)


if __name__ == "__main__":
    tests = [v for k, v in sorted(globals().items()) if k.startswith("test_")]
    for t in tests:
        t()
        print("PASS", t.__name__)
    print(f"\n{len(tests)} 項測試全部通過")
