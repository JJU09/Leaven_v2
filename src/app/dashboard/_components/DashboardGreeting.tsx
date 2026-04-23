import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

interface DashboardGreetingProps {
  storeName: string
  userName: string
}

export function DashboardGreeting({ storeName, userName }: DashboardGreetingProps) {
  const now = new Date()
  const dateStr = format(now, 'M월 d일 (EEEE)', { locale: ko })
  
  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          좋은 아침이에요, {userName}님 👋
        </h1>
        <p className="text-slate-500 mt-1">
          오늘은 {dateStr} 입니다. {storeName} 매장의 현황을 확인해보세요.
        </p>
      </div>
    </div>
  )
}