// 國際同業名單：依 yfinance 的 industryKey 分組，每組依市值由大到小排列
// 個股頁依該股票的產業別，從這裡挑出前幾名當比較對象（之後會加上讓使用者自己增減）

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
}

// 比較基準：每個產業都放 S&P 500，半導體再加費城半導體
export const INDUSTRY_BENCHMARKS = {
  'semiconductors': [{ ticker: '^SOX', name: '費城半導體' }],
}
export const DEFAULT_BENCHMARKS = [{ ticker: '^GSPC', name: 'S&P 500' }]

// 後端 /api/stock 還沒回傳 industry_key 之前的備用對照（只放展示用的幾檔）
export const FALLBACK_INDUSTRY = {
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
}

// 給股票代號（2330）和後端回傳的 industry_key，挑出前 n 家同業和基準指數
export function getPeers(symbol, industryKey, n = 3) {
  const key = industryKey || FALLBACK_INDUSTRY[symbol]
  const peers = (INDUSTRY_PEERS[key] ?? []).slice(0, n)
  const benchmarks = [...(INDUSTRY_BENCHMARKS[key] ?? []), ...DEFAULT_BENCHMARKS]
  return { industryKey: key ?? null, peers, benchmarks }
}
