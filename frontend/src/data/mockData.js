// 假資料暫存區：新聞、股票列表、K 線歷史資料（等後端各支 API 完成後逐步替換）

function generateHistory(basePrice, days) {
  const data = []
  let price = basePrice
  const now = new Date()
  for (let i = days; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)
    price = price * (1 + (Math.random() - 0.48) * 0.025)
    data.push({
      date: date.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' }),
      price: Math.round(price * 10) / 10,
    })
  }
  return data
}

export const mockNews = [
  {
    id: 1,
    title: '台積電法說會釋利多，外資大舉買超',
    summary: '台積電昨日舉行法人說明會，宣布下季營收展望優於預期，外資連續三日買超逾萬張，市場信心大振。',
    content: `法說會重點 台積電執行長魏哲家於法人說明會中表示，受惠於 AI 晶片需求持續旺盛，公司預計下一季營收將達 220 至 230 億美元，優於市場預期的 215 億美元。先進製程（3 奈米及 2 奈米）需求滿載，訂單能見度達 18 個月以上。\n\n外資動向 受法說會利多帶動，外資連續三日淨買超台積電，累計買超金額達新台幣 320 億元，持股比例提升至 77.3%。\n\n後市展望 多數分析師維持「強烈買進」評等，目標價上調至 1,200 元，顯示市場對台積電長線前景仍具高度信心。`,
    source: '工商時報',
    date: '2026年5月25日',
    reporter: '張大明',
    location: '台北',
    relatedStocks: ['2330', '2454'],
    sentiment: 0.85,
  },
  {
    id: 2,
    title: 'Fed 維持利率不變，科技股全面反彈',
    summary: '美聯儲宣布維持基準利率於 4.25% 至 4.5% 區間，科技股應聲大漲，那斯達克指數單日漲幅逾 2%。',
    content: `美聯儲主席鮑威爾表示，目前通膨數據已逐步向 2% 目標靠近，但仍需更多數據確認趨勢穩固才會降息。市場對年底前降息一碼的預期升至 65%。\n\n科技股受利率預期改善提振，輝達、蘋果、微軟等權值股全面走揚，費城半導體指數單日大漲 3.2%。\n\n台股連動 台股電子股同步受惠，IC 設計、伺服器族群全面拉升，外資回補動作積極。`,
    source: '經濟日報',
    date: '2026年5月24日',
    reporter: '林美玲',
    location: '紐約',
    relatedStocks: ['00631L'],
    sentiment: 0.78,
  },
  {
    id: 3,
    title: '鴻海電動車布局加速，與納智捷簽訂長約',
    summary: '鴻海精密宣布與裕隆旗下納智捷簽訂五年長期合約，確立代工電動車生產合作關係，法人看好雙方協同效益。',
    content: `鴻海與納智捷合作案正式落地，雙方簽訂五年合約，預計 2027 年起年產能可達 5 萬輛電動車。\n\n鴻海董事長劉揚偉表示，電動車業務將成為鴻海第二成長曲線，目標 2030 年達到電動車市佔率 5%。\n\n相關供應鏈 和大、貿聯等零組件廠商同步受惠，股價應聲走揚。`,
    source: '自由時報',
    date: '2026年5月23日',
    reporter: '王小華',
    location: '台北',
    relatedStocks: ['2317', '2204'],
    sentiment: 0.72,
  },
  {
    id: 4,
    title: '央行升息半碼，新台幣匯率走升',
    summary: '中央銀行宣布升息半碼，調升重貼現率至 2.125%，為近年首度升息，市場預期此舉將帶動新台幣兌美元走強。',
    content: `央行升息主因在於通膨壓力未消、薪資成長加速。此次升息半碼（0.125%）為象徵性動作，但市場解讀為央行態度轉鷹。\n\n對股市而言，金融股最為受惠，壽險股則因債券評價損失擴大而承壓。房地產類股短線承壓，但中長期影響有限。`,
    source: '聯合報',
    date: '2026年5月22日',
    reporter: '陳志明',
    location: '台北',
    relatedStocks: ['2882', '2881', '2886'],
    sentiment: 0.45,
  },
  {
    id: 5,
    title: 'AI 伺服器需求爆發，廣達、緯創訂單滿載',
    summary: '受惠於全球 AI 基礎建設投資熱潮，廣達、緯創等台灣伺服器大廠訂單能見度已延伸至明年底，毛利率持續改善。',
    content: `AI 伺服器需求超乎預期，廣達電腦與緯創資通均表示，目前訂單排程已排至 2027 年第一季，產能全開仍供不應求。\n\nGB200 等新型 AI 伺服器毛利率可達傳統伺服器的兩倍以上，有效提升整體獲利品質。分析師上調目標價，建議逢低布局。`,
    source: '數位時代',
    date: '2026年5月21日',
    reporter: '李科技',
    location: '台北',
    relatedStocks: ['2382', '3231'],
    sentiment: 0.88,
  },
  {
    id: 6,
    title: '台股加權指數創歷史新高，站上四萬點',
    summary: '台股加權指數今日盤中突破四萬點關卡，創下歷史新高，成交量放大至 6,000 億元，市場買氣旺盛。',
    content: `在台積電、鴻海等電子權值股帶頭攻堅下，台股加權指數盤中最高觸及 40,689 點，創下歷史新高記錄。\n\n外資連續買超，投信同步護盤，散戶信心大增。分析師指出，短線雖有高檔震盪風險，但中長線多頭趨勢不變，建議持股不追高。`,
    source: '財訊',
    date: '2026年5月20日',
    reporter: '周分析',
    location: '台北',
    relatedStocks: ['0050', '2330'],
    sentiment: 0.91,
  },
]

