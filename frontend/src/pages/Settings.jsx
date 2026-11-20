// 設定頁面：帳號、顯示偏好、個股與分析、關於；變更會自動儲存在瀏覽器（utils/settings.js）
// 後端還沒有修改名稱／密碼的 API：顯示名稱只改這台電腦上的顯示，修改密碼先不提供
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMode } from '../context/mode'
import useAsync from '../hooks/useAsync'
import { fetchCurrentUser } from '../api/stock'
import { getStockName } from '../data/stockNames'
import { useSetting, useDisplayName, setDisplayName, customPeerSymbols, resetCustomPeers } from '../utils/settings'

const SECTIONS = [['account', '帳號'], ['display', '顯示偏好'], ['analysis', '個股與分析'], ['about', '關於']]

function Section({ id, title, children }) {
  return (
    <section id={id} className="bg-white rounded-xl border border-gray-200 px-6 py-5 flex flex-col scroll-mt-20">
      <h2 className="text-base font-bold text-gray-900 mb-2">{title}</h2>
      {children}
    </section>
  )
}

function Row({ name, desc, htmlFor, children }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-3.5 border-t border-gray-100 first-of-type:border-t-0">
      <div className="min-w-0">
        {htmlFor ? <label htmlFor={htmlFor} className="text-sm font-medium text-gray-900">{name}</label> : <p className="text-sm font-medium text-gray-900">{name}</p>}
        {desc && <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{desc}</p>}
      </div>
      {children}
    </div>
  )
}

// 分段按鈕：options = [[值, 文字], ...]
function Seg({ label, value, options, onChange }) {
  return (
    <div role="group" aria-label={label} className="flex gap-0.5 bg-gray-100 rounded-lg p-0.5">
      {options.map(([v, text]) => (
        <button key={String(v)} type="button" onClick={() => onChange(v)} aria-pressed={value === v}
          className={`px-3.5 py-1.5 rounded-md text-[13px] min-h-8 ${value === v ? 'bg-white text-blue-600 shadow-sm font-medium' : 'text-gray-600'}`}>
          {text}
        </button>
      ))}
    </div>
  )
}

function AccountSection() {
  const navigate = useNavigate()
  const isGuest = localStorage.getItem('token') === 'guest'
  const savedName = useDisplayName()
  const [name, setName] = useState(savedName)
  const me = useAsync(isGuest ? null : 'me', fetchCurrentUser)

  const saveName = () => {
    const v = name.trim()
    if (v && v !== savedName) setDisplayName(v)
    else setName(savedName)
  }
  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('displayName')
    navigate('/login')
  }

  if (isGuest) {
    return (
      <Section id="account" title="帳號">
        <Row name="遊客模式" desc="登入後可以使用自選股，並設定自己的顯示名稱">
          <button type="button" onClick={() => navigate('/login')} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm min-h-9">登入／註冊</button>
        </Row>
      </Section>
    )
  }

  return (
    <Section id="account" title="帳號">
      <Row name="顯示名稱" desc="右上角會顯示這個名字（只改這台電腦上的顯示）" htmlFor="set-name">
        <input id="set-name" value={name} onChange={(e) => setName(e.target.value)} onBlur={saveName}
          onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
          className="w-60 max-w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-blue-400" />
      </Row>
      <Row name="Email" desc="登入用的帳號，不能修改">
        <span className="text-sm text-gray-700">{me.data?.email ?? (me.loading ? '載入中…' : '--')}</span>
      </Row>
      <Row name="登出" desc="登出後回到登入頁">
        <button type="button" onClick={logout} className="px-4 py-2 rounded-lg border border-red-200 text-red-700 text-sm min-h-9 hover:bg-red-50">登出</button>
      </Row>
    </Section>
  )
}

