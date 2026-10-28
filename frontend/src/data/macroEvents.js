// 總經日曆假資料（示意用）：格式即未來後端 /api/macro/events 的回傳格式
// 時間一律存 UTC，畫面顯示時再轉成台灣時間

// 類別：color 是主色，light 是卡片淡色底，tagBg / tagFg 用在標籤
export const MACRO_CATEGORIES = {
  rate: { label: '利率',       color: '#2563eb', light: '#eff6ff', tagBg: '#dbeafe', tagFg: '#1e40af' },
  cpi:  { label: '通膨',       color: '#dc2626', light: '#fef2f2', tagBg: '#fee2e2', tagFg: '#991b1b' },
  job:  { label: '就業',       color: '#ea580c', light: '#fff7ed', tagBg: '#ffedd5', tagFg: '#9a3412' },
  econ: { label: '景氣・成長', color: '#7c3aed', light: '#f5f3ff', tagBg: '#ede9fe', tagFg: '#5b21b6' },
  tw:   { label: '台灣',       color: '#0d9488', light: '#f0fdfa', tagBg: '#ccfbf1', tagFg: '#115e59' },
}

export const IMPORTANCE = {
  high:   { label: '重要性 高', className: 'bg-red-100 text-red-800' },
  medium: { label: '重要性 中', className: 'bg-orange-100 text-orange-800' },
  low:    { label: '重要性 低', className: 'bg-gray-100 text-gray-700' },
}

export const COUNTRIES = { US: '美國', TW: '台灣', JP: '日本' }

// 公布結果：better 優於預期、worse 不如預期、inline 符合預期；FOMC 這類直接寫文字
export const RESULTS = {
  better: { label: '優於預期', className: 'bg-red-100 text-red-800' },
  worse:  { label: '不如預期', className: 'bg-emerald-100 text-emerald-800' },
  inline: { label: '符合預期', className: 'bg-gray-100 text-gray-700' },
}

// 這個數據和股價的關係（問號說明），先依類別共用
export const CATEGORY_RELATION = {
  rate: { text: '利率越高，企業借錢成本越高，股價通常承壓；降息或釋出降息訊號則有利股市。市場反應的往往是和預期的差距及主席談話。', sensitive: '科技、成長股（半導體、AI 概念股）' },
  cpi:  { text: '通膨高於預期，市場擔心延後降息，股價容易下跌；通膨降溫則提高降息機率，有利股市。', sensitive: '科技、成長股與高本益比個股' },
  job:  { text: '就業太強，央行不急著降息；明顯轉弱則引發衰退擔憂。最好的情況是溫和放緩。', sensitive: '金融、消費、景氣循環股' },
  econ: { text: '經濟數據好代表企業獲利有支撐；但太熱可能推升通膨、延後降息，要看市場當下擔心的是衰退還是通膨。', sensitive: '原物料、航運、工業等景氣循環股' },
  tw:   { text: '出口、生產、景氣燈號直接反映台灣企業接單和獲利，數據轉強通常有利台股。', sensitive: '電子、半導體、AI 供應鏈' },
}

