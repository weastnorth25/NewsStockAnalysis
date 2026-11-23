// 目前查看的股票：先看網址 ?ticker=，沒有就用上次看的那支（存在瀏覽器）
// 股票頁和四個分析工具頁共用：在「國際同業對比」選了國巨，從側邊欄切到「法人籌碼」也會顯示國巨
import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { mockStockList } from '../data/mockData'

const KEY = 'currentTicker'
const DEFAULT = mockStockList[0].symbol

export default function useTicker() {
  const [searchParams] = useSearchParams()
  const fromUrl = searchParams.get('ticker')

  useEffect(() => {
    if (fromUrl) try { localStorage.setItem(KEY, fromUrl) } catch { /* 存不了就只在這頁有效 */ }
  }, [fromUrl])

  if (fromUrl) return fromUrl
  try { return localStorage.getItem(KEY) || DEFAULT } catch { return DEFAULT }
}
