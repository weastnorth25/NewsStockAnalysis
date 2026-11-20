// 使用者偏好設定：存在瀏覽器 localStorage（settings），設定頁修改後，用到的頁面會馬上跟著更新
// 顯示名稱沿用登入時存的 localStorage.displayName（後端還沒有修改名稱的 API，只改這台電腦上的顯示）
import { useSyncExternalStore } from 'react'

export const DEFAULTS = {
  defaultMode: null,          // 'beginner' | 'pro' | null（null＝沿用上次離開時的模式）
  landingPage: '/dashboard',  // 登入後、打開網站先進哪一頁
  defaultRange: '3M',         // 個股頁、國際同業對比的預設區間
  chipsDays: 20,              // 法人籌碼預設天數
}

const KEY = 'settings'
const listeners = new Set()
let cache = null

function load() {
  if (cache) return cache
  try { cache = { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY)) } } catch { cache = { ...DEFAULTS } }
  return cache
}

export const getSetting = (key) => load()[key]

export function setSetting(key, value) {
  cache = { ...load(), [key]: value }
  try { localStorage.setItem(KEY, JSON.stringify(cache)) } catch { /* 存不了就只在這次有效 */ }
  listeners.forEach((fn) => fn())
}

const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn) }

// 用法：const [range, setRange] = useSetting('defaultRange')
export function useSetting(key) {
  const value = useSyncExternalStore(subscribe, () => load()[key])
  return [value, (v) => setSetting(key, v)]
}

// ─── 顯示名稱（Topbar 和設定頁共用，改了馬上更新）────────────────────
export function setDisplayName(name) {
  try { localStorage.setItem('displayName', name) } catch { /* 同上 */ }
  listeners.forEach((fn) => fn())
}
const readName = () => { try { return localStorage.getItem('displayName') || '' } catch { return '' } }
export const useDisplayName = () => useSyncExternalStore(subscribe, readName)

// ─── 自訂國際同業（usePeerSelection 存在 peers:代號）────────────────────
const PEER_PREFIX = 'peers:'
export function customPeerSymbols() {
  try { return Object.keys(localStorage).filter((k) => k.startsWith(PEER_PREFIX)).map((k) => k.slice(PEER_PREFIX.length)) } catch { return [] }
}
export function resetCustomPeers() {
  customPeerSymbols().forEach((s) => { try { localStorage.removeItem(PEER_PREFIX + s) } catch { /* 同上 */ } })
  listeners.forEach((fn) => fn())
}
