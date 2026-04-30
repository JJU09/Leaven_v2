'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { format, addMonths, subMonths, eachDayOfInterval, startOfMonth, endOfMonth, isSameDay } from 'date-fns'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getMonthlyAttendance } from '@/features/attendance/actions/history'
import { StaffHistorySidebar, DayAttendance } from '@/features/attendance/components/staff-history-sidebar'
import { StaffHistoryCalendar } from '@/features/attendance/components/staff-history-calendar'

interface HistoryClientPageProps {
  storeId: string
  staffId: string
}

export function HistoryClientPage({ storeId, staffId }: HistoryClientPageProps) {
  const router = useRouter()
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date())
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [data, setData] = useState<{ member: any, attendance: any[], schedules: any[] } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true)
      try {
        const monthDateStr = format(currentMonth, 'yyyy-MM-dd')
        const result = await getMonthlyAttendance(storeId, staffId, monthDateStr)
        setData(result)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    fetchHistory()
  }, [storeId, staffId, currentMonth])

  const handlePrevMonth = () => {
    setCurrentMonth(prev => subMonths(prev, 1))
    setSelectedDay(null)
  }
  const handleNextMonth = () => {
    setCurrentMonth(prev => addMonths(prev, 1))
    setSelectedDay(null)
  }

  if (loading && !data) {
    return <div className="py-10 text-center animate-pulse text-muted-foreground">데이터를 불러오는 중입니다...</div>
  }

  // Transform data into Record<string, DayAttendance>
  const monthlyData: Record<string, DayAttendance> = {}
  
  if (data) {
    const daysInMonth = eachDayOfInterval({
      start: startOfMonth(currentMonth),
      end: endOfMonth(currentMonth)
    })

    daysInMonth.forEach(date => {
      const dateStr = format(date, 'yyyy-MM-dd')
      const att = data.attendance.find(a => a.target_date === dateStr)
      const sch = data.schedules.find(s => s.plan_date === dateStr)

      let status: DayAttendance['status'] = 'off'
      let inTime = att?.clock_in_time || null
      let outTime = att?.clock_out_time || null
      let worked_minutes = null

      if (inTime && outTime) {
        status = 'present'
        const start = new Date(inTime).getTime()
        const end = new Date(outTime).getTime()
        const diffMinutes = Math.max(0, Math.round((end - start) / 60000))
        // 24시간(1440분)을 초과하는 비정상적인 기록은 24시간으로 제한
        worked_minutes = Math.min(1440, diffMinutes)
      }

      if (sch && !att && date < new Date() && !isSameDay(date, new Date())) {
         status = 'absent'
      } else if (sch && att) {
         const schTime = new Date(`${sch.plan_date}T${sch.start_time}`).getTime()
         const attTime = new Date(att.clock_in_time).getTime()
         if (attTime > schTime + (5 * 60 * 1000)) {
           status = 'late'
         }
      }

      monthlyData[dateStr] = {
        date: dateStr,
        status,
        schedule_start_time: sch?.start_time || null,
        schedule_end_time: sch?.end_time || null,
        clock_in_time: inTime,
        clock_out_time: outTime,
        worked_minutes
      }
    })
  }

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" onClick={() => router.back()} className="h-8 w-8">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <span className="text-base text-muted-foreground font-medium">근무 이력</span>
      </div>

      {/* Main Split Layout */}
      <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] lg:grid-cols-[340px_1fr] gap-6 items-start">
        {/* Left Column */}
        <StaffHistorySidebar 
          member={data?.member}
          monthlyData={monthlyData}
          selectedDay={selectedDay}
        />

        {/* Right Column */}
        <StaffHistoryCalendar 
          currentMonth={currentMonth}
          onPrevMonth={handlePrevMonth}
          onNextMonth={handleNextMonth}
          monthlyData={monthlyData}
          selectedDay={selectedDay}
          onSelectDay={setSelectedDay}
        />
      </div>
    </div>
  )
}
