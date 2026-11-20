// 國際同業名單：每個產業挑幾家國際大廠，大致依市值由大到小排列
// 產業別來自後端 /api/stock 的 sector（證交所產業分類，例如「半導體業」），對照到下面的 key；
// 上櫃股票後端拿不到產業，用 FALLBACK_INDUSTRY 補；使用者也可以在國際同業對比頁自己增減（記在瀏覽器）

export const INDUSTRY_PEERS = {
  'semiconductors': [
    { ticker: 'NVDA',      name: 'NVIDIA' },
    { ticker: 'AVGO',      name: 'Broadcom' },
    { ticker: '005930.KS', name: 'Samsung' },   // yfinance 歸在消費電子，手動放進半導體
    { ticker: 'AMD',       name: 'AMD' },
    { ticker: 'QCOM',      name: 'Qualcomm' },
    { ticker: 'INTC',      name: 'Intel' },
  ],
  'electronic-components': [
    { ticker: 'APH',  name: 'Amphenol' },
    { ticker: 'TEL',  name: 'TE Connectivity' },
    { ticker: 'JBL',  name: 'Jabil' },
    { ticker: 'FLEX', name: 'Flex' },
  ],
  'computer-hardware': [
    { ticker: 'DELL', name: 'Dell' },
    { ticker: 'HPQ',  name: 'HP' },
    { ticker: 'SMCI', name: 'Super Micro' },
  ],
  'insurance-life': [
    { ticker: 'MET', name: 'MetLife' },
    { ticker: 'PRU', name: 'Prudential' },
    { ticker: 'AFL', name: 'Aflac' },
  ],
  'marine-shipping': [
    { ticker: 'MAERSK-B.CO', name: 'Maersk' },
    { ticker: '1919.HK',     name: '中遠海控' },
    { ticker: 'ZIM',         name: 'ZIM' },
  ],
  'cement':        [{ ticker: 'CRH', name: 'CRH' }, { ticker: 'HOLN.SW', name: 'Holcim' }, { ticker: '0914.HK', name: '海螺水泥' }],
  'food':          [{ ticker: 'NESN.SW', name: 'Nestlé' }, { ticker: 'MDLZ', name: 'Mondelez' }, { ticker: '0322.HK', name: '康師傅' }],
  'chemicals':     [{ ticker: 'BAS.DE', name: 'BASF' }, { ticker: 'DOW', name: 'Dow' }, { ticker: 'LYB', name: 'LyondellBasell' }],
  'textiles':      [{ ticker: 'NKE', name: 'Nike' }, { ticker: 'LULU', name: 'Lululemon' }, { ticker: '2313.HK', name: '申洲國際' }],
  'machinery':     [{ ticker: 'SIE.DE', name: 'Siemens' }, { ticker: 'ABBN.SW', name: 'ABB' }, { ticker: 'CAT', name: 'Caterpillar' }],
  'cables':        [{ ticker: 'PRY.MI', name: 'Prysmian' }, { ticker: 'NEX.PA', name: 'Nexans' }, { ticker: 'GLW', name: 'Corning' }],
  'healthcare':    [{ ticker: 'JNJ', name: 'Johnson & Johnson' }, { ticker: 'MDT', name: 'Medtronic' }, { ticker: 'LONN.SW', name: 'Lonza' }],
  'glass':         [{ ticker: 'GLW', name: 'Corning' }, { ticker: 'SGO.PA', name: 'Saint-Gobain' }, { ticker: '5201.T', name: 'AGC' }],
  'paper':         [{ ticker: 'IP', name: 'International Paper' }, { ticker: 'SW', name: 'Smurfit Westrock' }, { ticker: '2689.HK', name: '玖龍紙業' }],
  'steel':         [{ ticker: 'NUE', name: 'Nucor' }, { ticker: 'MT', name: 'ArcelorMittal' }, { ticker: 'PKX', name: 'POSCO' }, { ticker: '5401.T', name: '日本製鐵' }],
  'rubber':        [{ ticker: '5108.T', name: 'Bridgestone' }, { ticker: 'ML.PA', name: 'Michelin' }, { ticker: 'GT', name: 'Goodyear' }],
  'autos':         [{ ticker: 'TM', name: 'Toyota' }, { ticker: 'TSLA', name: 'Tesla' }, { ticker: '1211.HK', name: '比亞迪' }],
  'optoelectronics': [{ ticker: 'GLW', name: 'Corning' }, { ticker: 'LPL', name: 'LG Display' }, { ticker: '2382.HK', name: '舜宇光學' }],
  'telecom':       [{ ticker: 'VZ', name: 'Verizon' }, { ticker: 'T', name: 'AT&T' }, { ticker: 'CSCO', name: 'Cisco' }],
  'distributors':  [{ ticker: 'ARW', name: 'Arrow' }, { ticker: 'AVT', name: 'Avnet' }],
  'it-services':   [{ ticker: 'ACN', name: 'Accenture' }, { ticker: 'IBM', name: 'IBM' }, { ticker: 'INFY', name: 'Infosys' }],
  'construction':  [{ ticker: 'DG.PA', name: 'Vinci' }, { ticker: 'LEN', name: 'Lennar' }, { ticker: 'DHI', name: 'D.R. Horton' }],
  'hospitality':   [{ ticker: 'MAR', name: 'Marriott' }, { ticker: 'HLT', name: 'Hilton' }, { ticker: 'MCD', name: "McDonald's" }],
  'retail':        [{ ticker: 'WMT', name: 'Walmart' }, { ticker: 'COST', name: 'Costco' }, { ticker: '3382.T', name: 'Seven & i' }],
  'energy':        [{ ticker: 'XOM', name: 'Exxon Mobil' }, { ticker: 'SHEL', name: 'Shell' }, { ticker: 'CVX', name: 'Chevron' }],
  'green-energy':  [{ ticker: 'FSLR', name: 'First Solar' }, { ticker: 'VWS.CO', name: 'Vestas' }, { ticker: 'ENPH', name: 'Enphase' }],
  'cloud':         [{ ticker: 'MSFT', name: 'Microsoft' }, { ticker: 'AMZN', name: 'Amazon' }, { ticker: 'GOOGL', name: 'Alphabet' }],
  'sporting-goods': [{ ticker: 'NKE', name: 'Nike' }, { ticker: 'ADS.DE', name: 'Adidas' }, { ticker: '7309.T', name: 'Shimano' }],
  'home':          [{ ticker: 'WHR', name: 'Whirlpool' }, { ticker: 'MAS', name: 'Masco' }],
}

