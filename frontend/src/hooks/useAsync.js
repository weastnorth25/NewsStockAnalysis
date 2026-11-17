// 依 key 載入非同步資料：key 改變就重新載入，舊請求的結果會被丟掉
// loading 由「目前結果是不是這個 key 的」推算出來，effect 裡不需要同步 setState（符合 react-hooks lint 規則）
// key 傳 null 代表條件還沒滿足（例如還在等前一支 API），先不載入
//
// 第三個參數 { cache: '名稱' }：先顯示上次存在瀏覽器的資料，背景再抓新的（後端休眠開機要 30～60 秒，不用一直轉圈）
//   有舊資料時回傳 stale: true、savedAt（存的時間），loading 為 false，畫面直接顯示舊資料
//   抓失敗時也繼續顯示舊資料（stale 加上 error）
import { useEffect, useMemo, useState } from 'react'
import { readCache, writeCache } from '../utils/apiCache'

export default function useAsync(key, load, { cache } = {}) {
  const [result, setResult] = useState({ key: null, data: null, error: null })
  const cacheId = cache && key != null ? `${cache}|${key}` : null

  useEffect(() => {
    if (key == null) return
    let cancelled = false
    load()
      .then((data) => {
        if (cancelled) return
        setResult({ key, data, error: null })
        if (cacheId) writeCache(cacheId, data)
      })
      .catch((error) => { if (!cancelled) setResult({ key, data: null, error }) })
    return () => { cancelled = true }
    // load 每次 render 都是新的函式，只依 key 決定要不要重抓
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const fresh = result.key === key
  const ok = fresh && !result.error
  // 還沒拿到這個 key 的新資料（或新資料抓失敗）時，才去讀瀏覽器裡的舊資料
  const cached = useMemo(() => (!ok && cacheId ? readCache(cacheId) : null), [ok, cacheId])

  if (ok) return { data: result.data, error: null, loading: false, stale: false }
  if (cached) return { data: cached.data, error: fresh ? result.error : null, loading: false, stale: true, savedAt: cached.t }
  return {
    data: null,
    error: fresh ? result.error : null,
    loading: key != null && !fresh,
    stale: false,
  }
}
