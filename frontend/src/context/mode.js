// 新手／專業模式的 Context 與讀取用 hook（Provider 在 ModeProvider.jsx）
import { createContext, useContext } from 'react'

export const ModeContext = createContext(null)

// 用法：const { mode, isPro, toggleMode } = useMode()
export function useMode() {
  return useContext(ModeContext)
}
