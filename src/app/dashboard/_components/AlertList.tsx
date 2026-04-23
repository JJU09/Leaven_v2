import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertItem } from "../_utils/alertBuilder"
import { Bell, ChevronRight, AlertTriangle, AlertCircle, Info } from "lucide-react"
import Link from "next/link"

interface AlertListProps {
  alerts: AlertItem[]
  hasMore?: boolean
}

export function AlertList({ alerts, hasMore }: AlertListProps) {
  
  const getIcon = (severity: string) => {
    switch (severity) {
      case 'red': return <AlertCircle className="h-5 w-5 text-red-500" />
      case 'amber': return <AlertTriangle className="h-5 w-5 text-amber-500" />
      case 'blue': return <Info className="h-5 w-5 text-blue-500" />
      default: return <Bell className="h-5 w-5 text-slate-500" />
    }
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Bell className="h-5 w-5" />
            알림 및 할일
          </CardTitle>
          <Link href="/dashboard/my-tasks" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">
            전체 보기 &rarr;
          </Link>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto">
        {alerts.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 py-8">
            <Bell className="h-10 w-10 mb-2 opacity-20" />
            <p>오늘 처리할 알림이 없어요</p>
          </div>
        ) : (
          <div className="space-y-4">
            {alerts.map((alert) => (
              <div key={alert.id} className="flex items-start gap-3 p-3 rounded-lg border bg-slate-50/50 hover:bg-slate-50 transition-colors">
                <div className="mt-0.5">
                  {getIcon(alert.severity)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold truncate">{alert.title}</p>
                    {alert.dDay !== undefined && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium whitespace-nowrap
                        ${alert.severity === 'red' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}
                      >
                        D-{alert.dDay}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{alert.subText}</p>
                </div>
                <Link 
                  href={alert.actionHref}
                  className="flex items-center justify-center h-8 w-8 rounded-full hover:bg-slate-200 transition-colors shrink-0 self-center"
                >
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </Link>
              </div>
            ))}
            {hasMore && (
              <div className="text-center pt-2 pb-1">
                <span className="text-xs text-slate-500">알림이 더 있습니다. 전체 보기를 확인해주세요.</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}