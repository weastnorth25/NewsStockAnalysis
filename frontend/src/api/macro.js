// 總經日曆 API：目前回傳假資料，後端 /api/macro/events 完成後只需改這個檔案
import { macroEvents } from '../data/macroEvents'

// 之後改成：const res = await api.get('/api/macro/events', { params: { from, to } }); return res.data
export const fetchMacroEvents = async () => {
  return macroEvents
}
