"""找出被擋下的 AI 重點,重新產生並標出原文沒有的數字(做簡報舉例用,不寫資料庫)。"""
from database import SessionLocal
import models
from summarize_news import ask, _numbers, MAX_CHARS

db = SessionLocal()
rows = (db.query(models.News.id, models.News.title, models.News.content, models.News.url)
          .filter(models.News.ai_summary_model.like("rejected%")).all())
db.close()
print(f"被擋下的新聞共 {len(rows)} 篇\n")

for news_id, title, content, url in rows:
    content = (content or "").replace("\n", " ").strip()[:MAX_CHARS]
    source_nums = _numbers(title + " " + content)
    print(f"=== id={news_id} {title}\n    {url}")
    for i in range(3):                                   # 模型每次輸出不同,多試幾次比較容易抓到錯的
        points = ask(title, content)
        bad = _numbers(" ".join(points)) - source_nums
        mark = f"  ← 原文沒有:{', '.join(sorted(bad))}" if bad else "  (這次數字都對)"
        print(f"  第 {i + 1} 次{mark}")
        for p in points:
            print(f"    - {p}")
    print()