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
  {
    id: 7,
    title: '元大台灣 50 規模突破 5,000 億，散戶投資 ETF 意願強勁',
    summary: '元大台灣 50 ETF 規模再創新高，受益人數突破 180 萬人，反映散戶對長期被動投資的高度認同。',
    content: `元大投信公告，0050 ETF 最新規模已突破新台幣 5,000 億元，較去年同期成長逾 35%。\n\n法人分析指出，台股長期表現亮眼加上殖利率穩定，使 ETF 成為散戶資產配置首選，預計規模將持續成長。`,
    source: '經濟日報',
    date: '2026年5月5日',
    reporter: '吳資管',
    location: '台北',
    relatedStocks: ['0050'],
    sentiment: 0.75,
  },
  {
    id: 8,
    title: '富邦金 4 月稅後盈餘月增 12%，獲利動能延續',
    summary: '富邦金控公布 4 月自結獲利，稅後盈餘較上月成長 12%，主要受惠於壽險投資收益與銀行放款業務成長。',
    content: `富邦金 4 月稅後純益達新台幣 78 億元，累計前 4 月 EPS 為 2.85 元，超越去年同期水準。\n\n壽險部位因股市表現亮眼帶動投資收益，銀行端放款規模持續擴張，雙引擎驅動下法人看好全年獲利。`,
    source: '工商時報',
    date: '2026年5月6日',
    reporter: '黃金融',
    location: '台北',
    relatedStocks: ['2881'],
    sentiment: 0.68,
  },
  {
    id: 9,
    title: '聯發科發表新一代旗艦 AI 晶片，效能大幅提升',
    summary: '聯發科正式發表天璣 9500 旗艦處理器，AI 算力較前一代提升 80%，有望搶下高階手機晶片市場。',
    content: `聯發科於台北舉行新品發表會，宣布天璣 9500 採用台積電 3nm 製程，整合自研 NPU，AI 運算效能大幅超越競品。\n\n小米、OPPO、vivo 均已宣布將採用新晶片於旗艦機種，預計第三季開始量產出貨。`,
    source: '數位時代',
    date: '2026年5月7日',
    reporter: '李科技',
    location: '台北',
    relatedStocks: ['2454'],
    sentiment: 0.82,
  },
  {
    id: 10,
    title: '緯創 AI 伺服器出貨優於預期，Q2 營收創新高',
    summary: '緯創資通宣布 4 月 AI 伺服器出貨量較預期成長 20%，第二季營收可望再創歷史新高。',
    content: `緯創 4 月合併營收達新台幣 1,250 億元，年增 45%，其中 AI 伺服器佔比已逾 35%。\n\n公司表示，GB200 與 GB300 訂單能見度延伸至 2027 年，目前產能滿載，第三季將擴大墨西哥廠產能因應需求。`,
    source: '財訊',
    date: '2026年5月8日',
    reporter: '陳產業',
    location: '新竹',
    relatedStocks: ['3231'],
    sentiment: 0.83,
  },
  {
    id: 11,
    title: '國泰金海外債券投資減損，Q1 獲利低於預期',
    summary: '國泰金控因美債部位評價損失擴大，第一季稅後盈餘較去年同期衰退 18%，低於市場預期。',
    content: `國泰金公布 Q1 財報，稅後盈餘 124 億元，年減 18%。主因壽險投資組合中美債部位因利率波動產生評價損失。\n\n公司表示已逐步調整資產配置，將降低長天期債券比重，預期下半年獲利可望回穩。`,
    source: '聯合報',
    date: '2026年5月9日',
    reporter: '陳志明',
    location: '台北',
    relatedStocks: ['2882'],
    sentiment: 0.32,
  },
  {
    id: 12,
    title: '鴻海印度產線正式量產，蘋果在地化策略加速',
    summary: '鴻海印度清奈廠正式量產 iPhone 17，預計年產能可達 3,000 萬支，協助蘋果分散供應鏈風險。',
    content: `鴻海宣布印度清奈廠完成 iPhone 17 量產認證，初期月產能 100 萬支，預計年底拉升至 250 萬支。\n\n此舉除協助蘋果落實供應鏈分散策略外，也讓鴻海進一步擴大在印度市場的版圖，並爭取當地政府補助。`,
    source: '工商時報',
    date: '2026年5月10日',
    reporter: '王小華',
    location: '台北',
    relatedStocks: ['2317'],
    sentiment: 0.77,
  },
  {
    id: 13,
    title: '台積電 2nm 試產進度超前，2026 下半年量產',
    summary: '台積電宣布新竹寶山 2nm 廠試產良率優於預期，有望提前於 2026 下半年進入量產階段。',
    content: `台積電於技術論壇中表示，2nm 製程試產良率已突破 75%，較原計畫提前 1 季達標。\n\n蘋果、輝達、AMD 已預訂大部分產能，分析師估計 2nm 將為公司帶來年營收成長動能逾 15%。`,
    source: '經濟日報',
    date: '2026年5月11日',
    reporter: '張大明',
    location: '新竹',
    relatedStocks: ['2330'],
    sentiment: 0.84,
  },
  {
    id: 14,
    title: '廣達 AI 伺服器毛利率突破 15%，獲利結構轉佳',
    summary: '廣達電腦法說會表示，AI 伺服器產品毛利率已突破 15%，較傳統伺服器高出近一倍，獲利動能強勁。',
    content: `廣達董事長林百里於法說會表示，公司 AI 伺服器營收佔比已達 40%，毛利率穩定維持 15% 以上。\n\n受惠於 GB200 出貨放量，預估全年營收成長將達 30%，獲利可望創歷史新高。`,
    source: '數位時代',
    date: '2026年5月12日',
    reporter: '李科技',
    location: '桃園',
    relatedStocks: ['2382'],
    sentiment: 0.86,
  },
  {
    id: 15,
    title: '中美科技戰升溫，美再擴大半導體出口管制',
    summary: '美國商務部宣布新一波半導體出口管制清單，涵蓋多項先進製程設備，台廠營運恐受牽連。',
    content: `美方最新公告擴大對中國半導體業的出口限制，包含 EUV 光罩、先進封裝設備等項目。\n\n市場擔憂相關規範可能影響台積電、聯發科等對中業務，盤面電子權值股全面承壓，外資出現賣壓。`,
    source: '自由時報',
    date: '2026年5月13日',
    reporter: '林美玲',
    location: '華盛頓',
    relatedStocks: ['2330', '2454'],
    sentiment: 0.28,
  },
  {
    id: 16,
    title: '富邦金通過現金股利 4.5 元，殖利率逾 5%',
    summary: '富邦金董事會通過 2025 年度股利分派案，每股配發現金股利 4.5 元，創歷史新高。',
    content: `富邦金董事會決議配發每股 4.5 元現金股利，較去年成長 12.5%，以目前股價計算殖利率逾 5%。\n\n公司表示資本水位充裕，未來將維持穩定配息政策，回饋長期股東。`,
    source: '經濟日報',
    date: '2026年5月14日',
    reporter: '黃金融',
    location: '台北',
    relatedStocks: ['2881'],
    sentiment: 0.71,
  },
  {
    id: 17,
    title: '鴻海電動車合作案傳變數，Stellantis 暫緩採購',
    summary: '鴻海與 Stellantis 電動車合作案傳出變數，對方因內部策略調整暫緩部分電動車模組採購計畫。',
    content: `外電報導指出，Stellantis 因歐洲電動車市場成長放緩，將推遲與鴻海合作的兩款電動車平台採購計畫。\n\n鴻海回應，目前合作項目仍在進行中，相關訂單調整對整體營運影響有限，公司持續開拓其他客戶。`,
    source: '財訊',
    date: '2026年5月15日',
    reporter: '王小華',
    location: '台北',
    relatedStocks: ['2317'],
    sentiment: 0.38,
  },
  {
    id: 18,
    title: '外資連 5 日買超台股，加權指數續攻新高',
    summary: '外資連續 5 個交易日買超台股，累計買超金額達 850 億元，0050 與權值股獲青睞。',
    content: `外資看好台廠 AI 供應鏈長線前景，連續 5 日大舉買超，台積電與 0050 ETF 為主要買盤標的。\n\n加權指數收盤再創歷史新高，市場資金動能旺盛，法人估短線可望續攻 41,000 點。`,
    source: '工商時報',
    date: '2026年5月16日',
    reporter: '周分析',
    location: '台北',
    relatedStocks: ['0050', '2330'],
    sentiment: 0.80,
  },
  {
    id: 19,
    title: '聯發科 5G 晶片市占下滑，遭高通強力競爭',
    summary: '市調機構統計，聯發科 Q1 5G 晶片市占率較前季下滑 3 個百分點，主要受到高通新品衝擊。',
    content: `根據 Counterpoint 報告，聯發科 Q1 全球 5G 晶片市占降至 32%，高通則上升至 38%。\n\n分析師指出，主因高通驍龍 8 Gen 4 在高階市場表現亮眼，聯發科需加速新品迭代以維持競爭力。`,
    source: '數位時代',
    date: '2026年5月17日',
    reporter: '李科技',
    location: '台北',
    relatedStocks: ['2454'],
    sentiment: 0.42,
  },
  {
    id: 20,
    title: '廣達 Q1 財報優於預期，EPS 創同期新高',
    summary: '廣達電腦公布 Q1 財報，稅後 EPS 達 4.85 元，較去年同期成長 65%，創下歷史新高。',
    content: `廣達 Q1 合併營收達新台幣 3,580 億元，年增 42%，稅後純益 188 億元，EPS 4.85 元。\n\n公司表示 AI 伺服器需求持續強勁，預估第二季營收將續創新高，全年成長可望超越 30%。`,
    source: '經濟日報',
    date: '2026年5月18日',
    reporter: '陳產業',
    location: '桃園',
    relatedStocks: ['2382'],
    sentiment: 0.74,
  },
  {
    id: 21,
    title: '台積電蘋果先進製程訂單續約，鎖定 2 nm 與 1.6 nm',
    summary: '台積電與蘋果完成新一輪先進製程合作協議，蘋果承諾包下 2nm 與 1.6nm 大部分初期產能。',
    content: `根據供應鏈消息，蘋果與台積電簽訂為期 5 年的先進製程合作協議，涵蓋 2nm 與 1.6nm 製程。\n\n蘋果將包下初期約 60% 產能，預估為台積電帶來每年新台幣 6,000 億元以上的訂單貢獻。`,
    source: '工商時報',
    date: '2026年5月19日',
    reporter: '張大明',
    location: '新竹',
    relatedStocks: ['2330'],
    sentiment: 0.89,
  },
  {
    id: 22,
    title: '緯創墨西哥新廠落成，產能將再擴張 40%',
    summary: '緯創資通墨西哥廠正式落成，初期主要生產 AI 伺服器，預計使整體產能增加 40%。',
    content: `緯創宣布墨西哥蒙特雷新廠完工啟用，第一期月產能 5,000 台 AI 伺服器，年底前將擴張至 12,000 台。\n\n此舉有助公司就近服務北美客戶並降低運輸成本，預計可貢獻 2027 年營收逾 15%。`,
    source: '數位時代',
    date: '2026年5月27日',
    reporter: '陳產業',
    location: '蒙特雷',
    relatedStocks: ['3231'],
    sentiment: 0.76,
  },
  {
    id: 23,
    title: '國泰金 5 月獲利強彈，累計 EPS 超越去年',
    summary: '國泰金控公布 5 月自結獲利，單月稅後盈餘大幅成長，累計前 5 月 EPS 已超越去年同期。',
    content: `國泰金 5 月稅後純益達 95 億元，較上月成長 38%，累計前 5 月 EPS 達 2.65 元。\n\n公司表示已完成美債部位調整，下半年獲利動能可望持續轉強，全年表現仍有機會超越市場預期。`,
    source: '聯合報',
    date: '2026年5月28日',
    reporter: '陳志明',
    location: '台北',
    relatedStocks: ['2882'],
    sentiment: 0.80,
  },
  {
    id: 24,
    title: '鴻海 Q1 EPS 3.12 元，符合市場預期',
    summary: '鴻海公布第一季財報，稅後 EPS 為 3.12 元，符合市場預期，伺服器業務動能仍強。',
    content: `鴻海 Q1 合併營收 1.68 兆元，稅後純益 432 億元，EPS 3.12 元，與市場預估值一致。\n\n董事長劉揚偉表示 AI 伺服器訂單能見度高，第二季營收將季增雙位數，全年仍維持顯著成長展望。`,
    source: '工商時報',
    date: '2026年5月29日',
    reporter: '王小華',
    location: '台北',
    relatedStocks: ['2317'],
    sentiment: 0.69,
  },
  {
    id: 25,
    title: '聯發科海外子公司認列虧損，影響當季獲利',
    summary: '聯發科 5 月公告海外印度子公司認列營業外損失 12 億元，將影響第二季稅後純益約 0.85 元。',
    content: `聯發科公告印度子公司因匯損與商譽減損，本季將認列損失 12 億元。\n\n公司強調本業營運正常，AI 與 5G 晶片訂單持續成長，預估全年仍可維持雙位數獲利成長。`,
    source: '經濟日報',
    date: '2026年5月30日',
    reporter: '李科技',
    location: '新竹',
    relatedStocks: ['2454'],
    sentiment: 0.35,
  },
  {
    id: 26,
    title: '台積電遭日廠 Rapidus 搶單，分析師認影響有限',
    summary: '日本 Rapidus 宣稱取得部分 2nm 試產訂單，但分析師認為對台積電市場主導地位影響有限。',
    content: `日本 Rapidus 公開表示已取得 IBM 與 Tenstorrent 部分 2nm 試產訂單，引發市場關注。\n\n分析師指出 Rapidus 年產能仍極為有限，短期內難以撼動台積電 90% 以上的先進製程市佔。`,
    source: '財訊',
    date: '2026年5月31日',
    reporter: '張大明',
    location: '東京',
    relatedStocks: ['2330'],
    sentiment: 0.30,
  },
  {
    id: 27,
    title: '0050 公告 6 月配息 1.85 元，創歷史新高',
    summary: '元大投信公告 0050 ETF 將於 6 月配息每股 1.85 元，較去年同期成長 18%，創歷史新高。',
    content: `0050 ETF 公告本期配息金額為 1.85 元，反映成分股獲利能力大幅提升。\n\n以目前股價計算單期殖利率約 1%，加上下半年另一次配息，預估全年殖利率可達 2.5% 以上。`,
    source: '工商時報',
    date: '2026年6月1日',
    reporter: '吳資管',
    location: '台北',
    relatedStocks: ['0050'],
    sentiment: 0.72,
  },
  {
    id: 28,
    title: '廣達伺服器庫存增加，市場憂供過於求',
    summary: '供應鏈消息指出廣達 5 月底伺服器庫存週數較前月上升至 6 週，市場開始擔憂 AI 需求降溫。',
    content: `廣達 5 月伺服器庫存週數由 4.5 週上升至 6 週，分析師憂慮終端需求可能出現短期降溫跡象。\n\n公司則回應主要因應客戶要求備貨，訂單能見度仍延伸至 2027 年，否認有需求疑慮。`,
    source: '數位時代',
    date: '2026年6月2日',
    reporter: '陳產業',
    location: '桃園',
    relatedStocks: ['2382'],
    sentiment: 0.48,
  },
  {
    id: 29,
    title: '富邦金傳併購大眾銀行，金融整併加速',
    summary: '市場傳出富邦金有意併購大眾銀行，藉以擴大南部市場版圖，雙方已進入實質協商階段。',
    content: `根據業界消息，富邦金已與大眾銀行展開併購協商，預估收購金額約新台幣 380 億元。\n\n若併購案順利完成，富邦金中南部分行數量將大幅增加，存放款規模可望躍居民營銀行前段班。`,
    source: '聯合報',
    date: '2026年6月3日',
    reporter: '黃金融',
    location: '台北',
    relatedStocks: ['2881'],
    sentiment: 0.78,
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

// 公司基本資料（等後端做完再改成 API）
export const mockCompanyInfo = {
  '2330': {
    fullName:    '台灣積體電路製造股份有限公司',
    description: '全球最大專業積體電路製造服務公司，提供 7nm、5nm、3nm 等先進晶圓代工製程，主要客戶包括蘋果、輝達、AMD、高通等。',
    founded:     1987,
    employees:   '76,000+',
    chairman:    '魏哲家',
    address:     '新竹市科學園區力行六路 8 號',
    website:     'www.tsmc.com',
  },
  '2317': {
    fullName:    '鴻海精密工業股份有限公司',
    description: '全球最大電子製造服務商，業務涵蓋消費電子、雲端服務、5G 通訊、伺服器、電動車與半導體等領域。',
    founded:     1974,
    employees:   '826,000+',
    chairman:    '劉揚偉',
    address:     '新北市土城區中山路 66 號',
    website:     'www.foxconn.com',
  },
  '2454': {
    fullName:    '聯發科技股份有限公司',
    description: '全球前三大 IC 設計公司，產品涵蓋無線通訊、智慧型手機處理器、電視 SoC、物聯網與 AI 晶片等。',
    founded:     1997,
    employees:   '21,000+',
    chairman:    '蔡明介',
    address:     '新竹市新竹科學園區篤行一路 1 號',
    website:     'www.mediatek.tw',
  },
  '2382': {
    fullName:    '廣達電腦股份有限公司',
    description: '全球最大筆電與 AI 伺服器代工廠之一，主要客戶為 Apple、Meta、Google、Microsoft 等科技巨頭。',
    founded:     1988,
    employees:   '92,000+',
    chairman:    '林百里',
    address:     '桃園市龜山區文化二路 211 號',
    website:     'www.quantatw.com',
  },
  '2881': {
    fullName:    '富邦金融控股股份有限公司',
    description: '台灣最大民營金控之一，旗下包括富邦人壽、台北富邦銀行、富邦證券等子公司，業務涵蓋人壽、銀行、證券與資產管理。',
    founded:     2001,
    employees:   '35,000+',
    chairman:    '蔡明興',
    address:     '台北市信義區仁愛路四段 169 號',
    website:     'www.fubon.com',
  },
  '2882': {
    fullName:    '國泰金融控股股份有限公司',
    description: '台灣資產規模最大金融控股公司，旗下包含國泰人壽、國泰世華銀行、國泰證券等子公司，為台灣金融業龍頭。',
    founded:     2001,
    employees:   '60,000+',
    chairman:    '蔡宏圖',
    address:     '台北市信義區仁愛路四段 296 號',
    website:     'www.cathayholdings.com',
  },
  '0050': {
    fullName:    '元大台灣卓越 50 證券投資信託基金',
    description: '追蹤台灣 50 指數，由市值最大的 50 家上市公司組成的 ETF，為國民級被動投資工具，2003 年上市以來規模持續成長。',
    founded:     2003,
    employees:   'ETF 商品',
    chairman:    '元大投信發行',
    address:     '台北市南港區三重路 66 號',
    website:     'www.yuantaetfs.com',
  },
  '3231': {
    fullName:    '緯創資通股份有限公司',
    description: '全球領先的 ICT 系統服務商，業務涵蓋筆電、桌機、伺服器、AI 伺服器及顯示器代工，AI 伺服器佔比逐步提升。',
    founded:     2001,
    employees:   '70,000+',
    chairman:    '林憲銘',
    address:     '新北市汐止區新台五路一段 88 號',
    website:     'www.wistron.com',
  },
}

// ─── 市場情緒（論壇貼文）─────────────────────────────────────────
export const FORUM_SOURCES = [
  { key: 'ptt',      label: 'PTT 股票板',    color: '#8b5cf6' },
  { key: 'mobile01', label: 'Mobile01',     color: '#f97316' },
  { key: 'dcard',    label: 'Dcard 投資理財', color: '#3b82f6' },
  { key: 'buffett',  label: '巴菲特投資聯盟', color: '#10b981' },
]

export const mockForumPosts = [
  { id: 1,  source: 'ptt',      title: '台積電法說超猛，外資狂買連 3 天', excerpt: '昨天法說會講得超好的，AI 訂單滿到 2027，魏哲家整個信心爆棚...', author: 'investor2024', likes: 412, replies: 156, sentiment: 0.85, mentionedStocks: ['2330'], postedAt: '2026/6/3 14:32' },
  { id: 2,  source: 'mobile01', title: '台積電法說感想：先進製程真的猛',     excerpt: '聽完 2nm 試產進度提前真的有夠樂觀，蘋果也下了大單，這支怎麼可能不漲？', author: 'tech_lover',   likes: 289, replies: 102, sentiment: 0.78, mentionedStocks: ['2330'], postedAt: '2026/6/3 11:15' },
  { id: 3,  source: 'ptt',      title: '鴻海電動車到底有沒有救？',         excerpt: 'Stellantis 暫緩採購，這對鴻海打擊不小，雖然劉揚偉嘴硬說沒事，但市場明顯不買單。', author: 'stock_doubt',  likes: 178, replies: 234, sentiment: 0.32, mentionedStocks: ['2317'], postedAt: '2026/6/2 22:08' },
  { id: 4,  source: 'dcard',    title: '第一次買 0050 該注意什麼？',        excerpt: '小資族剛開始投資，看大家都推薦 0050，殖利率穩定看起來蠻香的，請問現在是好時機嗎？', author: '理財新手',      likes: 156, replies: 78,  sentiment: 0.72, mentionedStocks: ['0050'], postedAt: '2026/6/2 19:45' },
  { id: 5,  source: 'buffett',  title: '聯發科新晶片發表會技術分析',         excerpt: '天璣 9500 採 3nm 製程，NPU 算力提升 80%，搭配小米 OPPO vivo 旗艦機，第三季業績可期。', author: '價值投資人',    likes: 245, replies: 67,  sentiment: 0.80, mentionedStocks: ['2454'], postedAt: '2026/6/2 16:22' },
  { id: 6,  source: 'ptt',      title: '廣達被狂炒到底還能買嗎',           excerpt: 'AI 伺服器庫存週數上升到 6 週，是真的需求降溫還是公司在洗盤？等回檔再進場吧。', author: 'wait_pullback', likes: 198, replies: 145, sentiment: 0.42, mentionedStocks: ['2382'], postedAt: '2026/6/2 13:10' },
  { id: 7,  source: 'mobile01', title: '緯創 AI server 出貨優於預期',       excerpt: '4 月營收年增 45%，GB200 訂單滿到 2027，墨西哥新廠又要量產，這支至少抱到年底。', author: 'long_term_buy', likes: 167, replies: 54,  sentiment: 0.83, mentionedStocks: ['3231'], postedAt: '2026/6/1 21:32' },
  { id: 8,  source: 'ptt',      title: '中美貿易戰升溫快跑啊',             excerpt: '美方又擴大半導體出口管制，台積電聯發科首當其衝，大盤要小心一波修正。', author: 'risk_alert',    likes: 524, replies: 412, sentiment: 0.18, mentionedStocks: ['2330', '2454'], postedAt: '2026/6/1 17:48' },
  { id: 9,  source: 'dcard',    title: '富邦金配息 4.5 元爽爆',            excerpt: '殖利率超過 5%，金融股穩定配息真的太香，已經放一年多了，繼續抱。', author: 'dividend_fan',  likes: 89,  replies: 32,  sentiment: 0.78, mentionedStocks: ['2881'], postedAt: '2026/6/1 14:25' },
  { id: 10, source: 'buffett',  title: '國泰金 Q1 財報拆解：美債部位的隱憂', excerpt: '海外債券評價損失擴大，Q1 EPS 衰退 18%，雖然管理層說已調整部位，但下半年觀察期還沒過。', author: '財報控',        likes: 156, replies: 89,  sentiment: 0.35, mentionedStocks: ['2882'], postedAt: '2026/5/31 22:14' },
  { id: 11, source: 'ptt',      title: '台積電 2nm 試產良率 75% 是真的嗎？', excerpt: '法說上講得這麼漂亮，但供應鏈消息說有幾個良率挑戰還沒解決，到底要不要信？', author: 'skeptic_user',  likes: 234, replies: 178, sentiment: 0.58, mentionedStocks: ['2330'], postedAt: '2026/5/31 19:30' },
  { id: 12, source: 'mobile01', title: '鴻海印度產線量產實況分享',          excerpt: '朋友在清奈廠工作，產線跑得不錯，月產能 100 萬支 iPhone 17，年底要拉到 250 萬。', author: 'india_insider',  likes: 124, replies: 45,  sentiment: 0.70, mentionedStocks: ['2317'], postedAt: '2026/5/31 12:08' },
  { id: 13, source: 'ptt',      title: '聯發科市占被高通搶走怎麼辦',         excerpt: 'Q1 全球 5G 晶片市占從 35% 跌到 32%，高通驍龍 8 Gen 4 確實強，要繼續抱嗎？', author: 'mtk_holder',    likes: 167, replies: 134, sentiment: 0.30, mentionedStocks: ['2454'], postedAt: '2026/5/30 20:42' },
  { id: 14, source: 'dcard',    title: '0050 跌一下就慌的我...',           excerpt: 'ETF 不是要長期持有嗎？看到帳面虧 5% 就睡不著，是不是我心臟太弱了？', author: 'newbie_invest', likes: 312, replies: 198, sentiment: 0.50, mentionedStocks: ['0050'], postedAt: '2026/5/30 15:18' },
  { id: 15, source: 'buffett',  title: '廣達 Q1 EPS 4.85 元年增 65%',       excerpt: '本業強到爆，AI 伺服器毛利率突破 15%，全年成長 30% 應該穩了，目標價上看 400。', author: '長線價值',      likes: 198, replies: 56,  sentiment: 0.86, mentionedStocks: ['2382'], postedAt: '2026/5/29 21:55' },
  { id: 16, source: 'ptt',      title: '台積電遭日廠 Rapidus 搶單？',       excerpt: '日本人搶幾顆試產訂單就在那邊歡呼，台積電年產能 100 倍以上，影響根本可以忽略。', author: 'taiwan_pride',  likes: 289, replies: 156, sentiment: 0.35, mentionedStocks: ['2330'], postedAt: '2026/5/29 18:20' },
  { id: 17, source: 'mobile01', title: '緯創墨西哥新廠落成有感',            excerpt: '近北美客戶又能拿關稅優惠，AI 伺服器產能再增 40%，業績應該還會繼續炸。', author: 'tech_analyst',  likes: 145, replies: 38,  sentiment: 0.75, mentionedStocks: ['3231'], postedAt: '2026/5/28 16:42' },
  { id: 18, source: 'ptt',      title: '富邦金併購大眾銀行傳聞',            excerpt: '380 億的併購案如果真的成，中南部分行直接補齊，但短期可能會稀釋 EPS。', author: 'finance_track', likes: 134, replies: 78,  sentiment: 0.65, mentionedStocks: ['2881'], postedAt: '2026/5/28 11:30' },
  { id: 19, source: 'dcard',    title: '國泰金 5 月獲利強彈了！',           excerpt: '單月稅後 95 億，年初被美債拖累的部分終於追回來，繼續存股下去。', author: 'cathay_lover',  likes: 87,  replies: 24,  sentiment: 0.78, mentionedStocks: ['2882'], postedAt: '2026/5/27 19:08' },
  { id: 20, source: 'ptt',      title: '鴻海 Q1 EPS 3.12 元符合預期',       excerpt: '其實沒有特別驚喜，但 AI 伺服器拉動下半年應該會更好，劉揚偉說 Q2 季增雙位數。', author: 'foxconn_buy',   likes: 156, replies: 67,  sentiment: 0.62, mentionedStocks: ['2317'], postedAt: '2026/5/27 14:55' },
]

// 把「2026年5月25日」轉成 Date 物件
function parseChineseDate(str) {
  const m = str.match(/(\d+)年(\d+)月(\d+)日/)
  if (!m) return null
  return new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]))
}

