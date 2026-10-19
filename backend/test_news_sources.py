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
CTEE_SITEMAP = """<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
<url><loc>https://www.ctee.com.tw/news/20261019701253-430503</loc><news:news><news:publication><news:name>工商時報</news:name><news:language>zh_TW</news:language></news:publication><news:publication_date>2026-10-19T02:10:30+08:00</news:publication_date><news:title>夏季電價結束 紡纖廠成本減壓</news:title></news:news></url>
<url><loc>https://www.ctee.com.tw/news/20261019701248-431207</loc><news:news><news:publication><news:name>工商時報</news:name><news:language>zh_TW</news:language></news:publication><news:publication_date>2026-10-19T02:10:09+08:00</news:publication_date><news:title>水源資本策略投資日商Minimus</news:title></news:news></url>
<url><loc>https://www.ctee.com.tw/news/no-title</loc></url>
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

CTEE_ROBOTS = """# Block the following bots
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
    arts = ns.parse_news_sitemap(CTEE_SITEMAP.encode(), "ctee")
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
    f = make_fetcher({"/robots.txt": FakeResp(200, CTEE_ROBOTS)})
    assert f.allowed("https://www.ctee.com.tw/news/20261019701253-430503")      # 我們不是被點名的 bot
    rp = f._robots_for("https://www.ctee.com.tw/news/x")
    assert not rp.can_fetch("ClaudeBot", "https://www.ctee.com.tw/news/x")      # 確認解析器真的有讀到封鎖規則
    assert not rp.can_fetch("Scrapy", "https://www.ctee.com.tw/news/x")

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
    ok = ns.Article("ctee", "https://x.example/news/1", "t", None)
    short = ns.Article("ctee", "https://x.example/news/2", "t", None)
    denied = ns.Article("ctee", "https://x.example/news/3", "t", None)
    assert ns.fill_content(f, ok) and "紡纖業者" in ok.content
    assert not ns.fill_content(f, short) and not ns.fill_content(f, denied)


def test_make_row_has_stable_keys():
    a = store.make_row(title="t", content="c", url="u", published_at=None, source="ctee")
    b = store.make_row(title="t", content="c", url="u", published_at=datetime(2026, 1, 1), source="cnyes",
                       category="大盤總經", category_score=0.9, sentiment="Positive", related_stocks="2330")
    assert set(a) == set(b)      # 批次 INSERT 要求每筆 key 一致


def test_dry_run_pipeline():
    """用假的來源跑完整的 crawl_news 流程（--dry-run --no-classify），確認不需要資料庫與模型。"""
    import crawl_news

    fake = [ns.Article("ctee", f"https://x.example/n/{i}", f"標題{i}", datetime(2026, 10, 19, 1, i)) for i in range(5)]
    ns.SOURCES["ctee"] = lambda f: list(fake)
    original_fill = ns.fill_content
    ns.fill_content = lambda f, a: (setattr(a, "content", "內文" * 60 + "(2330)") or True) if a.title != "標題4" else False
    try:
        rc = crawl_news.run(crawl_news.parse_args(["--sources", "ctee", "--dry-run", "--no-classify", "--limit", "4"]))
    finally:
        ns.fill_content = original_fill
    assert rc == 0


if __name__ == "__main__":
    tests = [v for k, v in sorted(globals().items()) if k.startswith("test_")]
    for t in tests:
        t()
        print("PASS", t.__name__)
    print(f"\n{len(tests)} 項測試全部通過")
