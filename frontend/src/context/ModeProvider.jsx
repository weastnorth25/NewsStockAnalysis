// 新手／專業模式的全站狀態，記在 localStorage，重新整理後不會消失
import { useState, useEffect } from 'react'
import { ModeContext } from './mode'

export function ModeProvider({ children }) {
  // 初始值：先讀 localStorage，沒有就預設新手
  const [mode, setMode] = useState(() => localStorage.getItem('mode') || 'beginner')

  // mode 改變時存回 localStorage
  useEffect(() => {
    localStorage.setItem('mode', mode)
  }, [mode])

  const toggleMode = () => setMode(m => (m === 'beginner' ? 'pro' : 'beginner'))

  return (
    <ModeContext value={{ mode, isPro: mode === 'pro', toggleMode }}>
      {children}
    </ModeContext>
  )
}
