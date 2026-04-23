import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Palmtree } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { format } from "date-fns"

interface LeaveRequest {
  id: string
  start_date: string
  end_date: string
  status: string
  member?: {
    name?: string | null
    profiles?: { full_name: string } | null
    role?: { name: string } | null
  } | null
}

interface StaffLeave {
  id: string
  member_id: string
  total_days: number | null
  used_days: number
  member?: {
    name?: string | null
    profiles?: { full_name: string } | null
  } | null
}

interface LeavePanelProps {
  monthLeaves: LeaveRequest[]
  staffLeaves: StaffLeave[]
}

export function LeavePanel({ monthLeaves, staffLeaves }: LeavePanelProps) {
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved': return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200 text-[10px]">승인됨</Badge>
      case 'pending': return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200 text-[10px]">대기중</Badge>
      case 'rejected': return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-red-200 text-[10px]">반려됨</Badge>
      default: return null
    }
  }

  const getUsageColor = (used: number, total: number) => {
    if (total === 0) return 'bg-slate-300'
    const ratio = used / total
    if (ratio >= 0.8) return 'bg-red-500'
    if (ratio >= 0.6) return 'bg-amber-500'
    return 'bg-blue-500'
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Palmtree className="h-5 w-5" />
            연차·휴가 현황
          </CardTitle>
          <Link href="/dashboard/leave" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">
            전체 보기 &rarr;
          </Link>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto flex flex-col gap-6">
        
        {/* 승인 대기 중인 연차 목록 */}
        <div>
          <p className="text-sm font-semibold text-slate-700 mb-3">승인 대기 중인 연차</p>
          {monthLeaves.length === 0 ? (
            <p className="text-sm text-slate-500 italic">승인 대기 중인 연차가 없습니다.</p>
          ) : (
            <div className="space-y-2">
              {monthLeaves.slice(0, 3).map(leave => {
                const name = leave.member?.name || leave.member?.profiles?.full_name || '이름 없음'
                return (
                <Link 
                  key={leave.id} 
                  href={`/dashboard/leave?id=${leave.id}`}
                  className="flex items-center justify-between p-2 rounded-lg border hover:bg-slate-50 border-amber-200 bg-amber-50/30 cursor-pointer"
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{name}</span>
                    <span className="text-xs text-slate-500">
                      {format(new Date(leave.start_date), 'MM/dd')} 
                      {leave.start_date !== leave.end_date && ` ~ ${format(new Date(leave.end_date), 'MM/dd')}`}
                    </span>
                  </div>
                  <div>{getStatusBadge(leave.status)}</div>
                </Link>
                )
              })}
              {monthLeaves.length > 3 && (
                <p className="text-xs text-center text-slate-500 pt-1">외 {monthLeaves.length - 3}건</p>
              )}
            </div>
          )}
        </div>

      </CardContent>
    </Card>
  )
}