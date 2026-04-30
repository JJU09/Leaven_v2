import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, isFuture, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns'
import { ko } from 'date-fns/locale'
import { DayAttendance, DayAttendanceStatus } from './staff-history-sidebar'
import { cn } from '@/lib/utils'

interface StaffHistoryCalendarProps {
  currentMonth: Date
  onPrevMonth: () => void
  onNextMonth: () => void
  monthlyData: Record<string, DayAttendance>
  selectedDay: string | null
  onSelectDay: (dateStr: string) => void
}

export function StaffHistoryCalendar({
  currentMonth,
  onPrevMonth,
  onNextMonth,
  monthlyData,
  selectedDay,
  onSelectDay
}: StaffHistoryCalendarProps) {
  
  // Create calendar grid
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 }) // Sunday start
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 })

  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate })
  
  const weekDays = ['일', '월', '화', '수', '목', '금', '토']

  const getStatusColor = (status?: DayAttendanceStatus) => {
    switch (status) {
      case 'present': return 'bg-green-500'
      case 'late': return 'bg-amber-400'
      case 'absent': return 'bg-red-400'
      case 'off': return 'bg-gray-300'
      default: return null
    }
  }

  const isNextDisabled = isSameMonth(currentMonth, new Date()) || isFuture(addMonths(currentMonth, 1))

  return (
    <Card className="p-4 flex flex-col">
      {/* Month Navigation */}
      <div className="flex justify-between items-center mb-4">
        <Button variant="outline" size="icon" onClick={onPrevMonth} className="h-8 w-8">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-base font-medium">
          {format(currentMonth, 'yyyy년 M월')}
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={onNextMonth}
          disabled={isNextDisabled}
          className="h-8 w-8"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Week Header */}
      <div className="grid grid-cols-7 mb-2">
        {weekDays.map((day, i) => (
          <div
            key={i}
            className={cn(
              "text-center text-xs font-medium text-muted-foreground py-1",
              i === 0 ? "text-red-500" : "",
              i === 6 ? "text-blue-500" : ""
            )}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1 flex-1">
        {calendarDays.map((date, i) => {
          const dateStr = format(date, 'yyyy-MM-dd')
          const isCurrentMonth = isSameMonth(date, currentMonth)
          const today = isSameDay(date, new Date())
          const isSelected = selectedDay === dateStr
          const dayData = monthlyData[dateStr]

          const hasData = dayData && dayData.status !== 'off'
          const dotColor = getStatusColor(dayData?.status)

          return (
            <div
              key={i}
              onClick={() => {
                if (isSelected) onSelectDay('') // toggle off
                else onSelectDay(dateStr)
              }}
              className={cn(
                "aspect-square flex flex-col items-center justify-center gap-1 rounded-md text-sm transition-colors relative",
                !isCurrentMonth ? "opacity-30" : "",
                hasData || dayData ? "hover:bg-muted cursor-pointer" : "",
                isSelected ? "bg-muted border border-border shadow-sm" : ""
              )}
            >
              <div className={cn(
                "flex items-center justify-center",
                today ? "w-7 h-7 rounded-full bg-green-600 text-white font-medium" : ""
              )}>
                {format(date, 'd')}
              </div>

              {/* Status Dot */}
              <div className="h-2 flex items-center justify-center">
                {dotColor && (
                  <div className={cn("w-2 h-2 rounded-full", dotColor)} />
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex gap-4 flex-wrap mt-4 pt-4 border-t justify-center">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-xs text-muted-foreground">정상 출근</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-amber-400" />
          <span className="text-xs text-muted-foreground">지각</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-red-400" />
          <span className="text-xs text-muted-foreground">결근</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-gray-300" />
          <span className="text-xs text-muted-foreground">휴무</span>
        </div>
      </div>
    </Card>
  )
}