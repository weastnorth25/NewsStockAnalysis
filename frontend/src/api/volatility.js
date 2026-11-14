// 波動預測：AI 組的模型，預測未來幾個交易日波動放大或縮小（不是漲跌）
// 照 AI 組 README：不用示意資料頂替（預測是機率判斷，假數字會被當真），沒有資料就顯示「暫無預測」
// 回傳 { kind, data?, message? }
//   kind: 'ok'       正常預測（data 是後端回傳的整包）
//         'illiquid' 成交量太少，HTTP 200 但 status = illiquid，顯示 message
//         'new'      新上市不到 65 個交易日，後端回 422
//         'none'     其他錯誤或抓不到
import api, { toFullTicker } from './stock'

// 台股代號要帶後綴：上市 .TW、上櫃 .TWO；已經知道是上櫃（toFullTicker 記得）就直接用，否則先試上市再試上櫃
// （用錯後綴時後端回 500，不是 404，所以只要不是 422 就換下一個試）
function candidates(symbol) {
  const full = toFullTicker(symbol)
  return full.endsWith('.TW') ? [full, `${full}O`] : [full]
}

export async function fetchVolatility(symbol) {
  for (const ticker of candidates(symbol)) {
    try {
      const res = await api.get(`/api/stock/${ticker}/volatility`)
      if (res.data.status === 'illiquid') return { kind: 'illiquid', message: res.data.message }
      if (res.data.status === 'ok') return { kind: 'ok', data: res.data }
      return { kind: 'none' }
    } catch (err) {
      if (err.response?.status === 422) return { kind: 'new', message: err.response.data?.detail }
    }
  }
  return { kind: 'none' }
}