export const macroEvents = [
  { id: 'tw-export-2026-09', datetime: '2026-10-13T08:00:00Z', country: 'TW', category: 'tw',   importance: 'medium', name: '9 月出口年增率',       short: '出口',       expected: '+28%',   previous: '+34%',   actual: '+31%',   result: 'better', aiSummary: 'AI 伺服器帶動出口持續高成長。', recentReactions: [] },
  { id: 'us-cpi-2026-09',    datetime: '2026-10-15T12:30:00Z', country: 'US', category: 'cpi',  importance: 'high',   name: '9 月 CPI 年增率',      short: 'CPI',        expected: '2.9%',   previous: '2.9%',   actual: '2.8%',   result: 'better', aiSummary: '通膨略低於預期，市場提高年底降息機率，科技股受惠。',
    recentReactions: [
      { date: '2026-09-11', result: 'inline', change0d: 0.4,  change1d: 0.2 },
      { date: '2026-08-12', result: 'better', change0d: 1.1,  change1d: -0.3 },
      { date: '2026-07-15', result: 'worse',  change0d: -1.3, change1d: 0.5 },
      { date: '2026-06-11', result: 'better', change0d: 0.8,  change1d: 0.1 },
    ] },
  { id: 'us-retail-2026-09', datetime: '2026-10-16T12:30:00Z', country: 'US', category: 'econ', importance: 'medium', name: '零售銷售月增率',       short: '零售銷售',   expected: '+0.3%',  previous: '+0.5%',  actual: '+0.4%',  result: 'better', aiSummary: '消費仍有韌性，經濟軟著陸看法不變。', recentReactions: [] },
  { id: 'us-home-2026-09',   datetime: '2026-10-20T14:00:00Z', country: 'US', category: 'econ', importance: 'medium', name: '成屋銷售',             short: '成屋銷售',   expected: '400 萬', previous: '395 萬', actual: '405 萬', result: 'better', aiSummary: '房市回溫，高利率下需求仍有支撐。', recentReactions: [] },
  { id: 'tw-unemp-2026-09',  datetime: '2026-10-21T08:00:00Z', country: 'TW', category: 'tw',   importance: 'low',    name: '9 月失業率',           short: '失業率',     expected: '3.38%',  previous: '3.40%',  actual: '3.36%',  result: 'better', aiSummary: '就業穩定，對股市影響不大。', recentReactions: [] },
  { id: 'us-claims-1022',    datetime: '2026-10-22T12:30:00Z', country: 'US', category: 'job',  importance: 'medium', name: '初領失業救濟金',       short: '初領失業金', expected: '22.5 萬', previous: '22.8 萬', actual: '23.1 萬', result: 'worse', aiSummary: '略高於預期，就業市場稍微轉弱，降息預期小幅升溫。', recentReactions: [] },
  { id: 'tw-ip-2026-09',     datetime: '2026-10-23T08:00:00Z', country: 'TW', category: 'tw',   importance: 'medium', name: '9 月工業生產年增率',   short: '工業生產',   expected: '+12.0%', previous: '+14.6%', actual: '+13.4%', result: 'better', aiSummary: '電子業出貨優於預期，與 AI 供應鏈營收相關。', recentReactions: [] },
  { id: 'us-durable-2026-09', datetime: '2026-10-23T12:30:00Z', country: 'US', category: 'econ', importance: 'medium', name: '耐久財訂單',          short: '耐久財訂單', expected: '+0.5%',  previous: '-0.3%',  actual: '+0.2%',  result: 'worse',  aiSummary: '企業設備投資回溫幅度不如預期。', recentReactions: [] },
  { id: 'tw-signal-2026-09', datetime: '2026-10-27T08:00:00Z', country: 'TW', category: 'tw',   importance: 'medium', name: '9 月景氣對策信號',     short: '景氣燈號',   expected: null,     previous: '32 分',  actual: '33 分',  result: null,     aiSummary: '連續黃紅燈，台灣景氣偏熱。', recentReactions: [] },
  { id: 'us-conf-2026-10',   datetime: '2026-10-27T14:00:00Z', country: 'US', category: 'econ', importance: 'medium', name: '消費者信心指數',       short: '消費者信心', expected: '99.5',   previous: '98.7',   actual: '100.2',  result: 'better', aiSummary: '消費意願回升，有利零售與消費類股。', recentReactions: [] },
  { id: 'us-fomc-2026-10',   datetime: '2026-10-28T18:00:00Z', country: 'US', category: 'rate', importance: 'high',   name: 'FOMC 利率決議',        short: 'FOMC',       expected: '維持 4.25%', previous: '4.25%', actual: null, result: null, aiSummary: '本月最重要事件。市場預期維持利率，重點在主席對未來降息時程的說法。',
    recentReactions: [
      { date: '2026-09-17', result: '降息 1 碼', change0d: 0.9,  change1d: -0.4 },
      { date: '2026-07-30', result: '維持不變', change0d: -0.3, change1d: 0.2 },
      { date: '2026-06-18', result: '維持不變', change0d: -1.1, change1d: 0.5 },
      { date: '2026-05-07', result: '降息 1 碼', change0d: 1.4,  change1d: 0.6 },
    ] },
  { id: 'us-gdp-2026-q3',    datetime: '2026-10-29T12:30:00Z', country: 'US', category: 'econ', importance: 'high',   name: 'GDP 季增年率（初值）', short: 'GDP',        expected: '2.1%',   previous: '2.4%',   actual: null,     result: null,     aiSummary: '明顯低於預期會加深衰退擔憂。', recentReactions: [] },
  { id: 'jp-boj-2026-10',    datetime: '2026-10-30T03:00:00Z', country: 'JP', category: 'rate', importance: 'medium', name: '日銀利率決議',         short: '日銀',       expected: '0.75%',  previous: '0.5%',   actual: null,     result: null,     aiSummary: '日圓利率變化會影響國際資金流向。', recentReactions: [] },
  { id: 'us-pce-2026-09',    datetime: '2026-10-30T12:30:00Z', country: 'US', category: 'cpi',  importance: 'high',   name: 'PCE 物價年增率',       short: 'PCE',        expected: '2.6%',   previous: '2.7%',   actual: null,     result: null,     aiSummary: '聯準會最重視的通膨指標，降溫有利降息。', recentReactions: [] },
  { id: 'us-ism-2026-10',    datetime: '2026-11-02T14:00:00Z', country: 'US', category: 'econ', importance: 'medium', name: 'ISM 製造業指數',       short: 'ISM',        expected: '49.5',   previous: '49.1',   actual: null,     result: null,     aiSummary: '50 以下代表製造業收縮。', recentReactions: [] },
  { id: 'us-nfp-2026-10',    datetime: '2026-11-06T13:30:00Z', country: 'US', category: 'job',  importance: 'high',   name: '非農就業人數',         short: '非農',       expected: '15.0 萬', previous: '14.2 萬', actual: null,     result: null,     aiSummary: '太強可能延後降息，太弱則引發衰退擔憂。', recentReactions: [] },
]