function DisplaySection() {
  const { mode, setMode } = useMode()
  const [defaultMode, setDefaultMode] = useSetting('defaultMode')
  const [landing, setLanding] = useSetting('landingPage')

  // 選了預設模式就順便切過去，馬上看得到效果
  const chooseMode = (m) => {
    setDefaultMode(m)
    if (m && m !== mode) setMode(m)
  }

  return (
    <Section id="display" title="顯示偏好">
      <Row name="預設模式" desc="每次打開網站先用哪個模式，右上角仍可隨時切換">
        <Seg label="預設模式" value={defaultMode} onChange={chooseMode}
          options={[[null, '上次的模式'], ['beginner', '新手'], ['pro', '專業']]} />
      </Row>
      <Row name="打開網站先看" desc="登入後、打開網站時直接進入的頁面" htmlFor="set-landing">
        <select id="set-landing" value={landing} onChange={(e) => setLanding(e.target.value)}
          className="w-48 px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white">
          <option value="/dashboard">首頁（市場總覽）</option>
          <option value="/stocks">股票</option>
          <option value="/favourites">自選</option>
          <option value="/news">新聞</option>
        </select>
      </Row>
    </Section>
  )
}

function AnalysisSection() {
  const [range, setRange] = useSetting('defaultRange')
  const [days, setDays] = useSetting('chipsDays')
  // 自訂同業是直接讀 localStorage，按下恢復後用 version 觸發重新讀取
  const [, setVersion] = useState(0)
  const custom = customPeerSymbols()

  return (
    <Section id="analysis" title="個股與分析">
      <Row name="股價走勢預設區間" desc="個股頁、國際同業對比一打開時的時間範圍">
        <Seg label="預設區間" value={range} onChange={setRange} options={[['1M', '1M'], ['3M', '3M'], ['6M', '6M'], ['1Y', '1Y']]} />
      </Row>
      <Row name="法人籌碼預設天數">
        <Seg label="法人籌碼預設天數" value={days} onChange={setDays} options={[[5, '5 日'], [20, '20 日'], [60, '60 日']]} />
      </Row>
      <Row name="國際同業比較對象"
        desc={custom.length
          ? `你自訂過 ${custom.length} 支股票的比較對象（${custom.slice(0, 4).map((c) => getStockName(c) || c).join('、')}${custom.length > 4 ? '…' : ''}）`
          : '目前都使用產業預設的比較對象'}>
        <button type="button" disabled={!custom.length} onClick={() => { resetCustomPeers(); setVersion((v) => v + 1) }}
          className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 min-h-9 disabled:text-gray-400 disabled:border-gray-200">
          全部恢復產業預設
        </button>
      </Row>
    </Section>
  )
}

function AboutSection() {
  return (
    <Section id="about" title="關於">
      <Row name="資料來源" desc="股價：Yahoo Finance・財報、法人籌碼：FinMind・月營收、全市場法人與漲跌：證交所・新聞：自由時報、鉅亨網、Yahoo 股市、中央社・總經：各國官方公布" />
      <Row name="AI 模型" desc="新聞情緒分析：微調的 FinBERT・波動預測：邏輯迴歸模型（歷史準確率約 71%）・營收摘要：qwen2.5" />
      <Row name="免責聲明" desc="本網站為學術專題，所有資料與分析僅供參考，不構成投資建議。" />
    </Section>
  )
}

export default function Settings() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline gap-3">
        <h1 className="text-2xl font-semibold text-gray-900">設定</h1>
        <span className="text-xs text-gray-500">變更會自動儲存</span>
      </div>
      <div className="flex flex-wrap gap-6 items-start">
        <nav aria-label="設定分類" className="hidden md:block w-40 shrink-0 sticky top-20">
          {SECTIONS.map(([id, label]) => (
            <a key={id} href={`#${id}`} className="block px-3 py-2 rounded-md text-sm text-gray-600 hover:bg-white hover:text-gray-900">{label}</a>
          ))}
        </nav>
        <div className="flex-1 min-w-0 max-w-3xl flex flex-col gap-4">
          <AccountSection />
          <DisplaySection />
          <AnalysisSection />
          <AboutSection />
        </div>
      </div>
    </div>
  )
}
