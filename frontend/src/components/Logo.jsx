// MoneyATM Logo 組件：簡潔文字設計，Money 白字 + ATM 金字，暗底圓角
export default function Logo() {
  return (
    <div
      className="inline-flex items-baseline px-4 py-2 rounded-lg"
      style={{ background: '#3b82f6' }}
    >
      <span
        className="text-[18px] font-black tracking-tight"
        style={{ color: '#ffffff', letterSpacing: '-0.02em' }}
      >
        Money
      </span>
      <span
        className="text-[18px] font-black tracking-tight"
        style={{ color: '#F59E0B', letterSpacing: '-0.02em' }}
      >
        ATM
      </span>
    </div>
  )
}
