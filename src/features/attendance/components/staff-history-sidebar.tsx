import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { getMemberDisplayName } from '@/lib/utils'

export type DayAttendanceStatus = 'present' | 'late' | 'absent' | 'off'

export interface DayAttendance {
  date: string
  status: DayAttendanceStatus
  schedule_start_time: string | null
  schedule_end_time: string | null
  clock_in_time: string | null
  clock_out_time: string | null
  worked_minutes: number | null
}

interface StaffHistorySidebarProps {
  member: any
  monthlyData: Record<string, DayAttendance>
  selectedDay: string | null
}

export function StaffHistorySidebar({ member, monthlyData, selectedDay }: StaffHistorySidebarProps) {
  const name = getMemberDisplayName(member)
  const roleName = member?.role_info?.name || '직원'
  const initials = name.substring(0, 2)

  // Calculate monthly metrics
  let totalWorkingDays = 0
  let totalWorkingMinutes = 0
  let totalLate = 0
  let totalAbsent = 0

  Object.values(monthlyData).forEach(day => {
    if (day.status === 'present' || day.status === 'late') {
      totalWorkingDays++
    }
    if (day.status === 'late') {
      totalLate++
    }
    if (day.status === 'absent') {
      totalAbsent++
    }
    if (day.worked_minutes) {
      totalWorkingMinutes += day.worked_minutes
    }
  })

  const totalHours = Math.floor(totalWorkingMinutes / 60)
  const totalMins = totalWorkingMinutes % 60

  const selectedData = selectedDay ? monthlyData[selectedDay] : null

  const formatT = (iso?: string | null) => iso ? format(new Date(iso), 'HH:mm') : '-'

  const getStatusBadge = (status: DayAttendanceStatus) => {
    switch (status) {
      case 'present': return <Badge variant="outline" className="bg-green-100 text-green-800 border-none font-medium">정상</Badge>
      case 'late': return <Badge variant="outline" className="bg-amber-100 text-amber-800 border-none font-medium">지각</Badge>
      case 'absent': return <Badge variant="outline" className="bg-red-100 text-red-800 border-none font-medium">결근</Badge>
      case 'off': return <Badge variant="outline" className="bg-gray-100 text-gray-500 border-none font-medium">휴무/일정없음</Badge>
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* 직원 카드 */}
      <Card className="p-4 flex flex-col items-center text-center">
        <Avatar className="w-12 h-12 rounded-full bg-green-100 text-green-800 mb-3 border-none">
          <AvatarFallback className="bg-transparent font-semibold">{initials}</AvatarFallback>
        </Avatar>
        <div className="text-base font-medium">{name}</div>
        <div className="text-sm text-muted-foreground mt-0.5">{roleName}</div>

        <Separator className="my-4 w-full" />

        <div className="w-full flex flex-col gap-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">총 근무일</span>
            <span className="font-semibold">{totalWorkingDays}일</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">총 근무시간</span>
            <span className="font-semibold">{totalHours}h {totalMins}m</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">지각</span>
            <span className="font-semibold text-amber-700">{totalLate}회</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">결근</span>
            <span className="font-semibold text-red-700">{totalAbsent}회</span>
          </div>
        </div>
      </Card>

      {/* 날짜 상세 카드 */}
      <Card className="flex flex-col min-h-[80px] overflow-hidden transition-all">
        {!selectedDay || !selectedData ? (
          <div className="flex-1 flex items-center justify-center p-6 text-sm text-muted-foreground text-center">
            날짜를 선택하세요
          </div>
        ) : (
          <div className="p-4 flex flex-col">
            <div className="text-sm font-medium text-muted-foreground mb-3 text-center">
              {format(new Date(selectedDay), 'yyyy년 MM월 dd일')}
            </div>

            <div className="flex justify-between items-center py-2 border-b text-sm">
              <span className="text-muted-foreground">예정 스케줄</span>
              <span className="font-medium text-muted-foreground">
                {selectedData.schedule_start_time && selectedData.schedule_end_time
                  ? `${selectedData.schedule_start_time.substring(0, 5)} - ${selectedData.schedule_end_time.substring(0, 5)}`
                  : '-'}
              </span>
            </div>

            <div className="flex justify-between items-center py-2 border-b text-sm">
              <span className="text-muted-foreground">출근</span>
              <span className="font-semibold">{formatT(selectedData.clock_in_time)}</span>
            </div>

            <div className="flex justify-between items-center py-2 border-b text-sm">
              <span className="text-muted-foreground">퇴근</span>
              <span className="font-semibold">{formatT(selectedData.clock_out_time)}</span>
            </div>

            <div className="flex justify-between items-center py-2 border-b text-sm">
              <span className="text-muted-foreground">근무시간</span>
              <span className="font-semibold">
                {selectedData.worked_minutes !== null
                  ? `${Math.floor(selectedData.worked_minutes / 60)}h ${selectedData.worked_minutes % 60}m`
                  : '-'}
              </span>
            </div>

            <div className="flex justify-between items-center pt-2 text-sm">
              <span className="text-muted-foreground">상태</span>
              {getStatusBadge(selectedData.status)}
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}