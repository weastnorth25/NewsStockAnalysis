// 台股財報公布期限（一般上市櫃公司；金融業與 KY 公司期限不同，之後由後端提供實際日期較準）
// 月營收：次月 10 日前；Q1：5/15、Q2：8/14、Q3：11/14、年報（含 Q4）：隔年 3/31

const fmt = (d) => `${d.getMonth() + 1}/${d.getDate()}`
const daysBetween = (a, b) => Math.ceil((b - a) / 86400000)

export function nextMonthlyRevenue(today = new Date()) {
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const due = t.getDate() <= 10 ? new Date(t.getFullYear(), t.getMonth(), 10) : new Date(t.getFullYear(), t.getMonth() + 1, 10)
  const reportMonth = new Date(due.getFullYear(), due.getMonth() - 1, 1)
  return { label: `${reportMonth.getMonth() + 1} 月營收`, date: fmt(due), daysLeft: daysBetween(t, due) }
}

export function nextQuarterlyReport(today = new Date()) {
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const y = t.getFullYear()
  const deadlines = [
    { label: `${y - 1} 年報`, due: new Date(y, 2, 31) },
    { label: `${y} Q1 季報`, due: new Date(y, 4, 15) },
    { label: `${y} Q2 季報`, due: new Date(y, 7, 14) },
    { label: `${y} Q3 季報`, due: new Date(y, 10, 14) },
    { label: `${y} 年報`, due: new Date(y + 1, 2, 31) },
  ]
  const next = deadlines.find((d) => d.due >= t)
  return { label: next.label, date: fmt(next.due), daysLeft: daysBetween(t, next.due) }
}
