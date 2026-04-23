import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAttendanceToday } from "../_hooks/useAttendanceToday"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Users } from "lucide-react"
import Link from "next/link"

interface AttendanceListProps {
  storeId: string
}

export function AttendanceList({ storeId }: AttendanceListProps) {
  const { data: attendance, isLoading } = useAttendanceToday(storeId)

  const getStatusBadge = (status: string) => {
    switch (status) {
      case '근무 중': 
        return (
          <div className="inline-flex w-fit items-center gap-1.5 border border-blue-200 bg-blue-50 px-2 py-0.5 rounded-full">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            <span className="font-bold text-[10px] text-blue-600">근무 중</span>
          </div>
        )
      case '결근 / 미출근': return <Badge variant="destructive" className="bg-red-100 text-red-700 border-red-200 text-[10px]">결근/미출근</Badge>
      case '연차': return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200 text-[10px]">연차</Badge>
      case '퇴근 완료': return <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200 text-[10px]">퇴근 완료</Badge>
      case '출근 전': return <Badge variant="secondary" className="bg-slate-100 text-slate-500 text-[10px]">대기/정상</Badge>
      default: return null
    }
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Users className="h-5 w-5" />
            오늘 출퇴근 현황
          </CardTitle>
          <Link href="/dashboard/attendance" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">
            전체 보기 &rarr;
          </Link>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="h-full flex items-center justify-center text-slate-400 py-8">
            <p>로딩 중...</p>
          </div>
        ) : !attendance || attendance.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 py-8">
            <Users className="h-10 w-10 mb-2 opacity-20" />
            <p>오늘 출근 예정 직원이 없어요</p>
          </div>
        ) : (
          <div className="space-y-4">
            {attendance.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg transition-colors">
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-slate-100 text-slate-600 text-xs font-semibold">
                      {item.name.substring(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">{item.name}</p>
                      {item.role && (
                        <Badge variant="outline" className="text-[9px] px-1 h-4 font-normal" style={item.avatarColor ? { color: item.avatarColor, borderColor: item.avatarColor } : undefined}>
                          {item.role}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {item.scheduleTime && <span className="text-[10px] text-slate-400">예정: {item.scheduleTime}</span>}
                      {item.time && <span className="text-[10px] font-medium text-slate-600">출근: {item.time}</span>}
                    </div>
                  </div>
                </div>
                <div>{getStatusBadge(item.status)}</div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}