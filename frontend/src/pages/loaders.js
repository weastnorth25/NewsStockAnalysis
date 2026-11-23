// 各頁面的程式載入函式：App.jsx 用 lazy() 包起來，utils/prefetch.js 用來在背景先下載
// 同一個 import() 只會下載一次，先下載過的頁面點進去就不用再等
export const pageLoaders = {
  Dashboard:       () => import('./Dashboard'),
  News:            () => import('./News'),
  Stocks:          () => import('./Stocks'),
  Favourites:      () => import('./Favourites'),
  Settings:        () => import('./Settings'),
  Macro:           () => import('./Macro'),
  Peers:           () => import('./Peers'),
  Financials:      () => import('./Financials'),
  Chips:           () => import('./Chips'),
  InstitutionPerf: () => import('./InstitutionPerf'),
}
