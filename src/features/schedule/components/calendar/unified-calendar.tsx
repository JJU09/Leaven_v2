'use client'

import React, { useState, useMemo, useEffect, useRef } from 'react'
import { format, startOfWeek, addDays, isSameDay } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { updateTaskStatus } from '@/features/schedule/task-actions'
import { updateScheduleTime, updateSchedule } from '@/features/schedule/actions'
import { toast } from 'sonner'
import { getDiffInMinutes } from '@/shared/lib/date-utils'
import { ScheduleDetailPanel } from './schedule-detail-panel'
import { UnifiedAutoScheduleDialog } from './unified-auto-schedule-dialog'
import { UnifiedBulkDeleteDialog } from './unified-bulk-delete-dialog'
import { CalendarHeader } from './calendar-header'
import { SingleDayDeleteModal, ConfirmMoveModal } from './schedule-action-modals'
import { StaffScheduleMatrix } from './staff-schedule-matrix'
import { MonthlyCalendarView } from './monthly-calendar-view'
import { DailyTimelineView } from './daily-timeline-view'
import { useRouter } from 'next/navigation'

// 유틸리티: 색상 변환
function hexToRgba(hex: string, alpha: number) {
  if (!hex) return `rgba(0,0,0,${alpha})`
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

interface UnifiedCalendarProps {
  storeId: string
  roles: any[]
  staffList?: any[]
  schedules?: any[]
  storeOpeningHours?: any
  approvedLeaves?: any[]
  canManage?: boolean
  currentUserId?: string
}

export function UnifiedCalendar({ 
  storeId, 
  roles, 
  staffList = [], 
  schedules = [], 
  storeOpeningHours, 
  approvedLeaves = [],
  canManage = true,
  currentUserId
}: UnifiedCalendarProps) {
  const [viewMode, setViewMode] = useState<'timeline' | 'matrix' | 'calendar'>('matrix')
  
  const [timelineDate, setTimelineDate] = useState<Date>(new Date())
  const [matrixStartDate, setMatrixStartDate] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 0 }))
  const [calendarDate, setCalendarDate] = useState<Date>(new Date())

  // 모달/패널 상태
  const [selectedSchedule, setSelectedSchedule] = useState<any>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isAutoScheduleModalOpen, setIsAutoScheduleModalOpen] = useState(false)
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false)
  const [confirmMoveModal, setConfirmMoveModal] = useState<{
    isOpen: boolean;
    scheduleId: string;
    newStartUTC: string;
    newEndUTC: string;
    deltaMinutes: number;
  } | null>(null)

  const [singleDayDeleteModal, setSingleDayDeleteModal] = useState<{
    isOpen: boolean;
    staffId: string;
    staffName: string;
    date: Date;
  } | null>(null)

  const [createForm, setCreateForm] = useState({
    title: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    startTime: '09:00',
    endTime: '18:00',
    staffId: '',
    scheduleType: 'regular' as 'regular' | 'leave' | 'training' | 'etc'
  })
  
  // 검색창 포커스 상태
  const [isSearchFocused, setIsSearchFocused] = useState(false)

  const [localSchedules, setLocalSchedules] = useState<any[]>([])
  
  const router = useRouter()

  // 스케줄 상태 전역 동기화
  useEffect(() => {
    const handleScheduleUpdate = () => {
      // 캘린더나 상세 패널 등에서 전체 데이터를 새로고침해야 할 때 호출
      // 서버에서 새 데이터를 불러오도록 라우터 리프레시 실행
      router.refresh()
    }
    
    window.addEventListener('schedule-updated', handleScheduleUpdate)
    return () => {
      window.removeEventListener('schedule-updated', handleScheduleUpdate)
    }
  }, [router])

  // 실시간 현재 시간 상태 (타임라인 지시선용)
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000) // 1분마다 업데이트
    return () => clearInterval(timer)
  }, [])

  // 역할(Role) 필터링 상태 (기본값: 모든 역할 선택됨)
  const [activeRoleIds, setActiveRoleIds] = useState<string[]>([])
  useEffect(() => {
    if (roles && roles.length > 0 && activeRoleIds.length === 0) {
      setActiveRoleIds(roles.map(r => r.id))
    }
  }, [roles])

  const toggleRole = (roleId: string) => {
    setActiveRoleIds(prev => {
      // 이미 모든 역할이 선택된 상태에서 하나를 클릭하면, 그 하나만 선택되도록 (독점 선택 편의성)
      if (prev.length === roles.length) {
        return [roleId]
      }
      
      const next = prev.includes(roleId) ? prev.filter(id => id !== roleId) : [...prev, roleId]
      // 모두 해제되면 다시 전체 선택으로 복구
      return next.length === 0 ? roles.map(r => r.id) : next
    })
  }

  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    // 관리자가 아니거나, 관리자라도 모바일이면 본인의 스케줄만 필터링
    // 서버에서 받아온 schedules가 변경될 때마다 로컬 상태를 업데이트합니다.
    // 기존에 진행 중이던 낙관적 업데이트를 덮어쓰지 않도록 주의해야 하지만, 
    // 생성/수정 직후 router.refresh()로 서버 데이터가 새로 들어오면 그것으로 동기화합니다.
    if ((!canManage || isMobile) && currentUserId) {
      const myStaffId = staffList.find(s => s.user_id === currentUserId)?.id
      if (myStaffId) {
        setLocalSchedules((schedules || []).filter(sch => 
          sch.member_id === myStaffId
        ))
      } else {
        setLocalSchedules([])
      }
    } else {
      setLocalSchedules(schedules || [])
    }

    // 서버에서 schedules가 최신화되었을 때, 현재 열려있는 스케줄 모달이 있다면 그 내용도 최신 데이터로 동기화합니다.
    if (selectedSchedule && schedules) {
      const updatedSch = schedules.find(s => s.id === selectedSchedule.id)
      if (updatedSch) {
        setSelectedSchedule((prev: any) => ({
          ...prev,
          tasks: updatedSch.tasks
        }))
      }
    }
  }, [schedules, canManage, currentUserId, staffList, isMobile])

  // 중복 스케줄 검사 유틸리티
  const checkOverlap = (staffId: string, newStart: Date, newEnd: Date, excludeScheduleId?: string) => {
    return localSchedules.some(sch => {
      if (excludeScheduleId && sch.id === excludeScheduleId) return false;
      if (sch.member_id !== staffId) return false;
      
      const schStart = new Date(sch.start_time);
      const schEnd = new Date(sch.end_time);
      
      // 날짜가 다르면 패스
      if (!isSameDay(schStart, newStart)) return false;

      // 겹침 조건: 새 시작시간이 기존 종료시간 전이고, 새 종료시간이 기존 시작시간 후일 때
      return newStart < schEnd && newEnd > schStart;
    });
  }

  const localSchedulesRef = useRef(localSchedules)
  
  useEffect(() => {
    localSchedulesRef.current = localSchedules
  }, [localSchedules])

  const processScheduleUpdate = (scheduleId: string, newStartUTC: string, newEndUTC: string, moveTasks: boolean, deltaMinutes: number = 0) => {
    // API 호출
    updateScheduleTime(storeId, scheduleId, newStartUTC, newEndUTC, moveTasks)
      .then((res) => {
        if (res.error) toast.error(res.error)
      })
      .catch(() => toast.error('네트워크 오류가 발생했습니다.'))
      
    toast.success(`일정 시간이 변경되었습니다.`)
    
    // 로컬 상태 업데이트
    setLocalSchedules(prev => prev.map(s => {
      if (s.id === scheduleId) {
        let updatedTasks = s.tasks;
        
          if (moveTasks && updatedTasks && deltaMinutes !== 0) {
            updatedTasks = updatedTasks.map((t: any) => {
              if (!t.start_time) return t;
              
              const tStart = new Date(t.start_time)
              tStart.setMinutes(tStart.getMinutes() + deltaMinutes)
              
              const tzOffset = tStart.getTimezoneOffset() * 60000;
              const localISOStart = new Date(tStart.getTime() - tzOffset).toISOString().slice(0, 19);
              const updates: any = { start_time: localISOStart }
              
              if (t.end_time) {
                const tEnd = new Date(t.end_time)
                tEnd.setMinutes(tEnd.getMinutes() + deltaMinutes)
                const localISOEnd = new Date(tEnd.getTime() - tzOffset).toISOString().slice(0, 19);
                updates.end_time = localISOEnd
              }

              return {
              ...t,
              ...updates
            }
          })
        }

        return {
          ...s,
          start_time: newStartUTC,
          end_time: newEndUTC,
          tasks: updatedTasks
        }
      }
      return s
    }))
    
    // 선택된 스케줄이 이동된 경우, 우측 패널 시간도 동기화
    setSelectedSchedule((prev: any) => {
      if (prev && prev.id === scheduleId) {
        const start = new Date(newStartUTC)
        const end = new Date(newEndUTC)
        
        const startHour = start.getHours() + start.getMinutes() / 60
        let endHour = end.getHours() + end.getMinutes() / 60
        if (endHour <= startHour || end.getDate() !== start.getDate()) {
          endHour += 24
        }
        
        let updatedTasks = prev.tasks;
        if (moveTasks && updatedTasks && deltaMinutes !== 0) {
          updatedTasks = updatedTasks.map((t: any) => {
            if (!t.start_time) return t;
            const tStart = new Date(t.start_time)
            tStart.setMinutes(tStart.getMinutes() + deltaMinutes)
            const tzOffset = tStart.getTimezoneOffset() * 60000;
            const localISOStart = new Date(tStart.getTime() - tzOffset).toISOString().slice(0, 19);
            const updates: any = { start_time: localISOStart }
            
            if (t.end_time) {
              const tEnd = new Date(t.end_time)
              tEnd.setMinutes(tEnd.getMinutes() + deltaMinutes)
              const localISOEnd = new Date(tEnd.getTime() - tzOffset).toISOString().slice(0, 19);
              updates.end_time = localISOEnd
            }
            return {
              ...t,
              ...updates
            }
          })
        }

        return {
          ...prev,
          start_time: newStartUTC,
          end_time: newEndUTC,
          displayTime: `${format(start, 'HH:mm')} - ${format(end, 'HH:mm')} (${(endHour - startHour).toFixed(1)}시간)`,
          editDate: format(start, 'yyyy-MM-dd'),
          editStartTime: format(start, 'HH:mm'),
          editEndTime: format(end, 'HH:mm'),
          tasks: updatedTasks
        }
      }
      return prev
    })
  }

  // 직원 객체의 역할 정보를 확실하게 찾아주는 헬퍼
  const getStaffRoleInfo = (staff: any) => {
    if (staff?.role_info) return staff.role_info
    return null
  }

  const handleScheduleClick = (sch: any, staffData: any) => {
    const start = new Date(sch.start_time)
    const end = new Date(sch.end_time)
    
    const startHour = start.getHours() + start.getMinutes() / 60
    let endHour = end.getHours() + end.getMinutes() / 60
    
    // 종료 시간이 시작 시간보다 작거나, 날짜가 다음 날이면 +24시간 (자정 넘김)
    if (endHour <= startHour || end.getDate() !== start.getDate()) {
      endHour += 24
    }
    
    const member = sch.member
    const roleInfo = getStaffRoleInfo(staffData)
    const roleColor = roleInfo?.color || '#534AB7'

    setSelectedSchedule({
      ...sch,
      displayDate: format(start, 'yyyy년 M월 d일 (E)', { locale: ko }),
      displayTime: `${format(start, 'HH:mm')} - ${format(end, 'HH:mm')} (${(endHour - startHour).toFixed(1)}시간)`,
      displayName: staffData?.name || member?.name || '직원',
      displayRole: roleInfo?.name || '역할 없음',
      roleId: roleInfo?.id,
      roleColor: roleColor,
      
      // Edit form fields
      editStaffId: sch.member_id || staffData?.id,
      editDate: format(start, 'yyyy-MM-dd'),
      editStartTime: format(start, 'HH:mm'),
      editEndTime: format(end, 'HH:mm'),
      scheduleType: sch.schedule_type || 'regular'
    })
  }

  const [searchQuery, setSearchQuery] = useState('')

  // 데이터 필터링 (이름 검색 + 역할 필터링만 적용, 뷰 모드에 따른 스케줄 유무 필터링 제거)
  const filteredStaff = useMemo(() => {
    let filtered = staffList

    // 관리자가 아니거나, 관리자라도 모바일이면 본인만 보이도록 필터링
    if ((!canManage || isMobile) && currentUserId) {
      filtered = filtered.filter(s => s.user_id === currentUserId)
      return filtered
    }

    // 2. 이름 검색 필터링
    if (searchQuery.trim()) {
      filtered = filtered.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
    }
    
    // 3. 역할 필터링
    if (activeRoleIds.length > 0) {
      filtered = filtered.filter(staff => {
        const roleInfo = getStaffRoleInfo(staff)
        // roleInfo가 없거나 매칭되는 role.id가 activeRoleIds에 포함되어 있으면 표시
        if (!roleInfo) return true
        return activeRoleIds.includes(roleInfo.id)
      })
    }
    
    return filtered
  }, [staffList, searchQuery, localSchedules, activeRoleIds])

  // Get dynamic hours from storeOpeningHours
  const hours = useMemo(() => {
    let minHour = 0;
    let maxHour = 24;
    
    if (storeOpeningHours) {
      let earliest = 24;
      let latest = 0;
      
      const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
      let foundAny = false;
      
      days.forEach(day => {
        const data = storeOpeningHours[day];
        if (data && !data.closed) {
          foundAny = true;
          // open / start_time
          const openTime = data.start_time || data.open || '09:00';
          const [oH] = openTime.split(':').map(Number);
          if (oH < earliest) earliest = oH;
          
          // close / end_time
          const closeTime = data.end_time || data.close || '22:00';
          let [cH] = closeTime.split(':').map(Number);
          // if close time is smaller than open time, it means next day
          if (cH <= oH) cH += 24;
          if (cH > latest) latest = cH;
        }
      });
      
      if (foundAny) {
        minHour = 0; // 항상 00:00부터 시작
        maxHour = Math.max(24, latest); // 기본 24시, 새벽 마감이면 그 이상
      }
    }
    
    return Array.from({ length: maxHour - minHour + 1 }, (_, i) => i + minHour);
  }, [storeOpeningHours]);

  return (
    <div className="flex flex-col h-full text-[#1a1a1a]" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      
      {/* 1. 상단 컨트롤 영역 (검색, 필터, 뷰 토글 등 전역 컨트롤) */}
      <CalendarHeader
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        isSearchFocused={isSearchFocused}
        setIsSearchFocused={setIsSearchFocused}
        filteredStaff={filteredStaff}
        getStaffRoleInfo={getStaffRoleInfo}
        hexToRgba={hexToRgba}
        viewMode={viewMode}
        setViewMode={setViewMode}
        timelineDate={timelineDate}
        setTimelineDate={setTimelineDate}
        matrixStartDate={matrixStartDate}
        setMatrixStartDate={setMatrixStartDate}
        calendarDate={calendarDate}
        setCalendarDate={setCalendarDate}
        roles={roles}
        activeRoleIds={activeRoleIds}
        toggleRole={toggleRole}
        onAutoSchedule={() => setIsAutoScheduleModalOpen(true)}
        onBulkDelete={() => setIsBulkDeleteModalOpen(true)}
        canManage={canManage}
      />

      {/* Main Layout (Matrix or Calendar) */}
      <div className="flex-1 flex gap-4 px-6 pt-4 pb-6 overflow-hidden min-h-0">
        
        {/* Main View Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          
          {viewMode === 'timeline' ? (
            <DailyTimelineView
              currentDate={timelineDate}
              staffList={filteredStaff}
              localSchedules={localSchedules}
              activeRoleIds={activeRoleIds}
              getStaffRoleInfo={getStaffRoleInfo}
              approvedLeaves={approvedLeaves}
              canManage={canManage}
              hours={hours}
              onCellClick={(staff, date, hour) => {
                if (!canManage || isMobile) return;
                const displayHour = Math.floor(hour) >= 24 ? Math.floor(hour) - 24 : Math.floor(hour);
                const startStr = `${displayHour.toString().padStart(2, '0')}:00`;
                const endHour = displayHour + 1;
                const endStr = `${endHour.toString().padStart(2, '0')}:00`;
                
                setCreateForm({
                  title: '근무',
                  date: format(date, 'yyyy-MM-dd'),
                  startTime: startStr,
                  endTime: endStr,
                  staffId: staff.id,
                  scheduleType: 'regular'
                })
                setIsCreateModalOpen(true)
              }}
              onScheduleClick={(sch, staff) => {
                if (!canManage || isMobile) return;
                handleScheduleClick(sch, staff)
              }}
              onScheduleCreateDrag={(staffId, date, startStr, endStr) => {
                if (!canManage || isMobile) return;
                setCreateForm({
                  title: '근무',
                  date: format(date, 'yyyy-MM-dd'),
                  startTime: startStr,
                  endTime: endStr,
                  staffId: staffId,
                  scheduleType: 'regular'
                })
                setIsCreateModalOpen(true)
              }}
              onScheduleUpdateDrag={(scheduleId, date, startStr, endStr) => {
                if (!canManage || isMobile) return;
                const sch = localSchedulesRef.current.find(s => s.id === scheduleId)
                if (!sch) return;

                const dateStr = format(date, 'yyyy-MM-dd')
                const newStartLocal = `${dateStr}T${startStr}:00`
                const newEndLocal = `${dateStr}T${endStr}:00`

                // 기존과 동일하면 스킵
                if (sch.start_time === newStartLocal && sch.end_time === newEndLocal) return;

                // 겹침 체크
                const startUtcDate = new Date(newStartLocal)
                const endUtcDate = new Date(newEndLocal)
                const staffId = sch.schedule_members?.[0]?.member_id;
                
                const isOverlap = localSchedulesRef.current.some(s => {
                  if (s.id === sch.id) return false;
                  const hasMember = s.schedule_members?.some((sm: any) => sm.member_id === staffId);
                  if (!hasMember) return false;
                  if (!isSameDay(new Date(s.start_time), startUtcDate)) return false;
                  return startUtcDate < new Date(s.end_time) && endUtcDate > new Date(s.start_time);
                });

                if (staffId && isOverlap) {
                  toast.error('해당 시간대에 이미 스케줄이 존재합니다.')
                  return
                }

                const deltaMinutes = getDiffInMinutes(sch.start_time, newStartLocal)
                const hasTimeSpecificTasks = sch.tasks?.some((ta: any) => ta.start_time)
                
                if (hasTimeSpecificTasks) {
                  setConfirmMoveModal({
                    isOpen: true,
                    scheduleId: sch.id,
                    newStartUTC: newStartLocal,
                    newEndUTC: newEndLocal,
                    deltaMinutes
                  })
                } else {
                  processScheduleUpdate(sch.id, newStartLocal, newEndLocal, false, deltaMinutes)
                }
              }}
            />
          ) : viewMode === 'matrix' ? (
            <StaffScheduleMatrix 
              startDate={matrixStartDate}
              daysCount={7}
              staffList={filteredStaff}
              localSchedules={localSchedules}
              activeRoleIds={activeRoleIds}
              getStaffRoleInfo={getStaffRoleInfo}
              approvedLeaves={approvedLeaves}
              canManage={canManage}
              onCellClick={(staff, date) => {
                if (!canManage || isMobile) return;
                setCreateForm({
                  title: '근무',
                  date: format(date, 'yyyy-MM-dd'),
                  startTime: '09:00',
                  endTime: '18:00',
                  staffId: staff.id,
                  scheduleType: 'regular'
                })
                setIsCreateModalOpen(true)
              }}
              onScheduleClick={(sch, staff) => {
                if (!canManage || isMobile) return;
                handleScheduleClick(sch, staff)
              }}
              onHeaderDateClick={(date) => {
                setTimelineDate(date)
                setViewMode('timeline')
              }}
              onScheduleDrop={async (scheduleId: string, sourceStaffId: string, targetStaffId: string, targetDate: Date) => {
                if (!canManage || isMobile) return;
                
                const sch = localSchedulesRef.current.find(s => s.id === scheduleId)
                if (!sch) return

                const startObj = new Date(sch.start_time)
                const endObj = new Date(sch.end_time)
                
                const oldDateStr = format(startObj, 'yyyy-MM-dd')
                const newDateStr = format(targetDate, 'yyyy-MM-dd')
                
                if (oldDateStr === newDateStr && sourceStaffId === targetStaffId) {
                  return // 변경된 것이 없음
                }

                // 새로운 시작/종료 시간 계산 (로컬 KST 기준)
                const startTimeStr = format(startObj, 'HH:mm:ss')
                const endTimeStr = format(endObj, 'HH:mm:ss')
                
                const newStartLocal = `${newDateStr}T${startTimeStr}`
                let newEndLocal = `${newDateStr}T${endTimeStr}`
                
                // 종료 시간이 시작 시간보다 작다면 (자정을 넘긴 경우)
                if (endTimeStr < startTimeStr) {
                  const nextDateStr = format(addDays(targetDate, 1), 'yyyy-MM-dd')
                  newEndLocal = `${nextDateStr}T${endTimeStr}`
                }

                // 오버랩 체크 (같은 직원, 같은 날짜일 경우 겹치는 스케줄 있는지 확인)
                const startUtcDate = new Date(newStartLocal)
                const endUtcDate = new Date(newEndLocal)
                
                const isOverlap = localSchedulesRef.current.some(s => {
                  if (s.id === sch.id) return false;
                  const hasMember = s.schedule_members?.some((sm: any) => sm.member_id === targetStaffId);
                  if (!hasMember) return false;
                  if (!isSameDay(new Date(s.start_time), startUtcDate)) return false;
                  return startUtcDate < new Date(s.end_time) && endUtcDate > new Date(s.start_time);
                });

                if (isOverlap) {
                  toast.error('해당 시간대에 이미 스케줄이 존재합니다.')
                  return
                }

                const loadingToast = toast.loading('스케줄을 이동 중입니다...')
                
                const targetStaff = staffList.find(st => st.id === targetStaffId)
                const targetRoleInfo = targetStaff ? getStaffRoleInfo(targetStaff) : null

                try {
                  const formData = new FormData()
                  formData.append('userIds', JSON.stringify([targetStaffId]))
                  formData.append('date', newDateStr)
                  formData.append('startTime', format(startObj, 'HH:mm'))
                  formData.append('endTime', format(endObj, 'HH:mm'))
                  formData.append('schedule_type', sch.schedule_type || 'regular')

                  
                  // 기존 상태 백업
                  const previousSchedules = [...localSchedulesRef.current]

                  // 로컬 상태 낙관적 업데이트
                  setLocalSchedules(prev => prev.map(s => {
                    if (s.id === sch.id) {
                      // 하위 태스크의 시간과 날짜도 계산해서 밀어줌 (낙관적 업데이트용)
                      let updatedTasks = s.tasks;
                      const oldDateStr = format(startObj, 'yyyy-MM-dd')
                      const deltaMs = targetDate.getTime() - new Date(oldDateStr).getTime()
                      const deltaMinutes = Math.round(deltaMs / 60000)

                      if (updatedTasks && updatedTasks.length > 0) {
                         updatedTasks = updatedTasks.map((t: any) => {
                            // 날짜 및 직원 ID(user_id) 갱신
                            const updatedTask = { 
                               ...t, 
                               assigned_date: newDateStr,
                               user_id: targetStaff?.user_id || t.user_id 
                            }
                            
                            if (!t.start_time || deltaMinutes === 0) {
                               return updatedTask
                            }
                            
                            // 시간 이동 적용
                            const tStart = new Date(t.start_time)
                            tStart.setMinutes(tStart.getMinutes() + deltaMinutes)
                            const tzOffset = tStart.getTimezoneOffset() * 60000;
                            const localISOStart = new Date(tStart.getTime() - tzOffset).toISOString().slice(0, 19);
                            const updates: any = { start_time: localISOStart }
                            
                            if (t.end_time) {
                              const tEnd = new Date(t.end_time)
                              tEnd.setMinutes(tEnd.getMinutes() + deltaMinutes)
                              const localISOEnd = new Date(tEnd.getTime() - tzOffset).toISOString().slice(0, 19);
                              updates.end_time = localISOEnd
                            }
                            
                            return {
                              ...updatedTask,
                              ...updates
                            }
                         })
                      }

                      return {
                        ...s,
                        start_time: newStartLocal,
                        end_time: newEndLocal,
                        schedule_members: [{
                          member_id: targetStaffId,
                          member: staffList.find(st => st.id === targetStaffId)
                        }],
                        tasks: updatedTasks
                      }
                    }
                    return s
                  }))

                  const result = await updateSchedule(storeId, sch.id, formData)
                  if (result.error) {
                    // 에러 발생 시 원래 상태로 롤백
                    setLocalSchedules(previousSchedules)
                    toast.error(result.error, { id: loadingToast })
                    return
                  }

                  toast.success('스케줄이 이동되었습니다.', { id: loadingToast })

                } catch (error) {
                  // 원래 상태로 롤백 (catch 블록에서는 이전 상태를 가져올 방법이 제한적이므로 바로 위의 previousSchedules 사용)
                  setLocalSchedules(localSchedulesRef.current) 
                  toast.error('스케줄 이동에 실패했습니다.', { id: loadingToast })
                }
              }}
            />
          ) : (
            <MonthlyCalendarView 
              currentDate={calendarDate}
              staffList={filteredStaff}
              localSchedules={localSchedules}
              activeRoleIds={activeRoleIds}
              getStaffRoleInfo={getStaffRoleInfo}
              approvedLeaves={approvedLeaves}
              canManage={canManage}
              onDateClick={(date) => {
                if (!canManage || isMobile) return;
                setCreateForm({
                  title: '근무',
                  date: format(date, 'yyyy-MM-dd'),
                  startTime: '09:00',
                  endTime: '18:00',
                  staffId: '',
                  scheduleType: 'regular'
                })
                setIsCreateModalOpen(true)
              }}
              onScheduleClick={(sch, staff) => {
                if (!canManage || isMobile) return;
                handleScheduleClick(sch, staff)
              }}
              onScheduleDrop={async (scheduleId: string, sourceStaffId: string, targetStaffId: string, targetDate: Date) => {
                if (!canManage || isMobile) return;
                
                const sch = localSchedulesRef.current.find(s => s.id === scheduleId)
                if (!sch) return

                const startObj = new Date(sch.start_time)
                const endObj = new Date(sch.end_time)
                
                const oldDateStr = format(startObj, 'yyyy-MM-dd')
                const newDateStr = format(targetDate, 'yyyy-MM-dd')
                
                if (oldDateStr === newDateStr && sourceStaffId === targetStaffId) {
                  return // 변경된 것이 없음
                }

                // 새로운 시작/종료 시간 계산 (로컬 KST 기준)
                const startTimeStr = format(startObj, 'HH:mm:ss')
                const endTimeStr = format(endObj, 'HH:mm:ss')
                
                const newStartLocal = `${newDateStr}T${startTimeStr}`
                let newEndLocal = `${newDateStr}T${endTimeStr}`
                
                // 종료 시간이 시작 시간보다 작다면 (자정을 넘긴 경우)
                if (endTimeStr < startTimeStr) {
                  const nextDateStr = format(addDays(targetDate, 1), 'yyyy-MM-dd')
                  newEndLocal = `${nextDateStr}T${endTimeStr}`
                }

                // 오버랩 체크 (같은 직원, 같은 날짜일 경우 겹치는 스케줄 있는지 확인)
                const startUtcDate = new Date(newStartLocal)
                const endUtcDate = new Date(newEndLocal)
                
                const isOverlap = localSchedulesRef.current.some(s => {
                  if (s.id === sch.id) return false;
                  const hasMember = s.schedule_members?.some((sm: any) => sm.member_id === targetStaffId);
                  if (!hasMember) return false;
                  if (!isSameDay(new Date(s.start_time), startUtcDate)) return false;
                  return startUtcDate < new Date(s.end_time) && endUtcDate > new Date(s.start_time);
                });

                if (isOverlap) {
                  toast.error('해당 시간대에 이미 스케줄이 존재합니다.')
                  return
                }

                const loadingToast = toast.loading('스케줄을 이동 중입니다...')
                
                const targetStaff = staffList.find(st => st.id === targetStaffId)

                try {
                  const formData = new FormData()
                  formData.append('userIds', JSON.stringify([targetStaffId]))
                  formData.append('date', newDateStr)
                  formData.append('startTime', format(startObj, 'HH:mm'))
                  formData.append('endTime', format(endObj, 'HH:mm'))
                  formData.append('schedule_type', sch.schedule_type || 'regular')
                  formData.append('endTime', format(endObj, 'HH:mm'))
                  formData.append('schedule_type', sch.schedule_type || 'regular')

                  // 기존 상태 백업
                  const previousSchedules = [...localSchedulesRef.current]

                  // 로컬 상태 낙관적 업데이트
                  setLocalSchedules(prev => prev.map(s => {
                    if (s.id === sch.id) {
                      // 하위 태스크의 시간과 날짜도 계산해서 밀어줌 (낙관적 업데이트용)
                      let updatedTasks = s.tasks;
                      const oldDateStr = format(startObj, 'yyyy-MM-dd')
                      const deltaMs = targetDate.getTime() - new Date(oldDateStr).getTime()
                      const deltaMinutes = Math.round(deltaMs / 60000)

                      if (updatedTasks && updatedTasks.length > 0) {
                         updatedTasks = updatedTasks.map((t: any) => {
                            // 날짜 및 직원 ID(user_id) 갱신
                            const updatedTask = { 
                               ...t, 
                               assigned_date: newDateStr,
                               user_id: targetStaff?.user_id || t.user_id 
                            }
                            
                            if (!t.start_time || deltaMinutes === 0) {
                               return updatedTask
                            }
                            
                            // 시간 이동 적용
                            const tStart = new Date(t.start_time)
                            tStart.setMinutes(tStart.getMinutes() + deltaMinutes)
                            const tzOffset = tStart.getTimezoneOffset() * 60000;
                            const localISOStart = new Date(tStart.getTime() - tzOffset).toISOString().slice(0, 19);
                            const updates: any = { start_time: localISOStart }
                            
                            if (t.end_time) {
                              const tEnd = new Date(t.end_time)
                              tEnd.setMinutes(tEnd.getMinutes() + deltaMinutes)
                              const localISOEnd = new Date(tEnd.getTime() - tzOffset).toISOString().slice(0, 19);
                              updates.end_time = localISOEnd
                            }
                            
                            return {
                              ...updatedTask,
                              ...updates
                            }
                         })
                      }

                      return {
                        ...s,
                        start_time: newStartLocal,
                        end_time: newEndLocal,
                        schedule_members: [{
                          member_id: targetStaffId,
                          member: staffList.find(st => st.id === targetStaffId)
                        }],
                        tasks: updatedTasks
                      }
                    }
                    return s
                  }))

                  const updateResult = await updateSchedule(storeId, sch.id, formData)
                  if (updateResult.error) {
                     // 에러 발생 시 원래 상태로 롤백
                    setLocalSchedules(previousSchedules)
                    toast.error(updateResult.error, { id: loadingToast })
                    return
                  }

                  toast.success('스케줄이 이동되었습니다.', { id: loadingToast })

                } catch (error) {
                  // 원래 상태로 롤백
                  setLocalSchedules(localSchedulesRef.current)
                  toast.error('스케줄 이동에 실패했습니다.', { id: loadingToast })
                }
              }}
            />
          )}
        </div>

      </div>

      {/* 상세 일정 및 수정/추가 통합 모달 */}
      <Dialog 
        open={!!selectedSchedule || isCreateModalOpen} 
        onOpenChange={(open) => {
          if (!open) {
            setSelectedSchedule(null)
            setIsCreateModalOpen(false)
          }
        }}
      >
        <DialogContent className={`p-0 gap-0 outline-none border-black/10 shadow-lg overflow-hidden ${isCreateModalOpen ? 'sm:max-w-[420px]' : 'sm:max-w-[750px]'}`} aria-describedby={undefined}>
          <DialogTitle className="sr-only">{isCreateModalOpen ? '일정 추가' : '일정 상세'}</DialogTitle>
          {(selectedSchedule || isCreateModalOpen) && (
            <ScheduleDetailPanel
              mode={isCreateModalOpen ? 'create' : 'edit'}
              storeId={storeId}
              selectedSchedule={selectedSchedule}
              setSelectedSchedule={setSelectedSchedule}
              staffList={staffList}
              setLocalSchedules={setLocalSchedules}
              localSchedules={localSchedules}
              approvedLeaves={approvedLeaves}
              createForm={createForm}
              setCreateForm={setCreateForm}
              checkOverlap={checkOverlap}
              onClose={() => {
                setSelectedSchedule(null)
                setIsCreateModalOpen(false)
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Auto Schedule Modal */}
      <UnifiedAutoScheduleDialog
        open={isAutoScheduleModalOpen}
        onOpenChange={setIsAutoScheduleModalOpen}
        storeId={storeId}
        staffList={staffList}
      />

      {/* Bulk Delete Modal */}
      <UnifiedBulkDeleteDialog
        open={isBulkDeleteModalOpen}
        onOpenChange={setIsBulkDeleteModalOpen}
        storeId={storeId}
        staffList={staffList}
      />

      {/* Single Day Staff Schedule Delete Dialog */}
      {singleDayDeleteModal && (
        <SingleDayDeleteModal
          isOpen={singleDayDeleteModal.isOpen}
          staffId={singleDayDeleteModal.staffId}
          staffName={singleDayDeleteModal.staffName}
          date={singleDayDeleteModal.date}
          storeId={storeId}
          onClose={() => setSingleDayDeleteModal(null)}
        />
      )}

      {/* Confirm Task Move Dialog */}
      {confirmMoveModal && (
        <ConfirmMoveModal
          isOpen={confirmMoveModal.isOpen}
          scheduleId={confirmMoveModal.scheduleId}
          newStartUTC={confirmMoveModal.newStartUTC}
          newEndUTC={confirmMoveModal.newEndUTC}
          deltaMinutes={confirmMoveModal.deltaMinutes}
          onClose={() => setConfirmMoveModal(null)}
          onConfirm={(moveTasks) => {
            processScheduleUpdate(
              confirmMoveModal.scheduleId,
              confirmMoveModal.newStartUTC,
              confirmMoveModal.newEndUTC,
              moveTasks,
              confirmMoveModal.deltaMinutes
            )
          }}
        />
      )}
    </div>
  )
}
