// 產生 src/data/twStocks.js：全部上市、上櫃股票（含 ETF）的代號與中文名稱
// 資料來源：證交所 OpenAPI「上市個股日成交資訊」、櫃買中心 OpenAPI「上櫃股票收盤行情」
// 用法（在 frontend 資料夾）：node scripts/build-stock-list.mjs
// 有新股票上市櫃時重跑一次即可；只保留 4 碼普通股與 00 開頭的 ETF，排除權證等
import { writeFileSync } from 'node:fs'

const TWSE = 'https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL'
const TPEX = 'https://www.tpex.org.tw/openapi/v1/tpex_mainboard_daily_close_quotes'
const keep = (code) => /^(\d{4}|00\d{2,4}[A-Z]?)$/.test(code)

const get = async (url) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url} → ${res.status}`)
  return res.json()
}

const toMap = (rows, codeKey, nameKey) =>
  Object.fromEntries(rows.filter((r) => keep(r[codeKey]?.trim())).map((r) => [r[codeKey].trim(), r[nameKey].trim()]).sort())

const listed = toMap(await get(TWSE), 'Code', 'Name')
const otc = toMap(await get(TPEX), 'SecuritiesCompanyCode', 'CompanyName')
const today = new Date().toISOString().slice(0, 10)

const body = `// 自動產生，請勿手動修改：node scripts/build-stock-list.mjs（${today}）
// 全部上市（LISTED）、上櫃（OTC）股票與 ETF 的代號 → 中文名稱；上櫃股的 yfinance 代號要加 .TWO
export const LISTED = ${JSON.stringify(listed)}

export const OTC = ${JSON.stringify(otc)}
`
writeFileSync(new URL('../src/data/twStocks.js', import.meta.url), body)
console.log(`上市 ${Object.keys(listed).length} 支、上櫃 ${Object.keys(otc).length} 支 → src/data/twStocks.js`)
