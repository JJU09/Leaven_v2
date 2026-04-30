'use client'

import { useState, useEffect } from 'react'
import { getDailyAttendanceOverview } from '@/features/attendance/actions'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Users, PlayCircle, Clock, AlertCircle, CalendarIcon } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { cn } from '@/lib/utils'

import { StaffCard } from './staff-card'
import { StaffDetailPanel } from './staff-detail-panel'
import { AttendanceActionDialog } from './attendance-action-dialog'

interface AttendanceClientPageProps {
  storeId: string
  roles: any[]
  staffList: any[]
  canManageAttendance: boolean
  currentUserId: string
  initialDate: string
}

export function AttendanceClientPage({
  storeId,
  roles,
  staffList,
  canManageAttendance,
  currentUserId,
  initialDate
}: AttendanceClientPageProps) {
  const [selectedDate, setSelectedDate] = useState(initialDate)
  const [attendanceData, setAttendanceData] = useState<any[]>([])
  const [schedulesData, setSchedulesData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  // State for new UI
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null)

  // State for attendance action modal (individual)
  const [actionModalOpen, setActionModalOpen] = useState(false)
  const [actionType, setActionType] = useState<'clock_in' | 'clock_out' | 'edit'>('clock_in')
  const [actionStaff, setActionStaff] = useState<any>(null)
  const [actionAttendance, setActionAttendance] = useState<any>(null)

  const handleActionClick = (staff: any, att: any, type: 'clock_in' | 'clock_out' | 'edit') => {
    setActionStaff(staff)
    setActionAttendance(att)
    setActionType(type)
    setActionModalOpen(true)
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await getDailyAttendanceOverview(storeId, selectedDate, Date.now())
      setAttendanceData(res.attendance || [])
      setSchedulesData(res.schedules || [])
    } catch (error) {
      console.error(error)
      toast.error('출퇴근 데이터를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [storeId, selectedDate])

  const getStaffRoleInfo = (staff: any) => {
    if (staff?.role_info) return staff.role_info
    if (staff?.role) {
      const legacyRoleName = staff.role === 'owner' ? '점주' : staff.role === 'manager' ? '매니저' : '직원'
      const foundRole = roles?.find(r => r.name === legacyRoleName)
      if (foundRole) return foundRole
    }
    return null
  }

  const sortedStaffList = [...staffList]
    .map(staff => ({ ...staff, role_info: getStaffRoleInfo(staff) }))
    .sort((a, b) => {
      const priorityA = a.role_info?.hierarchy_level ?? -1
      const priorityB = b.role_info?.hierarchy_level ?? -1
      if (priorityB !== priorityA) return priorityB - priorityA
      return (a.name || a.profile?.full_name || '').localeCompare(b.name || b.profile?.full_name || '', 'ko')
    })

  // Calculate Metrics
  const now = new Date()
  const isToday = selectedDate === format(now, 'yyyy-MM-dd')
  
  let workingCount = 0
  let lateCount = 0
  let absentCount = 0

  sortedStaffList.forEach(staff => {
    const att = attendanceData.find(a => a.member_id === staff.id)
    const sch = schedulesData.find(s => s.member_id === staff.id && s.plan_date === selectedDate)

    if (att?.status === 'working') {
      workingCount++
    }

    if (sch && isToday && (!att || att.status === 'none')) {
      const schTime = new Date(`${sch.plan_date}T${sch.start_time}`).getTime()
      if (now.getTime() > schTime + (5 * 60 * 1000)) {
        lateCount++
      } else {
        absentCount++ // Not late yet, but hasn't arrived
      }
    } else if (sch && att) {
       const schTime = new Date(`${sch.plan_date}T${sch.start_time}`).getTime()
       const attTime = new Date(att.clock_in_time).getTime()
       if (attTime > schTime + (5 * 60 * 1000)) {
         lateCount++
       }
    }
  })

  return (
    <div className="space-y-6">
      {/* 1. 상단 바 (날짜 선택 DatePicker) */}
      <div className="flex items-center justify-end">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "justify-start text-left font-normal",
                !selectedDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {selectedDate ? (
                isToday ? (
                  `오늘 (${format(new Date(selectedDate), 'yyyy년 M월 d일')})`
                ) : (
                  format(new Date(selectedDate), 'yyyy년 M월 d일')
                )
              ) : (
                <span>날짜 선택</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={new Date(selectedDate)}
              onSelect={(date) => {
                if (date) setSelectedDate(format(date, 'yyyy-MM-dd'))
              }}
              disabled={(date) => date > new Date()}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* 2. 요약 지표 카드 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 직원</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{staffList.length}</div>
            <p className="text-xs text-muted-foreground mt-1">등록된 전체 직원</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">출근 중</CardTitle>
            <PlayCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{workingCount}</div>
            <p className="text-xs text-muted-foreground mt-1">현재 근무중인 인원</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">지각</CardTitle>
            <AlertCircle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lateCount}</div>
            <p className="text-xs text-muted-foreground mt-1">5분 이상 지각</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">미출근</CardTitle>
            <Clock className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{absentCount}</div>
            <p className="text-xs text-muted-foreground mt-1">출근 예정 인원</p>
          </CardContent>
        </Card>
      </div>

      {/* 3 & 4. 직원 목록 및 상세 패널 */}
      <div className="space-y-3">
        {loading ? (
           <div className="py-10 text-center text-muted-foreground animate-pulse">로딩 중...</div>
        ) : sortedStaffList.length === 0 ? (
           <div className="py-10 text-center text-muted-foreground bg-white rounded-xl border">등록된 직원이 없습니다.</div>
        ) : (
          sortedStaffList.map(staff => {
            const att = attendanceData.find(a => a.member_id === staff.id)
            const sch = schedulesData.find(s => s.member_id === staff.id && s.plan_date === selectedDate)
            const isSelected = selectedStaffId === staff.id

            return (
              <div key={staff.id} className="flex flex-col">
                <StaffCard 
                  staff={staff}
                  attendance={att}
                  schedule={sch}
                  isSelected={isSelected}
                  isToday={isToday}
                  onClick={() => setSelectedStaffId(isSelected ? null : staff.id)}
                />
                {isSelected && (
                  <StaffDetailPanel 
                    staff={staff}
                    attendance={att}
                    schedule={sch}
                    onEditClick={(type) => handleActionClick(staff, att, type)}
                  />
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Individual Attendance Action Dialog */}
      {actionStaff && (
        <AttendanceActionDialog
          isOpen={actionModalOpen}
          onOpenChange={setActionModalOpen}
          storeId={storeId}
          selectedDate={selectedDate}
          staff={actionStaff}
          attendance={actionAttendance}
          actionType={actionType}
          onSuccess={fetchData}
        />
      )}
    </div>
  )
}