// 自選股清單（等後端做好再改成 API）
export const mockWatchlist = ['2330', '2317', '2382']

// 股票列表（Stocks 頁面左側）
export const mockStockList = [
  { symbol: '2330', name: '台積電' },
  { symbol: '2317', name: '鴻海' },
  { symbol: '2454', name: '聯發科' },
  { symbol: '2382', name: '廣達' },
  { symbol: '2881', name: '富邦金' },
  { symbol: '2882', name: '國泰金' },
  { symbol: '0050', name: '元大台灣50' },
  { symbol: '3231', name: '緯創' },
]

// 各股票詳細假資料（K 線圖用）
export const mockStockDetail = {
  '2330': { open: 1050, high: 1080, low: 1040, close: 1065, volume: 45823, marketCap: '27.6T', pe: 24.5, dividend: '1.8%', qtrDiv: 4.5, high52w: 1200, low52w: 780, history: generateHistory(1000, 30) },
  '2317': { open: 178, high: 182, low: 176, close: 180, volume: 98234, marketCap: '2.5T', pe: 12.3, dividend: '3.2%', qtrDiv: 1.5, high52w: 225, low52w: 145, history: generateHistory(175, 30) },
  '2454': { open: 1320, high: 1360, low: 1310, close: 1345, volume: 23412, marketCap: '8.9T', pe: 18.7, dividend: '2.1%', qtrDiv: 6.0, high52w: 1500, low52w: 980, history: generateHistory(1300, 30) },
  '2382': { open: 310, high: 325, low: 308, close: 320, volume: 34521, marketCap: '1.3T', pe: 22.1, dividend: '1.5%', qtrDiv: 2.0, high52w: 380, low52w: 210, history: generateHistory(300, 30) },
  '2881': { open: 95, high: 98, low: 94, close: 97, volume: 67890, marketCap: '1.8T', pe: 14.2, dividend: '4.5%', qtrDiv: 1.2, high52w: 110, low52w: 78, history: generateHistory(92, 30) },
  '2882': { open: 72, high: 74, low: 71, close: 73, volume: 54321, marketCap: '1.5T', pe: 13.8, dividend: '4.1%', qtrDiv: 1.0, high52w: 85, low52w: 60, history: generateHistory(70, 30) },
  '0050': { open: 178, high: 181, low: 177, close: 180, volume: 12345, marketCap: '0.5T', pe: 20.1, dividend: '2.8%', qtrDiv: 1.8, high52w: 195, low52w: 148, history: generateHistory(175, 30) },
  '3231': { open: 89, high: 93, low: 88, close: 92, volume: 43210, marketCap: '0.4T', pe: 16.5, dividend: '2.3%', qtrDiv: 0.8, high52w: 115, low52w: 65, history: generateHistory(85, 30) },
}
