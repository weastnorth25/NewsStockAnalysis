// 依 key 載入非同步資料：key 改變就重新載入，舊請求的結果會被丟掉
// loading 由「目前結果是不是這個 key 的」推算出來，effect 裡不需要同步 setState（符合 react-hooks lint 規則）
// key 傳 null 代表條件還沒滿足（例如還在等前一支 API），先不載入
import { useEffect, useState } from 'react'

export default function useAsync(key, load) {
  const [result, setResult] = useState({ key: null, data: null, error: null })

  useEffect(() => {
    if (key == null) return
    let cancelled = false
    load()
      .then((data) => { if (!cancelled) setResult({ key, data, error: null }) })
      .catch((error) => { if (!cancelled) setResult({ key, data: null, error }) })
    return () => { cancelled = true }
    // load 每次 render 都是新的函式，只依 key 決定要不要重抓
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const fresh = result.key === key
  return {
    data: fresh ? result.data : null,
    error: fresh ? result.error : null,
    loading: key != null && !fresh,
  }
}
