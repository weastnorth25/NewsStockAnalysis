// 監聽 CSS media query（例如是不是手機寬度），視窗大小改變時自動更新
// 用 useSyncExternalStore 訂閱瀏覽器的 matchMedia，不需要自己在 effect 裡 setState
import { useSyncExternalStore } from 'react'

export default function useMediaQuery(query) {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query)
      mql.addEventListener('change', onChange)
      return () => mql.removeEventListener('change', onChange)
    },
    () => window.matchMedia(query).matches,
  )
}
