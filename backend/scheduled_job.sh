#!/bin/bash
# 每日資料更新：爬新聞 → 標情緒 → 月營收（有新資料時順便產生 AI 摘要）
set -u
cd "$(dirname "$0")"
source venv/bin/activate

mkdir -p logs
LOG="logs/job_$(date +%Y%m%d_%H%M).log"

{
  echo "=== $(date '+%F %T') 開始 ==="
  python crawl_news.py                    || echo "!! 爬新聞失敗"
  python tag_news_sentiment.py --apply    || echo "!! 標情緒失敗"
  python run_daily.py                     || echo "!! 月營收失敗"
  echo "=== $(date '+%F %T') 結束 ==="
} 2>&1 | tee -a "$LOG"
