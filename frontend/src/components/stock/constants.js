// 個股 dashboard 共用常數：時間區間選項、同業線條顏色（元件檔只能匯出元件，常數集中放這裡）

export const RANGES_PRO = ['1M', '3M', '6M', '1Y']
export const RANGES_BEGINNER = [['1M', '1 個月'], ['3M', '3 個月'], ['1Y', '1 年']]

// 同業線條樣式：主角藍色粗線、同業實線、基準指數虛線
export const PEER_COLORS = ['#ea580c', '#7c3aed', '#db2777', '#ca8a04', '#0891b2']
export const BENCH_STYLES = [
  { color: '#6b7280', dash: '5 4' },
  { color: '#0d9488', dash: '2 3' },
]

// 財報三率走勢的線條
export const MARGIN_LINES = [
  { key: 'grossMargin', label: '毛利率',     color: '#2563eb' },
  { key: 'opMargin',    label: '營業利益率', color: '#ea580c' },
  { key: 'netMargin',   label: '淨利率',     color: '#0d9488' },
]
