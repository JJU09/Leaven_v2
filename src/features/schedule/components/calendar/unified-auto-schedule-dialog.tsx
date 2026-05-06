'use client'

import React, { useState } from 'react'
import { format, addDays, startOfWeek, endOfWeek, addWeeks, startOfMonth, endOfMonth, addMonths } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Loader2, Calendar as CalendarIcon, Sparkles } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { generateStaffSchedules } from '@/features/schedule/actions'
import { toast } from 'sonner'
import { DateRange } from 'react-day-picker'
import { useRouter } from 'next/navigation'

interface UnifiedAutoScheduleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  storeId: string
  staffList: any[]
  storeOpeningHours?: any
  approvedLeaves?: any[]
}

export function UnifiedAutoScheduleDialog({
  open,
  onOpenChange,
  storeId,
  staffList,
  storeOpeningHours,
  approvedLeaves = [],
}: UnifiedAutoScheduleDialogProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'config' | 'loading' | 'preview'>('config')
  const [scheduleMode, setScheduleMode] = useState<'basic' | 'ai'>('basic')
  const [previewData, setPreviewData] = useState<any[]>([])
  
  // AI 추가 옵션
  const [requireManager, setRequireManager] = useState(true)
  const [prioritizeDefault, setPrioritizeDefault] = useState(true)
  
  // 기본 선택 기간: 다음 주
  const today = new Date()
  const nextWeekStart = startOfWeek(addDays(today, 7), { weekStartsOn: 1 })
  const nextWeekEnd = endOfWeek(addDays(today, 7), { weekStartsOn: 1 })
  
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: nextWeekStart,
    to: nextWeekEnd,
  })
  
  // 기본적으로 모든 직원을 선택 상태로 둠
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>(
    staffList.map(s => s.id)
  )

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedStaffIds(staffList.map(s => s.id))
    } else {
      setSelectedStaffIds([])
    }
  }

  const handleStaffToggle = (memberId: string, checked: boolean) => {
    if (checked) {
      setSelectedStaffIds(prev => [...prev, memberId])
    } else {
      setSelectedStaffIds(prev => prev.filter(id => id !== memberId))
    }
  }

  // 빠른 날짜 선택 헬퍼
  const setQuickDate = (type: 'thisWeek' | 'nextWeek' | 'thisMonth' | 'nextMonth') => {
    const now = new Date()
    let from, to
    
    switch (type) {
      case 'thisWeek':
        from = startOfWeek(now, { weekStartsOn: 1 })
        to = endOfWeek(now, { weekStartsOn: 1 })
        break
      case 'nextWeek':
        const nextWeek = addWeeks(now, 1)
        from = startOfWeek(nextWeek, { weekStartsOn: 1 })
        to = endOfWeek(nextWeek, { weekStartsOn: 1 })
        break
      case 'thisMonth':
        from = startOfMonth(now)
        to = endOfMonth(now)
        break
      case 'nextMonth':
        const nextMonth = addMonths(now, 1)
        from = startOfMonth(nextMonth)
        to = endOfMonth(nextMonth)
        break
    }
    
    setDateRange({ from, to })
  }

  const handleSubmit = async () => {
    if (!dateRange?.from || !dateRange?.to) {
      toast.error('기간을 선택해주세요.')
      return
    }
    if (selectedStaffIds.length === 0) {
      toast.error('직원을 한 명 이상 선택해주세요.')
      return
    }

    setLoading(true)
    
    // YYYY-MM-DD (Local Time) 변환
    const startDate = format(dateRange.from, 'yyyy-MM-dd')
    const endDate = format(dateRange.to, 'yyyy-MM-dd')
    
    if (scheduleMode === 'basic') {
      const result = await generateStaffSchedules(
        storeId,
        startDate,
        endDate,
        selectedStaffIds
      )
      
      setLoading(false)

      if (result.error) {
        toast.error('스케줄 생성 실패', { description: result.error })
      } else {
        const count = result.count ?? 0
        toast.success('스케줄 생성 완료', { 
          description: `총 ${count}개의 스케줄이 생성되었습니다.` 
        })
        onOpenChange(false)
        router.refresh()
      }
    } else {
      // AI 모드 (TODO: API 호출 후 preview 단계로 이동)
      setStep('loading')
      try {
        const response = await fetch('/api/schedule/ai-draft', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            storeId,
            startDate,
            endDate,
            staffIds: selectedStaffIds,
            staffList: staffList.filter(s => selectedStaffIds.includes(s.id)),
            storeOpeningHours,
            approvedLeaves,
            options: {
              requireManager,
              prioritizeDefault
            }
          })
        })
        
        const data = await response.json()
        if (data.error) throw new Error(data.error)
        
        setPreviewData(data.schedules || [])
        setStep('preview')
      } catch (error: any) {
        toast.error('AI 스케줄 생성 실패', { description: error.message })
        setStep('config')
      } finally {
        setLoading(false)
      }
    }
  }

  const handleConfirmPreview = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/schedule/bulk-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedules: previewData })
      })

      const data = await response.json()
      if (data.error) throw new Error(data.error)

      toast.success('AI 스케줄이 확정되었습니다.', {
        description: `총 ${data.count || 0}개의 스케줄이 생성되었습니다.`
      })
      onOpenChange(false)
      router.refresh()
    } catch (error: any) {
      toast.error('스케줄 확정 실패', { description: error.message })
    } finally {
      setLoading(false)
    }
  }

  // 모달 닫힐 때 상태 초기화
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setTimeout(() => {
        setStep('config')
        setPreviewData([])
      }, 200)
    }
    onOpenChange(open)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className={cn(
        "p-0 gap-0 overflow-hidden transition-all duration-300",
        step === 'preview' ? "sm:max-w-[800px]" : "sm:max-w-[480px]"
      )}>
        {step === 'config' && (
          <>
        <DialogHeader className="px-5 py-4 border-b border-black/10 bg-[#fbfbfb]">
          <DialogTitle className="text-[16px] flex items-center gap-2">
            <Sparkles className={cn("w-4 h-4", scheduleMode === 'ai' ? "text-purple-500" : "text-[#1D9E75]")} />
            스케줄 자동 생성
          </DialogTitle>
          <div className="text-[12px] text-[#6b6b6b] mt-1.5 font-normal">
            {scheduleMode === 'ai' 
              ? 'AI가 휴가자, 매장 영업시간, 직무 권한 등을 고려하여 최적의 스케줄 초안을 생성합니다.'
              : '직원 정보에 설정된 기본 근무 시간을 바탕으로 스케줄을 복사하여 생성합니다.'}
          </div>
        </DialogHeader>

        <div className="p-5 flex flex-col gap-6">
          {/* 생성 방식 선택 */}
          <div className="flex flex-col gap-2.5">
            <label className="text-[12px] font-semibold text-[#1a1a1a]">생성 방식</label>
            <div className="grid grid-cols-2 gap-3">
              <div 
                className={cn(
                  "border rounded-lg p-3 cursor-pointer transition-all",
                  scheduleMode === 'basic' ? "border-[#1D9E75] bg-[#1D9E75]/5" : "border-black/10 hover:border-black/20"
                )}
                onClick={() => setScheduleMode('basic')}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className={cn("w-3.5 h-3.5 rounded-full border flex items-center justify-center", scheduleMode === 'basic' ? "border-[#1D9E75]" : "border-gray-300")}>
                    {scheduleMode === 'basic' && <div className="w-2 h-2 rounded-full bg-[#1D9E75]" />}
                  </div>
                  <span className="text-[13px] font-medium text-[#1a1a1a]">기본 근무 복사</span>
                </div>
                <p className="text-[11px] text-[#6b6b6b] ml-5.5 leading-tight">설정된 요일/시간을 그대로 채웁니다.</p>
              </div>

              <div 
                className={cn(
                  "border rounded-lg p-3 cursor-pointer transition-all",
                  scheduleMode === 'ai' ? "border-purple-500 bg-purple-50" : "border-black/10 hover:border-black/20"
                )}
                onClick={() => setScheduleMode('ai')}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className={cn("w-3.5 h-3.5 rounded-full border flex items-center justify-center", scheduleMode === 'ai' ? "border-purple-500" : "border-gray-300")}>
                    {scheduleMode === 'ai' && <div className="w-2 h-2 rounded-full bg-purple-500" />}
                  </div>
                  <span className="text-[13px] font-medium text-[#1a1a1a] flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-purple-500" />
                    AI 스마트 스케줄링
                  </span>
                </div>
                <p className="text-[11px] text-[#6b6b6b] ml-5.5 leading-tight">결원과 영업시간을 고려해 최적화합니다.</p>
              </div>
            </div>
          </div>

          {/* AI 전용 옵션 */}
          {scheduleMode === 'ai' && (
            <div className="flex flex-col gap-2.5 bg-purple-50/50 p-3 rounded-md border border-purple-100">
              <label className="text-[12px] font-semibold text-purple-900">AI 스케줄링 옵션</label>
              
              <label className="flex items-start gap-2 cursor-pointer mt-1">
                <Checkbox 
                  checked={requireManager}
                  onCheckedChange={(c) => setRequireManager(c as boolean)}
                  className="mt-0.5 border-purple-300 data-[state=checked]:bg-purple-600 data-[state=checked]:text-white"
                />
                <div className="flex flex-col">
                  <span className="text-[12px] font-medium text-[#1a1a1a]">매니저(또는 점장) 최소 1명 상주 필수</span>
                  <span className="text-[11px] text-[#6b6b6b]">영업 시간 동안 책임자 권한을 가진 직원이 1명 이상 있도록 배치합니다.</span>
                </div>
              </label>

              <label className="flex items-start gap-2 cursor-pointer mt-1">
                <Checkbox 
                  checked={prioritizeDefault}
                  onCheckedChange={(c) => setPrioritizeDefault(c as boolean)}
                  className="mt-0.5 border-purple-300 data-[state=checked]:bg-purple-600 data-[state=checked]:text-white"
                />
                <div className="flex flex-col">
                  <span className="text-[12px] font-medium text-[#1a1a1a]">기본 근무 일정 최우선 존중</span>
                  <span className="text-[11px] text-[#6b6b6b]">직원의 기본 근무 요일/시간을 우선 배정하고 빈 자리에만 대타를 넣습니다.</span>
                </div>
              </label>
            </div>
          )}

          {/* 기간 선택 영역 */}
          <div className="flex flex-col gap-2.5">
            <label className="text-[12px] font-semibold text-[#1a1a1a]">기간 선택</label>
            
            <div className="flex gap-1.5 mb-1">
              <Button 
                variant="outline"
                size="sm"
                className="px-2.5 py-1 text-[11px] h-auto font-medium rounded-md" 
                onClick={() => setQuickDate('thisWeek')}
              >
                이번 주
              </Button>
              <Button 
                variant="outline"
                size="sm"
                className="px-2.5 py-1 text-[11px] h-auto font-medium rounded-md" 
                onClick={() => setQuickDate('nextWeek')}
              >
                다음 주
              </Button>
              <Button 
                variant="outline"
                size="sm"
                className="px-2.5 py-1 text-[11px] h-auto font-medium rounded-md" 
                onClick={() => setQuickDate('thisMonth')}
              >
                이번 달
              </Button>
              <Button 
                variant="outline"
                size="sm"
                className="px-2.5 py-1 text-[11px] h-auto font-medium rounded-md" 
                onClick={() => setQuickDate('nextMonth')}
              >
                다음 달
              </Button>
            </div>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="date"
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal h-9 text-[12px]",
                    !dateRange && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "PPP", { locale: ko })} -{" "}
                        {format(dateRange.to, "PPP", { locale: ko })}
                      </>
                    ) : (
                      format(dateRange.from, "PPP", { locale: ko })
                    )
                  ) : (
                    <span>날짜를 선택하세요</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                  locale={ko}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* 대상 직원 선택 영역 */}
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <label className="text-[12px] font-semibold text-[#1a1a1a]">대상 직원</label>
              <div className="flex items-center gap-1.5 cursor-pointer" onClick={() => handleSelectAll(selectedStaffIds.length !== staffList.length)}>
                <Checkbox 
                  id="select-all" 
                  checked={selectedStaffIds.length === staffList.length && staffList.length > 0}
                  onCheckedChange={handleSelectAll}
                  className="w-3.5 h-3.5"
                />
                <span className="text-[11px] font-medium text-[#6b6b6b]">
                  전체 선택
                </span>
              </div>
            </div>
            
            <div className="border border-black/10 rounded-md max-h-[180px] overflow-y-auto bg-white">
              {staffList.length === 0 ? (
                <div className="p-4 text-center text-[12px] text-[#6b6b6b]">
                  등록된 직원이 없습니다.
                </div>
              ) : (
                <div className="flex flex-col">
                  {staffList.map((staff, idx) => {
                    const schedules = staff.work_schedules || []
                    const activeSchedules = schedules
                        .filter((s: any) => !s.is_holiday)
                        .sort((a: any, b: any) => a.day - b.day)

                    let patternText = '설정 없음'
                    if (activeSchedules.length > 0) {
                      const timeGroups = new Map<string, number[]>()
                      activeSchedules.forEach((s: any) => {
                        const timeKey = `${s.start_time}-${s.end_time}`
                        const days = timeGroups.get(timeKey) || []
                        days.push(s.day)
                        timeGroups.set(timeKey, days)
                      })
                      const parts: string[] = []
                      const dayNames = ['일','월','화','수','목','금','토']
                      timeGroups.forEach((days, timeKey) => {
                        const [start, end] = timeKey.split('-')
                        const dayStr = days.map(d => dayNames[d]).join(',')
                        const formatTime = (t: string) => t.substring(0, 5)
                        parts.push(`${dayStr} ${formatTime(start)}~${formatTime(end)}`)
                      })
                      patternText = parts.join(' / ')
                    }

                    return (
                      <label 
                        key={staff.id} 
                        className={cn(
                          "flex items-start gap-3 p-3 cursor-pointer hover:bg-[#f3f2ef] transition-colors",
                          idx !== staffList.length - 1 && "border-b border-black/5"
                        )}
                      >
                        <Checkbox 
                          id={`staff-${staff.id}`}
                          checked={selectedStaffIds.includes(staff.id)}
                          onCheckedChange={(checked) => handleStaffToggle(staff.id, checked as boolean)}
                          className="mt-0.5"
                        />
                        <div className="flex flex-col gap-0.5 w-full">
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] font-medium text-[#1a1a1a]">
                              {staff.profile?.full_name || staff.name || '이름 없음'}
                            </span>
                            <span className="text-[10px] bg-[#f0f0f0] text-[#6b6b6b] px-1.5 py-0.5 rounded">
                              {staff.role_info?.name || staff.role}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#6b6b6b] mt-0.5">
                            {patternText}
                          </p>
                        </div>
                      </label>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-black/10 bg-[#fbfbfb] flex justify-end gap-2">
          <Button 
            variant="outline"
            className="px-4 py-2 text-[12px] h-auto font-medium rounded-md" 
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            취소
          </Button>
          <Button 
            className={cn(
              "px-5 py-2 text-[12px] h-auto font-medium rounded-md shadow-sm flex items-center gap-1.5 text-white",
              scheduleMode === 'ai' ? "bg-purple-600 hover:bg-purple-700" : "bg-[#1D9E75] hover:bg-[#168560]"
            )}
            onClick={handleSubmit} 
            disabled={loading} 
          >
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            {scheduleMode === 'ai' ? 'AI 초안 생성' : '일괄 생성하기'}
          </Button>
        </div>
        </>
        )}

        {step === 'loading' && (
          <div className="p-12 flex flex-col items-center justify-center min-h-[300px]">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600 mb-4" />
            <h3 className="text-sm font-bold mb-2">AI가 스케줄을 계산 중입니다</h3>
            <p className="text-xs text-muted-foreground text-center">
              휴가 일정, 매장 영업시간, 직무별 최소 인원을 고려하여<br/>최적의 스케줄을 배치하고 있습니다...
            </p>
          </div>
        )}

        {step === 'preview' && (
          <>
            <DialogHeader className="px-5 py-4 border-b border-black/10 bg-purple-50">
              <DialogTitle className="text-[16px] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-600" />
                AI 스케줄 초안 미리보기
              </DialogTitle>
              <div className="text-[12px] text-purple-700/80 mt-1.5 font-normal flex justify-between items-center">
                <span>AI가 생성한 스케줄을 확인하고 최종 확정해주세요.</span>
                <span className="font-semibold">총 {previewData.length}건</span>
              </div>
            </DialogHeader>
            <div className="p-5 max-h-[60vh] overflow-y-auto overflow-x-auto bg-[#fbfbfb]">
              {(() => {
                if (!previewData || previewData.length === 0) return <div className="text-center p-4 text-sm text-gray-500">생성된 스케줄이 없습니다.</div>;

                // 1. 날짜 추출 및 정렬
                const datesSet = new Set<string>();
                previewData.forEach(s => datesSet.add(s.plan_date));
                const sortedDates = Array.from(datesSet).sort();

                // 2. 스케줄이 배정된 직원 추출
                const activeStaffIds = new Set<string>();
                previewData.forEach(s => activeStaffIds.add(s.member_id));
                const activeStaffList = staffList.filter(s => activeStaffIds.has(s.id));

                return (
                  <div className="min-w-max border border-black/10 rounded-md bg-white overflow-hidden shadow-sm">
                    {/* Header Row (Dates) */}
                    <div className="flex border-b border-black/10 bg-[#f9f9f9]">
                      <div className="w-[140px] shrink-0 border-r border-black/10 p-3 flex items-center justify-center font-semibold text-[12px] text-[#6b6b6b]">
                        직원
                      </div>
                      {sortedDates.map(dateStr => {
                        const dateObj = new Date(dateStr)
                        const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6
                        return (
                          <div 
                            key={dateStr} 
                            className={cn(
                              "flex-1 min-w-[120px] p-2 flex flex-col items-center justify-center border-r border-black/5 last:border-0",
                              isWeekend && "bg-red-50/30"
                            )}
                          >
                            <span className="text-[10px] text-[#6b6b6b] mb-0.5">{format(dateObj, 'M월 d일')}</span>
                            <span className={cn(
                              "text-[13px] font-bold",
                              dateObj.getDay() === 0 ? "text-red-600" : dateObj.getDay() === 6 ? "text-blue-600" : "text-[#1a1a1a]"
                            )}>
                              {format(dateObj, 'E', { locale: ko })}
                            </span>
                          </div>
                        )
                      })}
                    </div>

                    {/* Body Rows (Staff) */}
                    <div className="flex flex-col divide-y divide-black/5">
                      {activeStaffList.map(staff => {
                        const staffName = staff.profile?.full_name || staff.name || '알 수 없음'
                        const roleInfo = staff.role_info
                        const rColor = roleInfo?.color || '#534AB7'
                        
                        return (
                          <div key={staff.id} className="flex hover:bg-[#fbfbfb] transition-colors">
                            {/* Staff Info Col */}
                            <div className="w-[140px] shrink-0 border-r border-black/10 p-3 flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                                   style={{ backgroundColor: rColor }}>
                                {staffName.substring(0, 1)}
                              </div>
                              <div className="flex flex-col overflow-hidden">
                                <span className="text-[12px] font-semibold text-[#1a1a1a] truncate" title={staffName}>{staffName}</span>
                                <span className="text-[10px] text-[#6b6b6b] truncate" title={roleInfo?.name || '역할 없음'}>{roleInfo?.name || '역할 없음'}</span>
                              </div>
                            </div>
                            
                            {/* Schedule Cells */}
                            {sortedDates.map(dateStr => {
                              const daySchedules = previewData.filter(s => s.member_id === staff.id && s.plan_date === dateStr)
                              return (
                                <div key={dateStr} className="flex-1 min-w-[120px] p-2 border-r border-black/5 last:border-0 flex flex-col gap-1.5 justify-center">
                                  {daySchedules.length > 0 ? (
                                    daySchedules.map((sch, idx) => {
                                      const start = sch.start_time.substring(0, 5)
                                      const end = sch.end_time.substring(0, 5)
                                      
                                      // 근무 시간 계산
                                      const startD = new Date(`1970-01-01T${sch.start_time}Z`)
                                      const endD = new Date(`1970-01-01T${sch.end_time}Z`)
                                      let diffH = (endD.getTime() - startD.getTime()) / (1000 * 60 * 60)
                                      if (diffH < 0) diffH += 24

                                      return (
                                        <div 
                                          key={idx} 
                                          className="flex flex-col gap-0.5 p-1.5 rounded bg-white border border-black/10 shadow-sm"
                                          style={{ borderLeftWidth: '3px', borderLeftColor: rColor }}
                                        >
                                          <div className="text-[11px] font-medium text-[#1a1a1a] text-center tracking-tight">
                                            {start} - {end}
                                          </div>
                                          <div className="text-[9px] text-[#6b6b6b] text-center font-medium">
                                            {diffH.toFixed(1)}H
                                          </div>
                                        </div>
                                      )
                                    })
                                  ) : (
                                    <div className="w-full h-full min-h-[36px] flex items-center justify-center">
                                      <span className="text-[10px] text-black/20 font-medium">-</span>
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })()}
            </div>
            <div className="px-5 py-4 border-t border-black/10 bg-white flex justify-end gap-2">
              <Button 
                variant="outline"
                className="px-4 py-2 text-[12px] h-auto font-medium rounded-md" 
                onClick={() => setStep('config')}
                disabled={loading}
              >
                다시 설정
              </Button>
              <Button 
                className="px-5 py-2 text-[12px] h-auto font-medium bg-purple-600 hover:bg-purple-700 text-white rounded-md shadow-sm flex items-center gap-1.5"
                onClick={handleConfirmPreview} 
                disabled={loading} 
              >
                {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                최종 반영하기
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