// 證交所產業分類（後端 sector）→ 上面的 key；「其他業」沒有合適的國際同業，只比大盤
export const SECTOR_TO_KEY = {
  '水泥工業': 'cement',          '食品工業': 'food',            '塑膠工業': 'chemicals',
  '紡織纖維': 'textiles',        '電機機械': 'machinery',        '電器電纜': 'cables',
  '化學工業': 'chemicals',        '生技醫療業': 'healthcare',      '化學生技醫療': 'healthcare',
  '玻璃陶瓷': 'glass',           '造紙工業': 'paper',            '鋼鐵工業': 'steel',
  '橡膠工業': 'rubber',          '汽車工業': 'autos',            '半導體業': 'semiconductors',
  '電腦及週邊設備業': 'computer-hardware', '光電業': 'optoelectronics', '通信網路業': 'telecom',
  '電子零組件業': 'electronic-components', '電子通路業': 'distributors', '資訊服務業': 'it-services',
  '其他電子業': 'electronic-components', '建材營造': 'construction',   '航運業': 'marine-shipping',
  '觀光餐旅': 'hospitality',      '觀光事業': 'hospitality',      '金融保險業': 'insurance-life',
  '貿易百貨': 'retail',          '油電燃氣業': 'energy',          '綠能環保': 'green-energy',
  '數位雲端': 'cloud',           '運動休閒': 'sporting-goods',    '居家生活': 'home',
}

// 比較基準：每個產業都放 S&P 500，半導體再加費城半導體
export const INDUSTRY_BENCHMARKS = {
  'semiconductors': [{ ticker: '^SOX', name: '費城半導體' }],
}
export const DEFAULT_BENCHMARKS = [{ ticker: '^GSPC', name: 'S&P 500' }]

// 後端拿不到產業時的備用對照：常用上市股＋常見上櫃股（上櫃股後端 sector 是「未知產業」）
export const FALLBACK_INDUSTRY = {
  '6488': 'semiconductors', '5347': 'semiconductors', '3105': 'semiconductors', '8299': 'semiconductors',
  '5483': 'semiconductors', '3529': 'semiconductors', '6147': 'semiconductors', '3680': 'semiconductors',
  '6274': 'electronic-components', '8069': 'optoelectronics', '4966': 'semiconductors', '3324': 'electronic-components',
  '2330': 'semiconductors',
  '2454': 'semiconductors',
  '2317': 'electronic-components',
  '2382': 'computer-hardware',
  '3231': 'computer-hardware',
  '2881': 'insurance-life',
  '2882': 'insurance-life',
  '2603': 'marine-shipping',
}

export const INDUSTRY_LABELS = {
  'semiconductors':        '半導體',
  'electronic-components': '電子零組件',
  'computer-hardware':     '電腦硬體',
  'insurance-life':        '壽險金控',
  'marine-shipping':       '航運',
  'cement': '水泥', 'food': '食品', 'chemicals': '塑化', 'textiles': '紡織成衣', 'machinery': '電機機械',
  'cables': '電線電纜', 'healthcare': '生技醫療', 'glass': '玻璃陶瓷', 'paper': '造紙', 'steel': '鋼鐵',
  'rubber': '橡膠輪胎', 'autos': '汽車', 'optoelectronics': '光電', 'telecom': '通信網路', 'distributors': '電子通路',
  'it-services': '資訊服務', 'construction': '建材營造', 'hospitality': '觀光餐旅', 'retail': '貿易百貨',
  'energy': '油電燃氣', 'green-energy': '綠能', 'cloud': '數位雲端', 'sporting-goods': '運動休閒', 'home': '居家生活',
}

// 給股票代號（2330）和後端報價（quote），挑出前 n 家同業和基準指數
// 產業判斷順序：後端 industry_key → 後端 sector（證交所產業）→ 備用對照
export function getPeers(symbol, quote, n = 3) {
  const key = quote?.industry_key || SECTOR_TO_KEY[quote?.sector] || FALLBACK_INDUSTRY[symbol]
  const peers = (INDUSTRY_PEERS[key] ?? []).slice(0, n)
  const benchmarks = [...(INDUSTRY_BENCHMARKS[key] ?? []), ...DEFAULT_BENCHMARKS]
  return { industryKey: key ?? null, peers, benchmarks }
}
