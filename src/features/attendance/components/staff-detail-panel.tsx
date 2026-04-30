import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { useRouter } from 'next/navigation'

interface StaffDetailPanelProps {
  staff: any
  attendance: any
  schedule: any
  onEditClick: (type: 'clock_in' | 'clock_out' | 'edit') => void
}

export function StaffDetailPanel({ staff, attendance, schedule, onEditClick }: StaffDetailPanelProps) {
  const router = useRouter()
  const roleInfo = staff.role_info || { name: '직원', color: '#64748b' }
  const name = staff.name || staff.profile?.full_name || '직원'
  const initials = name.substring(0, 2)

  const inTimeStr = attendance?.clock_in_time
  const outTimeStr = attendance?.clock_out_time

  const formatT = (iso?: string | null) => iso ? format(new Date(iso), 'HH:mm') : '--:--'

  // Calculate timeline percentages (00:00 to 24:00)
  // Just a simple visual representation
  const getPercentage = (isoString?: string | null) => {
    if (!isoString) return null
    const d = new Date(isoString)
    const hours = d.getHours()
    const minutes = d.getMinutes()
    return ((hours * 60 + minutes) / (24 * 60)) * 100
  }

  const startPct = getPercentage(inTimeStr)
  let endPct = getPercentage(outTimeStr)

  if (startPct !== null && endPct === null && attendance?.status === 'working') {
    endPct = getPercentage(new Date().toISOString())
  }

  const hasTimeline = startPct !== null && endPct !== null
  const left = hasTimeline ? `${startPct}%` : '0%'
  const width = hasTimeline ? `${Math.max(0, endPct! - startPct!)}%` : '0%'

  // Simple logs based on available attendance data
  const logs = []
  if (inTimeStr) {
    logs.push({ time: inTimeStr, label: '출근', dot: 'bg-green-500' })
  }
  if (outTimeStr) {
    logs.push({ time: outTimeStr, label: '퇴근', dot: 'bg-slate-400' })
  }

  return (
    <Card className="mt-2 p-4 bg-slate-50/50 shadow-inner">
      <div className="flex items-center gap-3 mb-4">
        <Avatar className="h-10 w-10 bg-white border">
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div>
          <div className="font-semibold">{name}</div>
          <div className="text-xs text-muted-foreground">{roleInfo.name}</div>
        </div>
      </div>

      <div className="mb-4 text-sm text-muted-foreground">
        예정 스케줄: {' '}
        <span className="font-medium text-foreground">
          {schedule?.start_time && schedule?.end_time 
            ? `${schedule.start_time.substring(0, 5)} - ${schedule.end_time.substring(0, 5)}`
            : '없음'}
        </span>
      </div>

      <div className="mb-6">
        <div className="relative w-full h-1.5 bg-muted rounded-full overflow-hidden">
          {hasTimeline && (
            <div 
              className="absolute h-full bg-green-500 rounded-full" 
              style={{ left, width }}
            />
          )}
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-2">
          <span>00:00</span>
          <span>12:00</span>
          <span>24:00</span>
        </div>
      </div>

      {logs.length > 0 ? (
        <div className="mb-4 flex flex-col">
          {logs.map((log, idx) => (
            <div key={idx} className="flex items-center gap-3 py-2 border-b last:border-0 border-border/50">
              <div className={`w-2 h-2 rounded-full ${log.dot}`} />
              <div className="text-xs font-medium w-10">{formatT(log.time)}</div>
              <div className="text-xs text-muted-foreground">{log.label}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-sm text-muted-foreground text-center py-4 mb-2">
          기록이 없습니다.
        </div>
      )}

      <div className="flex gap-2 mt-2">
        <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => onEditClick('edit')}>
          수정
        </Button>
        
        {!inTimeStr ? (
          <Button variant="outline" size="sm" className="flex-1 text-xs text-blue-600" onClick={() => onEditClick('clock_in')}>
            출근하기
          </Button>
        ) : !outTimeStr ? (
          <Button variant="outline" size="sm" className="flex-1 text-xs text-amber-600" onClick={() => onEditClick('clock_out')}>
            퇴근하기
          </Button>
        ) : (
          <Button variant="outline" size="sm" className="flex-1 text-xs" disabled>
            퇴근완료
          </Button>
        )}

        <Button 
          variant="outline" 
          size="sm" 
          className="flex-1 text-xs"
          onClick={() => router.push(`/dashboard/attendance/${staff.id}/history`)}
        >
          근무 이력
        </Button>
      </div>
    </Card>
  )
}