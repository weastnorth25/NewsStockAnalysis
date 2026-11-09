import os
import json
import requests

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
MODEL_NAME = os.getenv("OLLAMA_MODEL", "qwen2.5:7b")
TIMEOUT_SEC = 60
PROMPT_VERSION = "v3"

PROMPT_TEMPLATE = (
    "你是財經資料摘要助手。只能根據下列資料撰寫繁體中文摘要,最多兩句,"
    "資料不足時一句即可,不要重複已說過的資訊。"
    "資料中的年增率、差距都已由程式算好,請直接使用,不要自己計算任何數字,"
    "不可推測原因,不可預測未來。\n\n"
    "資料:\n{data}"
)

def build_data(payload: dict) -> dict:
    """依 type 把原始數字轉成算好、有語意的欄位。衍生數字一律在這裡用程式算。"""
    t = payload["type"]
    d = payload["data"]

    if t == "monthly_revenue":
        cur, prev = d["current"], d["year_ago"]
        yoy = (cur / prev - 1) * 100
        return {
            "指標": "月營收",
            "期間": d["period"],
            "本期數值": f"{cur:,.0f} 億元",
            "去年同期數值": f"{prev:,.0f} 億元",
            "年增率": f"{yoy:+.1f}%",
        }

    if t == "macro_event":
        cur, prev = d["current"], d["previous"]
        diff = cur - prev
        direction = "上升" if diff > 0 else "下降" if diff < 0 else "持平"
        return {
            "指標": d["name"],
            "期間": d["period"],
            "本期數值": f"{cur}{d['unit']}",
            "前值": f"{prev}{d['unit']}",
            "與前值差距": f"{direction} {abs(diff):.1f} 個百分點",
        }

    raise ValueError(f"unknown type: {t}")
#摘要
def summarize(payload: dict) -> dict:
    """成功回傳 ok=True 與摘要;失敗回傳 ok=False 與錯誤原因,不讓程式崩潰。"""
    base = {
        "model_name": MODEL_NAME,
        "prompt_version": PROMPT_VERSION,
        "input_snapshot": payload,
    }
    try:
        data_text=json.dumps(build_data(payload), ensure_ascii=False)
        prompt = PROMPT_TEMPLATE.format(data=data_text)

        resp = requests.post(
            f"{OLLAMA_URL}/api/generate",
            json={"model": MODEL_NAME, "prompt": prompt, "stream": False},
            timeout=TIMEOUT_SEC,
        )
        resp.raise_for_status()
        text = resp.json()["response"].strip()
        if not text:
            return {**base, "ok": False, "error": "empty_response"}
        return {**base, "ok": True, "summary_text": text}
    except requests.exceptions.Timeout:
        return {**base, "ok": False, "error": "timeout"}
    except requests.exceptions.ConnectionError:
        return {**base, "ok": False, "error": "ollama_unreachable"}
    except Exception as e:
        return {**base, "ok": False, "error": f"unexpected: {e}"}


if __name__ == "__main__":
    test_payload = {
    "scope": "market",
    "type": "monthly_revenue",
    "data": {"period": "2026年9月", "current": 2850, "year_ago": 2500},
    }
    
    result = summarize(test_payload)
    print(json.dumps(result, ensure_ascii=False, indent=2))