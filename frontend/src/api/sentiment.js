// 新聞情緒走勢 API：後端 /api/sentiment/trend 還沒做（404）時改用示意資料
// 回傳 { data: [{ date: 'M/D', score: 0～100, count: 當天新聞數 }], isMock }
import api from './stock'
import { tryReal } from './stockData'
import { mockSentimentTrend } from '../data/homeMock'

// 後端給 '2026-11-10'，轉成跟指數走勢一樣的 '11/10'，兩條線才能用日期對齊
const toMD = (iso) => {
  const [, m, d] = iso.split('-')
  return `${Number(m)}/${Number(d)}`
}

export const fetchSentimentTrend = async (days) => {
  const res = await tryReal(
    'sentiment-trend',
    () => api.get('/api/sentiment/trend', { params: { days } }),
    () => mockSentimentTrend(days),
  )
  return res.isMock ? res : { ...res, data: res.data.map((r) => ({ ...r, date: toMD(r.date) })) }
}
