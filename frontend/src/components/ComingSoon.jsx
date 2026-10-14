// 功能頁面的共用佔位元件：顯示標題、功能說明與目前模式（功能完成後即可移除）
import { useMode } from '../context/mode'

export default function ComingSoon({ title, beginner, pro }) {
  const { isPro } = useMode()

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">{title}</h1>
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-2">
        <p className="text-xs text-gray-400">目前模式：{isPro ? '專業' : '新手'}</p>
        <p className="text-sm text-gray-600">{isPro ? pro : beginner}</p>
        <p className="text-sm text-gray-400">頁面開發中...</p>
      </div>
    </div>
  )
}
