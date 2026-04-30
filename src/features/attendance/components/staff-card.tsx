import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

interface StaffCardProps {
  staff: any
  attendance: any
  schedule: any
  isSelected: boolean
  onClick: () => void
  isToday: boolean
}

export function StaffCard({ staff, attendance, schedule, isSelected, onClick, isToday }: StaffCardProps) {
  const roleInfo = staff.role_info || { name: '직원', color: '#64748b' }
  const name = staff.name || staff.profile?.full_name || '직원'
  const initials = name.substring(0, 2)

  const status = attendance?.status || 'none'
  const inTime = attendance?.clock_in_time
  const outTime = attendance?.clock_out_time

  let isLate = false
  if (schedule && status === 'none' && isToday) {
    const schTime = new Date(`${schedule.plan_date}T${schedule.start_time}`).getTime()
    if (new Date().getTime() > schTime + (5 * 60 * 1000)) isLate = true
  }
  if (attendance && schedule) {
    const schTime = new Date(`${schedule.plan_date}T${schedule.start_time}`).getTime()
    const attTime = new Date(attendance.clock_in_time).getTime()
    if (attTime > schTime + (5 * 60 * 1000)) isLate = true
  }

  // Calculate total hours
  let totalHours = '-'
  if (inTime && outTime) {
    const start = new Date(inTime).getTime()
    const end = new Date(outTime).getTime()
    const diffMins = Math.max(0, Math.round((end - start) / 60000))
    const hours = Math.floor(diffMins / 60)
    const mins = diffMins % 60
    totalHours = `${hours}h ${mins}m`
  } else if (inTime && status === 'working') {
    const start = new Date(inTime).getTime()
    const end = new Date().getTime()
    const diffMins = Math.max(0, Math.round((end - start) / 60000))
    const hours = Math.floor(diffMins / 60)
    const mins = diffMins % 60
    totalHours = `${hours}h ${mins}m`
  }

  const formatT = (iso?: string | null) => iso ? format(new Date(iso), 'HH:mm') : '--:--'

  // Badge styles
  let badgeProps = { label: '대기', className: 'bg-gray-100 text-gray-500' }

  if (status === 'working') {
    badgeProps = { label: '근무중', className: 'bg-green-100 text-green-800' }
  } else if (status === 'on_break') {
    badgeProps = { label: '휴게중', className: 'bg-blue-100 text-blue-800' }
  } else if (status === 'completed') {
    badgeProps = { label: '퇴근완료', className: 'bg-slate-100 text-slate-600' }
  } else if (isLate) {
    badgeProps = { label: '지각', className: 'bg-amber-100 text-amber-800' }
  } else if (!schedule && status === 'none') {
     badgeProps = { label: '일정없음', className: 'bg-gray-100 text-gray-400' }
  }

  return (
    <Card 
      onClick={onClick}
      className={cn(
        "grid grid-cols-[36px_1fr_auto] items-center gap-3 p-3 cursor-pointer transition-colors hover:border-border/60",
        isSelected ? "border-primary shadow-sm" : ""
      )}
    >
      <Avatar className="h-9 w-9 bg-slate-100 text-slate-600 border">
        <AvatarFallback className="bg-transparent">{initials}</AvatarFallback>
      </Avatar>

      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{name}</span>
          <div 
            className="text-xs px-1.5 py-0.5 rounded-sm bg-muted/50" 
            style={{ color: roleInfo.color }}
          >
            {roleInfo.name}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex flex-col items-end">
          <span className="text-xs text-muted-foreground">
            {formatT(inTime)} → {formatT(outTime)}
          </span>
          <span className="text-xs font-medium">{totalHours !== '-' ? totalHours : '0h 0m'}</span>
        </div>
        <Badge variant="outline" className={cn("border-none shrink-0 w-16 justify-center", badgeProps.className)}>
          {badgeProps.label}
        </Badge>
      </div>
    </Card>
  )
}