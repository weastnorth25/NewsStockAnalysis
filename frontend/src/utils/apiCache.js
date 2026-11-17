// 把 API 回來的資料存在瀏覽器（localStorage），下次打開先顯示，背景再更新
// 只存真資料：tryReal 回傳的示意資料（isMock）不存，免得之後被當成真的顯示
// 超過 7 天的舊資料不用；存滿了（瀏覽器約 5MB）就把這些快取清掉重來
const PREFIX = 'apiCache:'
const MAX_AGE = 7 * 24 * 3600 * 1000

export function readCache(id) {
  try {
    const hit = JSON.parse(localStorage.getItem(PREFIX + id))
    if (!hit || Date.now() - hit.t > MAX_AGE) return null
    return hit
  } catch {
    return null
  }
}

function clearAll() {
  try {
    Object.keys(localStorage).filter((k) => k.startsWith(PREFIX)).forEach((k) => localStorage.removeItem(k))
  } catch { /* 讀不到 localStorage 就算了 */ }
}

export function writeCache(id, data) {
  if (data == null || data.isMock) return
  const value = JSON.stringify({ t: Date.now(), data })
  try {
    localStorage.setItem(PREFIX + id, value)
  } catch {
    // 多半是存滿了：清掉舊快取再試一次，還是不行就不存
    clearAll()
    try { localStorage.setItem(PREFIX + id, value) } catch { /* 放棄 */ }
  }
}

// 「11/17 13:30」：顯示舊資料是什麼時候存的
const fmt = new Intl.DateTimeFormat('zh-TW', { timeZone: 'Asia/Taipei', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
export function savedAtLabel(t) {
  const p = Object.fromEntries(fmt.formatToParts(new Date(t)).map((x) => [x.type, x.value]))
  return `${p.month}/${p.day} ${p.hour}:${p.minute}`
}
