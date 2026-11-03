// 首頁：專業模式顯示 Power BI 式卡片網格（ProHome），新手模式顯示白話重點版（BeginnerHome）
// 指數報價在這一層依序載入一次，兩種模式共用，切換模式不會重新抓
import { useMode } from '../context/mode'
import useIndexQuotes from '../hooks/useIndexQuotes'
import { weightedScore } from '../utils/market'
import ProHome from '../components/home/ProHome'
import BeginnerHome from '../components/home/BeginnerHome'

// 兩種模式用到的所有報價（市場強弱需要 ^TWII、^GSPC、^IXIC）
const TICKERS = ['^TWII', '^GSPC', '^IXIC', '^SOX', 'TWD=X']

export default function Dashboard() {
  const { isPro } = useMode()
  const quotes = useIndexQuotes(TICKERS)
  const score = weightedScore(quotes)

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold text-gray-900">{isPro ? '市場總覽' : '今天市場怎麼樣？'}</h1>
      {isPro ? <ProHome quotes={quotes} score={score} /> : <BeginnerHome quotes={quotes} score={score} />}
    </div>
  )
}
