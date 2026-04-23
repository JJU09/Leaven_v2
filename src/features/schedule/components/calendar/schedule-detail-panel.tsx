'use client'

import React, { useState, useRef, useEffect, useMemo } from 'react'
import { format } from 'date-fns'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { TimePicker } from '@/components/ui/time-picker'
import { toast } from 'sonner'
import { updateSchedule, deleteSchedule, createSchedule } from '@/features/schedule/actions'
import { createTask, assignTask, deleteTask, updateTask, toggleTaskCheckitem, createDirectScheduleTask } from '@/features/schedule/task-actions'
import { useRouter } from 'next/navigation'
import { Pencil, Trash2 } from 'lucide-react'
import { toKSTISOString, toUTCISOString, addMinutesToTime } from '@/shared/lib/date-utils'
import { Button } from '@/components/ui/button'

function hexToRgba(hex: string, alpha: number) {
  if (!hex) return `rgba(0,0,0,${alpha})`
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export function timeToMinutes(timeStr: string) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

export function minutesToTime(mins: number) {
  const h = Math.floor(mins / 60);
  const m = Math.floor(mins % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

export function TimeSlider({ 
  startTime, 
  endTime, 
  onChange, 
  existingSchedules 
}: { 
  startTime: string, 
  endTime: string, 
  onChange: (start: string, end: string) => void,
  existingSchedules: {startMin: number, endMin: number}[]
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [activeHandle, setActiveHandle] = useState<'start' | 'end' | null>(null)

  const startMins = timeToMinutes(startTime)
  const endMins = timeToMinutes(endTime)

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!activeHandle || !trackRef.current) return
      
      const rect = trackRef.current.getBoundingClientRect()
      let x = e.clientX - rect.left
      if (x < 0) x = 0
      if (x > rect.width) x = rect.width
      
      // 30분 단위 스냅
      const percentage = x / rect.width
      const totalMins = 24 * 60
      let mins = Math.round((percentage * totalMins) / 30) * 30
      
      if (activeHandle === 'start') {
        if (mins >= endMins) mins = endMins - 30
        onChange(minutesToTime(mins), endTime)
      } else {
        if (mins <= startMins) mins = startMins + 30
        onChange(startTime, minutesToTime(mins))
      }
    }
    
    const handleMouseUp = () => {
      setActiveHandle(null)
    }

    if (activeHandle) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [activeHandle, startMins, endMins, onChange, startTime, endTime])

  return (
    <div className="relative w-full h-8 flex items-center select-none my-4">
      <div ref={trackRef} className="absolute w-full h-3 bg-black/5 rounded-full" />
      
      {/* Existing Schedules Overlay */}
      {existingSchedules.map((sch, i) => {
        const left = (sch.startMin / (24 * 60)) * 100
        const width = ((sch.endMin - sch.startMin) / (24 * 60)) * 100
        return (
          <div 
            key={i} 
            className="absolute h-3 bg-red-500/30 rounded-full" 
            style={{ left: `${left}%`, width: `${width}%` }}
            title="기존 스케줄"
          />
        )
      })}

      {/* Selected Range */}
      <div 
        className="absolute h-3 bg-[#1a1a1a] rounded-full"
        style={{ 
          left: `${(startMins / (24 * 60)) * 100}%`, 
          width: `${((endMins - startMins) / (24 * 60)) * 100}%` 
        }} 
      />

      {/* Start Handle */}
      <div 
        className="absolute w-3.5 h-3.5 bg-white border-[1.5px] border-[#1a1a1a] rounded-full top-1/2 -translate-y-1/2 -ml-[7px] cursor-ew-resize shadow-sm hover:scale-125 transition-transform z-10"
        style={{ left: `${(startMins / (24 * 60)) * 100}%` }}
        onMouseDown={() => setActiveHandle('start')}
      />

      {/* End Handle */}
      <div 
        className="absolute w-3.5 h-3.5 bg-white border-[1.5px] border-[#1a1a1a] rounded-full top-1/2 -translate-y-1/2 -ml-[7px] cursor-ew-resize shadow-sm hover:scale-125 transition-transform z-10"
        style={{ left: `${(endMins / (24 * 60)) * 100}%` }}
        onMouseDown={() => setActiveHandle('end')}
      />

      {/* Time Ticks */}
      <div className="absolute w-full top-full mt-2 flex justify-between px-1">
        {[0, 6, 12, 18, 24].map(h => (
          <div key={h} className="text-[10px] text-muted-foreground font-medium relative -ml-2">
            {h.toString().padStart(2, '0')}:00
            <div className="absolute -top-3 left-1/2 w-px h-1.5 bg-black/20" />
          </div>
        ))}
      </div>
    </div>
  )
}

// 자동 파생 상태 계산 헬퍼 (시간 기반)
export function getDerivedTaskStatus(t: any, scheduleDateStr: string, now: Date): 'todo' | 'in_progress' | 'pending' | 'done' {
  if (t.status === 'done') return 'done'
  if (!t.start_time) return 'todo'

  let taskDateObj = null;
  if (t.start_time.includes('T')) {
    taskDateObj = new Date(t.start_time)
  } else {
    const dateStr = t.assigned_date || scheduleDateStr
    if (!dateStr) return 'todo'
    // 만약 start_time이 "09:00" 처럼 초가 없으면 추가
    const timeStr = t.start_time.length === 5 ? `${t.start_time}:00` : t.start_time
    taskDateObj = new Date(`${dateStr}T${timeStr}`)
  }

  if (isNaN(taskDateObj.getTime())) return 'todo'

  const startTimeMs = taskDateObj.getTime()
  const nowMs = now.getTime()
  const thirtyMinsMs = 30 * 60 * 1000

  if (nowMs < startTimeMs) {
    return 'todo'
  } else if (nowMs >= startTimeMs && nowMs < startTimeMs + thirtyMinsMs) {
    return 'in_progress'
  } else {
    return 'pending'
  }
}

interface ScheduleDetailPanelProps {
  mode: 'create' | 'edit'
  storeId: string
  selectedSchedule?: any
  setSelectedSchedule?: React.Dispatch<React.SetStateAction<any>>
  staffList: any[]
  setLocalSchedules: React.Dispatch<React.SetStateAction<any[]>>
  localSchedules?: any[]
  handleTaskToggle?: (taskId: string, currentStatus: string) => Promise<void>
  now?: Date
  approvedLeaves?: any[]
  createForm?: any
  setCreateForm?: (form: any) => void
  checkOverlap?: (staffId: string, start: Date, end: Date) => boolean
  onClose: () => void
}

export const STATUS_INFO: Record<string, { label: string, color: string, bg: string, border: string }> = {
  todo: { label: '대기', color: '#6b6b6b', bg: '#f3f2ef', border: '#e5e5e5' },
  in_progress: { label: '진행 중', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  pending: { label: '보류', color: '#ea580c', bg: '#fff7ed', border: '#fed7aa' },
  done: { label: '완료', color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' }
}

export function ScheduleDetailPanel({
  mode,
  storeId,
  selectedSchedule,
  setSelectedSchedule,
  staffList,
  setLocalSchedules,
  localSchedules = [],
  handleTaskToggle,
  now = new Date(),
  approvedLeaves = [],
  createForm,
  setCreateForm,
  checkOverlap,
  onClose
}: ScheduleDetailPanelProps) {
  const router = useRouter()
  
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    }
  }, [])

  const handleFieldsChange = (updates: Record<string, any>) => {
    if (!selectedSchedule) return

    // 1. Optimistic update for panel
    const newSchedule = { ...selectedSchedule, ...updates }
    if (setSelectedSchedule) setSelectedSchedule(newSchedule)

    // 2. Optimistic update for main calendar (localSchedules)
    setLocalSchedules(prev => prev.map(s => {
      if (s.id === newSchedule.id) {
        let endDateTime = new Date(`${newSchedule.editDate}T${newSchedule.editEndTime}:00`)
        if (newSchedule.editStartTime > newSchedule.editEndTime) {
          endDateTime.setDate(endDateTime.getDate() + 1)
        }
        return {
          ...s,
          start_time: new Date(`${newSchedule.editDate}T${newSchedule.editStartTime}:00`).toISOString(),
          end_time: endDateTime.toISOString(),
          member_id: newSchedule.editStaffId,
          schedule_type: newSchedule.scheduleType || newSchedule.schedule_type
        }
      }
      return s
    }))

    // 3. Debounced API Call
    setSaveStatus('saving')
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    
    saveTimeoutRef.current = setTimeout(async () => {
      const formData = new FormData()
      formData.append('userIds', JSON.stringify([newSchedule.editStaffId]))
      formData.append('date', newSchedule.editDate)
      formData.append('startTime', newSchedule.editStartTime)
      formData.append('endTime', newSchedule.editEndTime)
      formData.append('schedule_type', newSchedule.scheduleType || newSchedule.schedule_type || 'regular')
      
      const res = await updateSchedule(storeId, newSchedule.id, formData)
      if (res.error) {
        toast.error('자동 저장 실패: ' + res.error)
        setSaveStatus('idle')
        return
      }
      
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    }, 500)
  }

  const handleFieldChange = (field: string, value: any) => {
    if (mode === 'edit') {
      handleFieldsChange({ [field]: value })
    } else if (mode === 'create' && setCreateForm && createForm) {
      setCreateForm({ ...createForm, [field]: value })
    }
  }

  // 통합 모달을 위해 현재 상태를 파생
  const isCreate = mode === 'create'
  const state = isCreate ? createForm : selectedSchedule
  
  if (!state) return null

  // 공통 변수 계산
  const targetStaffId = isCreate ? state.staffId : (state.editStaffId || state.member_id)
  const targetStaff = staffList.find(s => s.id === targetStaffId)
  const targetDate = isCreate ? state.date : state.editDate
  const targetStartTime = isCreate ? state.startTime : state.editStartTime
  const targetEndTime = isCreate ? state.endTime : state.editEndTime
  const targetType = isCreate ? state.scheduleType : (state.scheduleType || state.schedule_type)
  const roleColor = isCreate ? (targetStaff?.role_info?.color || '#534AB7') : state.roleColor
  const displayRole = isCreate ? (targetStaff?.role_info?.name || '역할 없음') : state.displayRole
  const displayName = isCreate ? (targetStaff?.name || '알 수 없음') : state.displayName

  // 오버레이 및 충돌 체크용 (TimeSlider)
  const existingSchedules = useMemo(() => {
    if (!targetStaffId || !targetDate) return [];
    return localSchedules
      .filter(sch => {
        if (!isCreate && sch.id === state.id) return false; // 본인 제외
        if (!sch.start_time) return false;
        const startObj = new Date(sch.start_time)
        if (isNaN(startObj.getTime())) return false;
        
        const yy = startObj.getFullYear()
        const mm = String(startObj.getMonth() + 1).padStart(2, '0')
        const dd = String(startObj.getDate()).padStart(2, '0')
        const schDateStr = `${yy}-${mm}-${dd}`
        
        if (schDateStr !== targetDate) return false;
        return sch.member_id === targetStaffId;
      })
      .map(sch => {
        const startObj = new Date(sch.start_time)
        const endObj = new Date(sch.end_time)
        const sH = startObj.getHours()
        const sM = startObj.getMinutes()
        let eH = endObj.getHours()
        const eM = endObj.getMinutes()
        if (eH < sH || endObj.getDate() !== startObj.getDate()) eH += 24
        return { startMin: sH * 60 + sM, endMin: eH * 60 + eM }
      });
  }, [localSchedules, targetStaffId, targetDate, isCreate, state]);

  const isOverlapping = useMemo(() => {
    const curStartMin = timeToMinutes(targetStartTime)
    const curEndMin = timeToMinutes(targetEndTime)
    return existingSchedules.some(sch => curStartMin < sch.endMin && curEndMin > sch.startMin)
  }, [existingSchedules, targetStartTime, targetEndTime])

  const isActuallyOnLeave = approvedLeaves.some((leave: any) => {
    return leave.member_id === targetStaffId && targetDate >= leave.start_date && targetDate <= leave.end_date;
  });

  return (
    <div className={`flex flex-col max-h-[85vh] overflow-hidden w-full`}>
      {/* Schedule Info & Slider */}
      <div className={`w-full flex flex-col border-black/10`}>
        <div className="p-5 flex flex-col overflow-y-auto custom-scrollbar">
          <div className="flex items-center justify-between mb-4 pb-3 border-b shrink-0">
            <div className="flex items-center gap-2">
              <div 
                className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                style={{ 
                  backgroundColor: hexToRgba(targetType === 'leave' ? '#64748b' : roleColor, 0.15), 
                  color: targetType === 'leave' ? '#64748b' : roleColor 
                }}
              >
                {(displayName || '직').substring(0, 1)}
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="font-semibold text-[15px] text-[#1a1a1a]">
                  {isCreate ? '스케줄 직접 추가' : displayName}
                </span>
                {!isCreate && (
                  <span className="text-[11px] font-medium text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-md border border-black/5">
                    {displayRole}
                  </span>
                )}
              </div>
              {saveStatus === 'saving' && <span className="text-[10px] text-muted-foreground animate-pulse ml-2">저장 중...</span>}
              {saveStatus === 'saved' && <span className="text-[10px] text-[#1D9E75] ml-2 font-medium">저장됨</span>}
            </div>
          </div>
          
          <div className="flex flex-col gap-4">
            {isCreate && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-medium text-muted-foreground">직원</label>
                {targetStaffId ? (
                  <div className="text-[14px] font-semibold text-[#1a1a1a]">
                    {displayName}
                  </div>
                ) : (
                  <Select value={state.staffId} onValueChange={(val) => handleFieldChange('staffId', val)}>
                    <SelectTrigger className="text-[12px] h-8 bg-white">
                      <SelectValue placeholder="직원 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {staffList.map(s => <SelectItem key={s.id} value={s.id} className="text-[12px]">{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <div className="flex flex-col gap-1.5 flex-1">
                <label className="text-[10px] font-medium text-muted-foreground">날짜</label>
                <Input 
                  type="date" 
                  className="h-8 text-[11px] px-2" 
                  value={targetDate} 
                  onChange={(e) => handleFieldChange(isCreate ? 'date' : 'editDate', e.target.value)} 
                />
              </div>
              <div className="flex flex-col gap-1.5 flex-1">
                <label className="text-[10px] font-medium text-muted-foreground">스케줄 유형</label>
                <Select 
                  value={targetType || 'regular'} 
                  disabled={isActuallyOnLeave}
                  onValueChange={(val) => {
                    if (isActuallyOnLeave && val !== 'leave') {
                      toast.error('변경할 수 없습니다.', { description: '승인된 휴가가 존재합니다.', duration: 4000 })
                      if (!isCreate && setSelectedSchedule) setSelectedSchedule((prev: any) => ({ ...prev }))
                      return;
                    }
                    const typeLabelMap: Record<string, string> = {
                      'regular': '근무', 'leave': '휴가', 'training': '교육', 'etc': '기타'
                    }
                    if (isCreate) {
                      if (setCreateForm) setCreateForm({ ...createForm, scheduleType: val })
                    } else {
                      handleFieldsChange({ schedule_type: val, scheduleType: val })
                    }
                  }}
                >
                  <SelectTrigger className="h-8 text-[11px] px-2"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="regular" className="text-[11px]">근무</SelectItem>
                    <SelectItem value="leave" className="text-[11px]">휴가</SelectItem>
                    <SelectItem value="training" className="text-[11px]">교육</SelectItem>
                    <SelectItem value="etc" className="text-[11px]">기타</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {isActuallyOnLeave && (
              <div className="text-[10px] text-orange-600 bg-orange-50 px-2 py-1.5 rounded border border-orange-100">
                승인된 휴가 일정이 존재합니다. (자동으로 휴가 유형 적용)
              </div>
            )}

            {targetType !== 'leave' && (
              <div className="flex gap-2">
                <div className="flex flex-col gap-1.5 flex-1">
                  <label className="text-[10px] font-medium text-muted-foreground">시작 시간</label>
                  <TimePicker 
                    value={targetStartTime} 
                    onChange={(val) => handleFieldChange(isCreate ? 'startTime' : 'editStartTime', val)} 
                  />
                </div>
                <div className="flex flex-col gap-1.5 flex-1">
                  <label className="text-[10px] font-medium text-muted-foreground">종료 시간</label>
                  <TimePicker 
                    value={targetEndTime} 
                    onChange={(val) => handleFieldChange(isCreate ? 'endTime' : 'editEndTime', val)} 
                  />
                </div>
              </div>
            )}

            {/* Time Slider */}
            <div className="flex flex-col gap-2 mt-4 border-t border-black/5 pt-4">
              <label className="text-[11px] font-medium text-muted-foreground">시간 슬라이더 (드래그하여 조정)</label>
              <TimeSlider 
                startTime={targetStartTime} 
                endTime={targetEndTime} 
                onChange={(s, e) => {
                  if (isCreate && setCreateForm) setCreateForm({ ...createForm, startTime: s, endTime: e })
                  else handleFieldsChange({ editStartTime: s, editEndTime: e })
                }}
                existingSchedules={existingSchedules}
              />
              {isOverlapping && (
                <div className="text-[11px] font-medium text-red-500 bg-red-50 px-2 py-1.5 rounded border border-red-100 mt-2 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                  해당 시간대에 이미 스케줄이 존재합니다.
                </div>
              )}
            </div>
          </div>

          <div className={`pt-6 mt-4 flex gap-2 ${isCreate ? 'justify-end' : 'justify-start'}`}>
            {isCreate ? (
              <>
                <Button 
                  variant="outline"
                  className="px-4 py-2 text-[11px] h-auto font-medium rounded-md" 
                  onClick={onClose}
                >
                  취소
                </Button>
                <Button 
                  className="px-5 py-2 text-[11px] h-auto font-medium rounded-md shadow-sm" 
                  disabled={isOverlapping}
                  onClick={async () => {
                    if (!createForm.staffId || !createForm.startTime || !createForm.endTime || !createForm.date) {
                      toast.error('직원, 날짜, 시간을 모두 입력해주세요.')
                      return
                    }
                    const startStr = `${createForm.date}T${createForm.startTime}:00`
                    const endStr = `${createForm.date}T${createForm.endTime}:00`
                    
                    if (checkOverlap && checkOverlap(createForm.staffId, new Date(startStr), new Date(endStr))) {
                      toast.error('해당 시간대에 이미 스케줄이 존재합니다.')
                      return
                    }

                    if (isActuallyOnLeave && (createForm.scheduleType || 'regular') !== 'leave') {
                      toast.error('휴가 상태 오류', { description: '유형을 휴가로 설정해주세요.' });
                      return;
                    }

                    const formData = new FormData()
                    formData.append('userIds', JSON.stringify([createForm.staffId]))
                    formData.append('date', createForm.date)
                    formData.append('startTime', createForm.startTime)
                    formData.append('endTime', createForm.endTime)
                    formData.append('schedule_type', createForm.scheduleType || 'regular')

                    const res = await createSchedule(storeId, formData)
                    if (res.error) {
                      toast.error(res.error)
                      return
                    }

                    if (res.schedules && res.schedules.length > 0) {
                      // Use actual data from API instead of temporary objects
                      const newSchedules = res.schedules.map((sch: any) => ({
                        ...sch,
                        // Ensure required UI fields are correctly formatted
                        start_time: `${sch.plan_date}T${sch.start_time}`,
                        end_time: `${sch.plan_date}T${sch.end_time}`,
                        tasks: []
                      }))
                      
                      setLocalSchedules(prev => [...prev, ...newSchedules])
                    } else {
                      // Fallback if full data wasn't returned
                      const newSchedule = {
                        id: `temp-${Date.now()}`,
                        start_time: startStr,
                        end_time: endStr,
                        schedule_type: createForm.scheduleType || 'regular',
                        member_id: createForm.staffId,
                        plan_date: createForm.date,
                        tasks: []
                      }
                      setLocalSchedules(prev => [...prev, newSchedule])
                    }
                    
                    toast.success('스케줄이 추가되었습니다.')
                    onClose()
                    router.refresh()
                  }}
                >
                  추가하기
                </Button>
              </>
            ) : (
              <Button 
                variant="outline"
                className="px-4 py-2 text-[11px] h-auto text-destructive hover:bg-destructive/10 hover:text-destructive rounded-md font-medium border-destructive/30 hover:border-destructive/50"
                onClick={async () => {
                  if (window.confirm('이 스케줄을 정말 삭제하시겠습니까?')) {
                    const res = await deleteSchedule(storeId, state.id)
                    if (res.error) {
                      toast.error(res.error)
                      return
                    }
                    setLocalSchedules(prev => prev.filter(s => s.id !== state.id))
                    if (setSelectedSchedule) setSelectedSchedule(null)
                    toast.success('스케줄이 삭제되었습니다.')
                    onClose()
                    router.refresh()
                  }
                }}
              >
                삭제
              </Button>
            )}
          </div>
        </div>
      </div>

    </div>
  )
}
