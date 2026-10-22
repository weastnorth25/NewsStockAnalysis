"""
股票代號 -> 產業分類 的離線測試（不需要網路、模型、資料庫）。執行：  python backend/test_industry.py
注意：ISIN 網頁的測試資料是依照 2026-10 看到的格式手動整理的，還沒有對真實網頁跑過；
      第一次執行 build_industry_map.py 時，請看它印出的產業對照表是否合理。
"""
import os
import sys
import tempfile
from datetime import datetime
from types import SimpleNamespace

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import industry_lookup as il
import build_industry_map as bm

# 測試用的小型對照表（只是測試資料，不代表完整或最新的證交所分類）
FAKE_MAP = {
    "2330": {"name": "台積電", "industry": "半導體業", "market": "上市"},
    "2303": {"name": "聯電", "industry": "半導體業", "market": "上市"},
    "2327": {"name": "國巨", "industry": "電子零組件業", "market": "上市"},
    "2395": {"name": "研華", "industry": "電腦及週邊設備業", "market": "上市"},
    "2882": {"name": "國泰金", "industry": "金融保險業", "market": "上市"},
    "2603": {"name": "長榮", "industry": "航運業", "market": "上市"},
    "1101": {"name": "台泥", "industry": "水泥工業", "market": "上市"},
    "2412": {"name": "中華電", "industry": "通信網路業", "market": "上市"},
    "1216": {"name": "統一", "industry": "食品工業", "market": "上市"},
    "9999": {"name": "某其他公司", "industry": "其他", "market": "上市"},
}


def use_fake_map():
    il.load_map = lambda: FAKE_MAP


ISIN_HTML = """<html><body><table>
<tr><td>有價證券代號及名稱</td><td>國際證券辨識號碼(ISIN Code)</td><td>上市日</td><td>市場別</td><td>產業別</td><td>CFICode</td><td>備註</td></tr>
<tr><td colspan=7>股票</td></tr>
<tr><td bgcolor=#FAFAD2>1101　台泥</td><td bgcolor=#FAFAD2>TW0001101004</td><td bgcolor=#FAFAD2>1962/02/09</td><td bgcolor=#FAFAD2>上市</td><td bgcolor=#FAFAD2>水泥工業</td><td bgcolor=#FAFAD2>ESVUFR</td><td bgcolor=#FAFAD2></td></tr>
<tr><td>2330　台積電<td>TW0002330008<td>1994/09/05<td>上市<td>半導體業<td>ESVUFR<td></tr>
<tr><td>3008　大立光</td><td>TW0003008009</td><td>2002/03/11</td><td>上市</td><td>光電業</td><td>ESVUFR</td><td></td></tr>
<tr><td>00878　國泰永續高股息</td><td>TW0000087805</td><td>2020/07/20</td><td>上市</td><td></td><td>CEOGEU</td><td></td></tr>
<tr><td>030001　某某購</td><td>TW30000100X3</td><td>2025/01/02</td><td>上市</td><td></td><td>RWSCCE</td><td></td></tr>
<tr><td>2002A　某特別股</td><td>TW0000000000</td><td>2020/01/01</td><td>上市</td><td>鋼鐵工業</td><td>EPNRAR</td><td></td></tr>
</table></body></html>"""


def test_parse_isin_html():
    t = bm.parse_isin_html(ISIN_HTML)
    assert set(t) == {"1101", "2330", "3008"}, set(t)          # ETF、權證、特別股、表頭都被略過
    assert t["1101"] == {"name": "台泥", "industry": "水泥工業", "market": "上市"}
    assert t["2330"]["industry"] == "半導體業"                  # 沒有 </td> 的寫法也能解析


def test_industry_to_category():
    cases = {"半導體業": "科技半導體", "電子零組件業": "科技半導體", "電腦及週邊設備業": "科技半導體", "光電業": "科技半導體",
             "通信網路業": "軟體服務", "資訊服務業": "軟體服務", "金融保險業": "金融保險", "金融保險": "金融保險",
             "航運業": "航運物流", "生技醫療業": "生技醫療", "建材營造業": "營建地產", "貿易百貨業": "民生消費",
             "食品工業": "民生消費", "綠能環保": "再生能源", "水泥工業": "傳統產業", "鋼鐵工業": "傳統產業",
             "其他": None, "其他業": None, "存託憑證": None, "": None, None: None}
    for ind, want in cases.items():
        assert il.industry_to_category(ind) == want, (ind, il.industry_to_category(ind), want)


