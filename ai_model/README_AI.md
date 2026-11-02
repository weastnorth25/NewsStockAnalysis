# AI 端

每個功能一個資料夾,執行方式寫在各自的 README。

| 資料夾 | 功能 | 狀態 |
|---|---|---|
| [`volatility/`](volatility/README.md) | 波動預測:未來 3 個交易日的波動,會不會比最近 3 個交易日更大 | 可使用 |
| `sentiment/` | 新聞情緒判讀 | 待上傳 |

## 新增功能時

- 開新資料夾,裡面放程式、`requirements.txt`、`README.md`,不要把檔案直接放在 `ai_model/` 底下。
- GitHub 單一檔案上限 100 MB。模型權重、大型資料集不要放進 repo,改放雲端硬碟或 Hugging Face,並在 README 寫下載方式。