// 給定股票代號與天數，回傳該股票過去 N 天的每日情緒平均
// 沒有新聞的日期不會出現在結果裡，前端可選擇是否補空白
export function getSentimentHistory(symbol, days = 30) {
  // 用 mockNews 裡最後一篇的日期當「今天」，避免假資料時間過久看不到走勢
  const latest = mockNews
    .map(n => parseChineseDate(n.date))
    .filter(Boolean)
    .sort((a, b) => b - a)[0] || new Date()
  const cutoff = new Date(latest.getTime() - days * 86400000)

  // 篩出相關新聞並按日分組
  const buckets = {}
  mockNews
    .filter(n => n.relatedStocks?.includes(symbol))
    .map(n => ({ ...n, _d: parseChineseDate(n.date) }))
    .filter(n => n._d && n._d >= cutoff && n._d <= latest)
    .forEach(n => {
      const key = `${n._d.getFullYear()}-${n._d.getMonth()+1}-${n._d.getDate()}`
      if (!buckets[key]) buckets[key] = { _d: n._d, sum: 0, count: 0, items: [] }
      buckets[key].sum   += n.sentiment
      buckets[key].count += 1
      buckets[key].items.push({ id: n.id, title: n.title, sentiment: n.sentiment })
    })

  return Object.values(buckets)
    .sort((a, b) => a._d - b._d)
    .map(b => ({
      date:      `${b._d.getMonth()+1}/${b._d.getDate()}`,
      sentiment: Math.round((b.sum / b.count) * 100) / 100,
      count:     b.count,
      items:     b.items,
    }))
}

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