def test_classify_by_stocks():
    use_fake_map()
    r = il.classify_by_stocks("2330")
    assert r["category"] == "科技半導體" and r["score"] == 0.9 and "台積電" in r["details"]
    assert il.classify_by_stocks("2330,2303,2327")["category"] == "科技半導體"                 # 全部同類
    assert il.classify_by_stocks("2330,2303,2882")["category"] == "科技半導體"                 # 2/3 過半
    assert il.classify_by_stocks("2330,2882") is None                                          # 各佔一半 -> 不下判斷
    assert il.classify_by_stocks("2330,2882,2603,1101") is None                                # 分散 -> 交給 AI
    assert il.classify_by_stocks("0000") is None and il.classify_by_stocks("9999") is None     # 查無 / 產業「其他」
    assert il.classify_by_stocks(None) is None and il.classify_by_stocks("") is None
    assert il.classify_by_stocks(["2882"])["category"] == "金融保險"
    assert il.classify_by_stocks("2330，2303")["category"] == "科技半導體"                      # 全形逗號


def test_missing_map_file_does_not_crash():
    old = il.MAP_PATH
    il.MAP_PATH = "/nonexistent/industry_map.json"
    try:
        import importlib
        fresh = importlib.reload(il)
        assert fresh.classify_by_stocks("2330") is None
    finally:
        il.MAP_PATH = old
        importlib.reload(il)


def test_import_reclassify():
    use_fake_map()
    import pandas as pd
    import import_xlsx_to_db as imp

    df = pd.DataFrame({
        "date": [datetime(2026, 4, 30)] * 3,
        "title_tw": ["甲", "乙", "丙"], "content_tw": ["內文甲", "內文乙", "內文丙"],
        "url": ["https://x/1", "https://x/2", "https://x/3"],
        "stock_id": ["2303", "其他", "2882"],
        "AI_Category": ["未分類", "未分類", "金融保險"], "Confidence_Score": [0.2, 0.15, 0.6],
        "sentiment": ["Positive", "Neutral", "Negative"],
    })
    with tempfile.TemporaryDirectory() as tmp:
        path = os.path.join(tmp, "t.xlsx")
        df.to_excel(path, index=False)
        rows, st = imp.load_rows(path, "ctee", reclassify=False)
        assert st["unclassified"] == 2 and "reclassified" not in st
        rows, st = imp.load_rows(path, "ctee", reclassify=True)
    by = {r["url"]: r for r in rows}
    assert by["https://x/1"]["category"] == "科技半導體" and by["https://x/1"]["category_score"] == 0.9
    assert by["https://x/2"]["category"] == "未分類"                  # 沒有股票代號 -> 維持
    assert by["https://x/3"]["category"] == "金融保險" and by["https://x/3"]["category_score"] == 0.6   # 原本就有分類 -> 不動
    assert st["reclassified"] == 1 and st["unclassified"] == 1


def test_crawl_passes_stock_codes_to_classifier():
    use_fake_map()
    import crawl_news
    import news_sources as ns

    seen = []

    def fake_classify(text, related_stocks=None):
        seen.append(related_stocks)
        return {"category": "科技半導體", "score": 0.9, "details": ""}

    art = ns.Article("test", "https://x.example/n/1", "標題", datetime(2026, 10, 21, 1, 0))
    ns.SOURCES["test"] = lambda f: [art]
    orig = ns.fill_content
    ns.fill_content = lambda f, a: (setattr(a, "content", "聯電（2303）與台積電(2330)今天股價上漲，" * 8) or True)
    try:
        args = crawl_news.parse_args(["--sources", "test", "--dry-run", "--limit", "1"])
        crawl_news.crawl_one("test", ns.Fetcher(delay=0), fake_classify, None, args)
    finally:
        ns.fill_content = orig
        ns.SOURCES.pop("test", None)
    assert seen == ["2303,2330"], seen


