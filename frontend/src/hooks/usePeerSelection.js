// 使用者自選的國際同業：依股票分開記在 localStorage（peers:2330），沒有自選過就用產業預設
// 每支股票的選擇放在 { [symbol]: list } 裡，切換股票不需要 effect 重設
import { useState } from 'react'

const MAX_PEERS = 5
const storageKey = (symbol) => `peers:${symbol}`

function loadSaved(symbol) {
  try {
    const raw = localStorage.getItem(storageKey(symbol))
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function save(symbol, list) {
  try {
    localStorage.setItem(storageKey(symbol), JSON.stringify(list))
  } catch {
    // 無痕模式或儲存空間被封鎖：只是不會記住，不影響使用
  }
}

export default function usePeerSelection(symbol, defaults) {
  const [bySymbol, setBySymbol] = useState({})
  const current = bySymbol[symbol] ?? loadSaved(symbol) ?? defaults
  const isCustom = bySymbol[symbol] != null || loadSaved(symbol) != null

  const update = (list) => {
    setBySymbol((prev) => ({ ...prev, [symbol]: list }))
    save(symbol, list)
  }

  return {
    peers: current,
    isCustom,
    canAdd: current.length < MAX_PEERS,
    add: (peer) => {
      if (current.length >= MAX_PEERS || current.some((p) => p.ticker === peer.ticker)) return
      update([...current, peer])
    },
    remove: (ticker) => update(current.filter((p) => p.ticker !== ticker)),
    reset: () => {
      try { localStorage.removeItem(storageKey(symbol)) } catch { /* 同上 */ }
      setBySymbol((prev) => {
        const next = { ...prev }
        delete next[symbol]
        return next
      })
    },
  }
}