def test_ai_service_wiring():
    """ai_service 需要 transformers，這裡只檢查原始碼：有帶參數，且順序是 關鍵字 -> 股票代號 -> 模型。"""
    import ast
    src = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "ai_service.py"), encoding="utf-8").read()
    fn = next(n for n in ast.parse(src).body if isinstance(n, ast.FunctionDef) and n.name == "classify_industry")
    assert [a.arg for a in fn.args.args] == ["news_text", "related_stocks"]
    body = ast.get_source_segment(src, fn)
    assert body.index("market_keywords") < body.index("classify_by_stocks(related_stocks)") < body.index("classifier(news_text")



def test_find_codes_by_name():
    use_fake_map(); il._name_index.cache_clear()
    assert il.find_codes_by_name("聯電法說會報喜", "") == ["2303"]                          # 2 字簡稱出現在標題
    assert il.find_codes_by_name("今日盤勢", "聯電表示將擴產") == []                          # 2 字簡稱只在內文 -> 不算
    assert il.find_codes_by_name("產業動態", "台積電先進製程。台積電擴產。台積電說") == ["2330"]   # 3 字簡稱，內文 3 次
    assert il.find_codes_by_name("產業動態", "台積電提到一次") == []                          # 內文只有一次，證據不足
    assert il.find_codes_by_name("統一發票中獎名單", "") == []                                # 「統一」在排除名單
    assert set(il.find_codes_by_name("台積電與聯電攜手", "")) == {"2330", "2303"}
    assert il.find_codes_by_name("", "") == []

    # 同名多檔 -> 不比對，避免誤判
    il.load_map = lambda: {"1111": {"name": "宏達", "industry": "半導體業"}, "2222": {"name": "宏達", "industry": "航運業"}}
    il._name_index.cache_clear()
    assert il.find_codes_by_name("宏達法說會", "") == []
    use_fake_map(); il._name_index.cache_clear()


def test_codes_for_classification():
    use_fake_map(); il._name_index.cache_clear()
    assert il.codes_for_classification("聯電法說", "", "2330") == "2330"        # 文章有寫代號 -> 用它
    assert il.codes_for_classification("聯電法說", "", None) == "2303"          # 沒寫 -> 用公司名稱找
    assert il.codes_for_classification("今日盤勢", "", None) is None


def test_reclassify_decide():
    use_fake_map(); il._name_index.cache_clear()
    import reclassify_db as rc

    hit, fill = rc.decide("聯電法說會報喜", "內文", None)
    assert hit["category"] == "科技半導體" and fill is None                    # 靠名稱判斷，不補 related_stocks
    hit, fill = rc.decide("法說會報喜", "聯電（2303）今天公布財報", None)
    assert hit["category"] == "科技半導體" and fill == "2303"                  # 內文有代號 -> 順便補上 related_stocks
    hit, fill = rc.decide("某標題", "內文", "2882")
    assert hit["category"] == "金融保險" and fill is None                      # 資料庫已有代號 -> 不重複補
    assert rc.decide("今日盤勢", "沒有任何公司", None) == (None, None)

    seen = []
    def fake_model(text, related_stocks=None):
        seen.append(related_stocks)
        return {"category": "航運物流", "score": 0.4, "details": ""}
    hit, _ = rc.decide("今日盤勢", "沒有任何公司", None, fake_model)
    assert hit["category"] == "航運物流" and seen == [None]                    # 規則沒命中才用模型
    hit, _ = rc.decide("聯電法說會報喜", "內文", None, fake_model)
    assert hit["category"] == "科技半導體" and len(seen) == 1                  # 規則命中就不用跑模型
    assert rc.decide("今日盤勢", "x", None, lambda t, related_stocks=None: {"category": "未分類", "score": 0.1})[0] is None


if __name__ == "__main__":
    tests = [v for k, v in sorted(globals().items()) if k.startswith("test_")]
    for t in tests:
        t()
        print("PASS", t.__name__)
    print(f"\n{len(tests)} 項測試全部通過")
