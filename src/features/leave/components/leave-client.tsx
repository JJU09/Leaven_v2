'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
import { format, differenceInMonths, differenceInYears, differenceInDays, parseISO } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Clock, Users, Activity, FileText, Calendar, Search, Check, X } from 'lucide-react'
import { getLeaveBalances, getLeaveRequests, resolveLeaveRequest, createLeaveRequest, cancelLeaveRequest } from '@/features/leave/actions'
import { toast } from 'sonner'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { LeaveAttachmentUpload } from '@/features/leave/components/leave-attachment-upload'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import koLocale from '@fullcalendar/core/locales/ko'

import { calculateAnnualLeave, calculateDeductedDays } from '@/features/leave/utils'
import { getMemberDisplayName } from '@/lib/utils'
import Link from 'next/link'

interface LeaveClientPageProps {
  storeId: string
  roles: any[]
  staffList: any[]
  canManage: boolean
  currentUserId: string
  leaveCalcType: 'hire_date' | 'fiscal_year'
}

// --- 공통 유틸리티 ---
const getStaffRoleInfo = (staff: any, roles: any[]) => {
  if (staff?.role_info) {
    return Array.isArray(staff.role_info) ? staff.role_info[0] : staff.role_info
  }
  if (staff?.role) {
    const legacyRoleName = staff.role === 'owner' ? '점주' : staff.role === 'manager' ? '매니저' : '직원'
    const foundRole = roles?.find(r => r.name === legacyRoleName)
    if (foundRole) return foundRole
  }
  return null
}

const getServicePeriodLabel = (hiredAt: string | null) => {
  if (!hiredAt) return '-'
  const start = new Date(hiredAt)
  const today = new Date()
  
  const years = differenceInYears(today, start)
  const months = differenceInMonths(today, start) % 12
  
  if (years === 0) return `${months}개월`
  if (months === 0) return `${years}년`
  return `${years}년 ${months}개월`
}

// --- 공통 UI 컴포넌트 ---
function StatusBadge({ status }: { status: string }) {
  if (status === 'pending') return <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-transparent whitespace-nowrap">대기 중</Badge>
  if (status === 'approved') return <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100 border-transparent whitespace-nowrap">승인됨</Badge>
  if (status === 'rejected') return <Badge variant="secondary" className="bg-red-100 text-red-700 hover:bg-red-100 border-transparent whitespace-nowrap">반려됨</Badge>
  if (status === 'canceled' || status === 'cancelled') return <Badge variant="secondary" className="bg-slate-100 text-slate-700 hover:bg-slate-100 border-transparent whitespace-nowrap">취소됨</Badge>
  return null
}

function LeaveTypeBadge({ type, portion = 'full' }: { type: string, portion?: string }) {
  const portionText = portion === 'am' ? ' (오전 반차)' : portion === 'pm' ? ' (오후 반차)' : ''
  if (type === 'annual') return <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50 whitespace-nowrap">연차{portionText}</Badge>
  if (type === 'sick') return <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50 whitespace-nowrap">병가{portionText}</Badge>
  if (type === 'unpaid') return <Badge variant="outline" className="text-slate-600 border-slate-200 bg-slate-50 whitespace-nowrap">무급/특별{portionText}</Badge>
  return <Badge variant="outline" className="whitespace-nowrap">{type}{portionText}</Badge>
}

// --- 메인 페이지 컴포넌트 ---
export function LeaveClientPage(props: LeaveClientPageProps) {
  const { storeId, leaveCalcType } = props
  const referenceDate = new Date()
  const selectedYear = referenceDate.getFullYear()
  
  const [balances, setBalances] = useState<any[]>([])
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    try {
      const [balRes, reqRes] = await Promise.all([
        getLeaveBalances(storeId, selectedYear),
        getLeaveRequests(storeId)
      ])
      setBalances(balRes || [])
      setRequests(reqRes || [])
    } catch (error) {
      console.error(error)
      toast.error('휴가 데이터를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [storeId, selectedYear])

  if (loading) {
    return <div className="w-full h-64 flex items-center justify-center text-muted-foreground">데이터를 불러오는 중입니다...</div>
  }

  return (
    <div className="w-full h-full overflow-y-auto no-scrollbar pb-12 px-1">
      {props.canManage ? (
        <ManagerLeaveView {...props} data={{ balances, requests }} onRefresh={fetchData} referenceDate={referenceDate} />
      ) : (
        <EmployeeLeaveView {...props} data={{ balances, requests }} onRefresh={fetchData} referenceDate={referenceDate} />
      )}
    </div>
  )
}

// --- 관리자 / 매니저 뷰 ---
function ManagerLeaveView({ storeId, currentUserId, roles, staffList, leaveCalcType, data, onRefresh, referenceDate }: any) {
  const { balances, requests } = data
  const [search, setSearch] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const calendarRef = useRef<any>(null)

  const pendingRequests = requests.filter((r: any) => r.status === 'pending')
  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const todayLeaveCount = requests.filter((r: any) => r.status === 'approved' && r.start_date <= todayStr && r.end_date >= todayStr).length

  // 평균 연차 소진율 및 전체 직원수 계산
  const activeStaff = staffList.filter((s: any) => {
    const roleInfo = getStaffRoleInfo(s, roles)
    return s.role !== 'owner' && (!roleInfo || roleInfo.hierarchy_level < 100)
  })
  const totalStaffCount = activeStaff.length

  let totalSum = 0
  let usedSum = 0
  activeStaff.forEach((staff: any) => {
    const balance = balances.find((b: any) => b.member_id === staff.id)
    const hireDate = staff.hired_at || staff.join_date ? new Date(staff.hired_at || staff.join_date).toISOString().split('T')[0] : null
    const calcTotal = hireDate ? calculateAnnualLeave(hireDate, referenceDate, leaveCalcType) : 0
    const total = balance?.total_days ?? calcTotal
    const used = balance?.used_days || 0
    totalSum += total
    usedSum += used
  })
  const avgUsageRate = totalSum > 0 ? Math.round((usedSum / totalSum) * 100) : 0

  const handleResolve = async (id: string, status: 'approved' | 'rejected') => {
    if (!window.confirm(`이 휴가를 ${status === 'approved' ? '승인' : '반려'}하시겠습니까?`)) return
    setActionLoading(id)
    try {
      const res = await resolveLeaveRequest(id, storeId, status)
      if (res.error) toast.error(res.error)
      else { 
        toast.success('처리되었습니다.')
        onRefresh()
      }
    } catch (e) {
      toast.error('오류가 발생했습니다.')
    } finally {
      setActionLoading(null)
    }
  }

  const calendarEvents = requests
    .filter((r: any) => r.status === 'approved')
    .map((r: any) => {
      const name = getMemberDisplayName(r.member)
      const label = r.leave_type === 'annual' ? '연차' : r.leave_type === 'sick' ? '병가' : '무급'
      const portionPrefix = r.leave_portion === 'am' ? '[오전] ' : r.leave_portion === 'pm' ? '[오후] ' : ''
      const endDateObj = new Date(r.end_date)
      endDateObj.setDate(endDateObj.getDate() + 1)
      return { 
        id: r.id, 
        title: `${portionPrefix}${name} (${label})`, 
        start: r.start_date, 
        end: endDateObj.toISOString().substring(0, 10), 
        backgroundColor: '#1D9E75',
        borderColor: '#1D9E75',
        textColor: '#fff', 
        allDay: true 
      }
    })

  const filteredStaff = activeStaff.filter((s: any) => getMemberDisplayName(s).includes(search))

  // 관리자 본인 휴가 관련 데이터
  const myStaff = staffList.find((s: any) => s.user_id === currentUserId)
  const myRequests = requests.filter((r: any) => r.member_id === myStaff?.id || r.member?.user_id === currentUserId)
  const myBalance = balances.find((b: any) => b.member_id === myStaff?.id)
  const myHireDate = myStaff?.hired_at || myStaff?.join_date ? new Date(myStaff?.hired_at || myStaff?.join_date).toISOString().split('T')[0] : null
  const myCalcTotal = myHireDate ? calculateAnnualLeave(myHireDate, referenceDate, leaveCalcType) : 0
  const myTotal = myBalance?.total_days ?? myCalcTotal
  const myUsed = myBalance?.used_days || 0
  const myRemain = myTotal - myUsed
  const myUsageRate = myTotal > 0 ? Math.min(100, Math.max(0, (myUsed / myTotal) * 100)) : 0
  const [cancelLoading, setCancelLoading] = useState<string | null>(null)

  const handleCancel = async (id: string) => {
    if (!window.confirm('신청한 휴가를 취소하시겠습니까?')) return
    setCancelLoading(id)
    try {
      const res = await cancelLeaveRequest(id, storeId)
      if (res.error) toast.error(res.error)
      else {
        toast.success('휴가 신청이 취소되었습니다.')
        onRefresh()
      }
    } catch (e) {
      toast.error('오류가 발생했습니다.')
    } finally {
      setCancelLoading(null)
    }
  }

  return (
    <div className="flex flex-col gap-10 pt-4 md:pt-6">
      {/* 1. 상단 요약 카드 (4개) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Card className="bg-white border shadow-sm">
          <CardContent className="p-3 md:p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-xs font-medium text-muted-foreground">승인 대기</p>
              <p className="text-xl md:text-2xl font-bold">{pendingRequests.length}<span className="text-sm font-normal text-muted-foreground ml-1">건</span></p>
            </div>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-full hidden sm:block">
              <Clock className="w-4 h-4 md:w-5 md:h-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border shadow-sm">
          <CardContent className="p-3 md:p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-xs font-medium text-muted-foreground">오늘 휴가자</p>
              <p className="text-xl md:text-2xl font-bold">{todayLeaveCount}<span className="text-sm font-normal text-muted-foreground ml-1">명</span></p>
            </div>
            <div className="p-2 bg-[#1D9E75]/10 text-[#1D9E75] rounded-full hidden sm:block">
              <Calendar className="w-4 h-4 md:w-5 md:h-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border shadow-sm">
          <CardContent className="p-3 md:p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-xs font-medium text-muted-foreground">평균 소진율</p>
              <p className="text-xl md:text-2xl font-bold">{avgUsageRate}<span className="text-sm font-normal text-muted-foreground ml-1">%</span></p>
            </div>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-full hidden sm:block">
              <Activity className="w-4 h-4 md:w-5 md:h-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border shadow-sm">
          <CardContent className="p-3 md:p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-xs font-medium text-muted-foreground">전체 직원</p>
              <p className="text-xl md:text-2xl font-bold">{totalStaffCount}<span className="text-sm font-normal text-muted-foreground ml-1">명</span></p>
            </div>
            <div className="p-2 bg-slate-50 text-slate-600 rounded-full hidden sm:block">
              <Users className="w-4 h-4 md:w-5 md:h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 2. 메인 2단 레이아웃 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 좌측: 승인 대기 목록 */}
        <div className="lg:col-span-1 flex flex-col h-[500px]">
          <div className="pb-3 border-b border-slate-200 mb-4 min-h-[64px] flex flex-col justify-end">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                승인 대기 목록
                {pendingRequests.length > 0 && (
                  <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">{pendingRequests.length}</Badge>
                )}
              </h2>
            </div>
            <p className="text-sm text-slate-500 mt-1">대기 중인 휴가 신청을 확인하고 처리하세요.</p>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2.5 pr-2 pb-4">
            {pendingRequests.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-60">
                <FileText className="w-10 h-10 mb-3" />
                <p className="text-sm">대기 중인 휴가 신청이 없습니다.</p>
              </div>
            ) : (
              pendingRequests.map((req: any) => {
                const name = getMemberDisplayName(req.member)
                const initial = name ? name.charAt(0) : '?'
                return (
                  <div key={req.id} className="bg-white p-3.5 rounded-xl border shadow-sm flex flex-col gap-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-9 h-9 border">
                          <AvatarFallback className="bg-primary/5 text-primary text-sm font-bold">{initial}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-sm">{name}</span>
                            <LeaveTypeBadge type={req.leave_type} portion={req.leave_portion} />
                          </div>
                          <span className="text-[11px] text-muted-foreground mt-0.5">{req.start_date} ~ {req.end_date} <strong className="text-slate-700">({req.requested_days}일)</strong></span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button 
                          size="icon"
                          variant="outline" 
                          className="h-8 w-8 rounded-full text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 bg-white" 
                          onClick={() => handleResolve(req.id, 'rejected')}
                          disabled={!!actionLoading}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="icon"
                          className="h-8 w-8 rounded-full bg-[#1D9E75] hover:bg-[#16805f] text-white" 
                          onClick={() => handleResolve(req.id, 'approved')}
                          disabled={!!actionLoading}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {(req.reason || req.attachment_url) && (
                      <div className="flex items-center gap-2 mt-0.5">
                        {req.reason ? (
                          <div className="text-xs bg-slate-50 p-1.5 px-2.5 rounded-md text-slate-600 border border-slate-100 truncate flex-1" title={req.reason}>
                            {req.reason}
                          </div>
                        ) : <div className="flex-1" />}
                        {req.attachment_url && (
                          <a href={req.attachment_url} target="_blank" rel="noopener noreferrer" className="text-[11px] text-blue-600 underline whitespace-nowrap shrink-0">
                            증빙 자료
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* 우측: 월별 캘린더 */}
        <div className="lg:col-span-2 flex flex-col">
          <div className="pb-3 border-b border-slate-200 mb-4 min-h-[64px] flex flex-col justify-end">
            <h2 className="text-lg font-bold text-slate-800">월별 휴가 일정</h2>
            <p className="text-sm text-slate-500 mt-1">모든 직원의 휴가 일정을 캘린더에서 한눈에 확인하세요.</p>
          </div>
          <div className="flex-1 relative leave-calendar-container overflow-hidden bg-white rounded-xl border shadow-sm">
            <style>{`
              .leave-calendar-container .fc { height: auto; font-size: 12px; }
              .leave-calendar-container .fc-theme-standard th { border-color: rgba(0,0,0,0.05); padding: 8px 0; background: #f8fafc; font-weight: 600; color: #475569; font-size: 12px; border-top: none; border-left: none; border-right: none; }
              .leave-calendar-container .fc-theme-standard td { border-color: rgba(0,0,0,0.05); }
              .leave-calendar-container .fc-daygrid-day-top { display: flex; justify-content: center; width: 100%; padding-top: 4px; }
              .leave-calendar-container .fc-daygrid-day-number { padding: 2px; color: #334155; font-weight: 500; font-size: 12px; text-decoration: none !important; }
              .leave-calendar-container .fc-event { border: none; border-radius: 4px; padding: 2px 4px; margin: 2px; font-size: 10.5px; font-weight: 600; cursor: pointer; }
              .leave-calendar-container .fc-day-sun .fc-daygrid-day-number { color: #ef4444 !important; }
              .leave-calendar-container .fc-day-sat .fc-daygrid-day-number { color: #3b82f6 !important; }
              .leave-calendar-container .fc-toolbar-title { font-size: 16px !important; font-weight: 700 !important; color: #1e293b !important; }
              .leave-calendar-container .fc-button-primary { background-color: #fff !important; border: 1px solid #e2e8f0 !important; color: #0f172a !important; text-transform: capitalize !important; }
              .leave-calendar-container .fc-button-primary:hover { background-color: #f1f5f9 !important; }
              .leave-calendar-container .fc-header-toolbar { padding: 12px 16px 0; margin-bottom: 12px !important; }
              .leave-calendar-container .fc-view-harness { border-radius: 0 0 12px 12px; overflow: hidden; }
              @media (max-width: 768px) {
                .leave-calendar-container .fc-toolbar-chunk { display: flex; align-items: center; }
                .leave-calendar-container .fc-toolbar-title { font-size: 14px !important; }
              }
            `}</style>
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              locale={koLocale}
              headerToolbar={{ left: 'prev,next today', center: 'title', right: '' }}
              buttonText={{ today: '오늘' }}
              fixedWeekCount={false}
              dayCellContent={(arg) => arg.date.getDate()}
              events={calendarEvents}
              height="auto"
            />
          </div>
        </div>
      </div>

      {/* 3. 직원별 잔여 연차 테이블 */}
      <div className="flex flex-col">
        <div className="pb-3 border-b border-slate-200 mb-4 flex flex-col md:flex-row md:items-end justify-between gap-4 min-h-[64px]">
          <div className="flex flex-col justify-end">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-800">직원별 잔여 연차 현황</h2>
              <Badge variant="outline" className="bg-slate-50 text-slate-600 font-normal">
                {leaveCalcType === 'fiscal_year' ? '회계연도 기준' : '입사일 기준'}
              </Badge>
            </div>
            <div className="text-sm text-slate-500 mt-1.5 flex flex-col gap-1">
              <p>잔여 연차가 3일 이하인 직원은 붉은색으로 표시됩니다.</p>
              <p>
                현재 <strong className="text-slate-700 font-semibold">{leaveCalcType === 'fiscal_year' ? '회계연도' : '입사일'}</strong> 기준으로 연차가 산정되고 있습니다.{' '}
                <Link href="/dashboard/policies" className="text-[#1D9E75] hover:underline font-medium ml-0.5">
                  [연차 산정 방식 변경]
                </Link>
              </p>
            </div>
          </div>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="이름으로 검색" 
              className="pl-9 h-10 border-slate-200" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="overflow-hidden bg-white border shadow-sm rounded-xl">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-[200px]">직원명</TableHead>
                  <TableHead>근속 기간</TableHead>
                  <TableHead className="w-[300px]">잔여 / 총 연차</TableHead>
                  <TableHead className="text-center">사용</TableHead>
                  <TableHead className="text-center">잔여</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStaff.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">검색 결과가 없습니다.</TableCell></TableRow>
                ) : (
                  filteredStaff.map((staff: any) => {
                    const roleInfo = getStaffRoleInfo(staff, roles)
                    const balance = balances.find((b: any) => b.member_id === staff.id)
                    const hireDate = staff.hired_at || staff.join_date ? new Date(staff.hired_at || staff.join_date).toISOString().split('T')[0] : null
                    const calcTotal = hireDate ? calculateAnnualLeave(hireDate, referenceDate, leaveCalcType) : 0
                    const total = balance?.total_days ?? calcTotal
                    const used = balance?.used_days || 0
                    const remain = total - used
                    const isWarning = remain <= 3
                    const usageRate = total > 0 ? Math.min(100, Math.max(0, (used / total) * 100)) : 0

                    return (
                      <TableRow key={staff.id} className="bg-white hover:bg-slate-50/50">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{getMemberDisplayName(staff)}</span>
                            {roleInfo && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal" style={{ color: roleInfo?.color, borderColor: roleInfo?.color }}>
                                {roleInfo.name}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-slate-600">
                          {hireDate ? (
                            getServicePeriodLabel(hireDate)
                          ) : (
                            <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200 font-medium">
                              입사일 설정 필요
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-2.5 flex-1 bg-slate-100 rounded-full overflow-hidden">
                              <div 
                                className={cn("h-full rounded-full transition-all", isWarning ? "bg-red-500" : "bg-[#1D9E75]")}
                                style={{ width: `${usageRate}%` }}
                              />
                            </div>
                            <span className="text-sm text-slate-600 whitespace-nowrap min-w-[70px] text-right">
                              {remain}일 / {total}일
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-medium text-slate-600">{used}일</TableCell>
                        <TableCell className={cn("text-center font-bold", isWarning ? "text-red-500" : "text-[#1D9E75]")}>{remain}일</TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden flex flex-col divide-y bg-white">
            {filteredStaff.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">검색 결과가 없습니다.</div>
            ) : (
              filteredStaff.map((staff: any) => {
                const roleInfo = getStaffRoleInfo(staff, roles)
                const balance = balances.find((b: any) => b.member_id === staff.id)
                const hireDate = staff.hired_at || staff.join_date ? new Date(staff.hired_at || staff.join_date).toISOString().split('T')[0] : null
                const calcTotal = hireDate ? calculateAnnualLeave(hireDate, referenceDate, leaveCalcType) : 0
                const total = balance?.total_days ?? calcTotal
                const used = balance?.used_days || 0
                const remain = total - used
                const isWarning = remain <= 3
                const usageRate = total > 0 ? Math.min(100, Math.max(0, (used / total) * 100)) : 0

                return (
                  <div key={staff.id} className="p-4 flex flex-col gap-3">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm">{getMemberDisplayName(staff)}</span>
                        {roleInfo && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal" style={{ color: roleInfo?.color, borderColor: roleInfo?.color }}>
                            {roleInfo.name}
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {hireDate ? (
                          getServicePeriodLabel(hireDate)
                        ) : (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-amber-50 text-amber-600 border-amber-200 font-medium">
                            입사일 설정 필요
                          </Badge>
                        )}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">사용 {used}일 / 총 {total}일</span>
                        <span className={cn("font-bold", isWarning ? "text-red-500" : "text-[#1D9E75]")}>잔여 {remain}일</span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={cn("h-full rounded-full transition-all", isWarning ? "bg-red-500" : "bg-[#1D9E75]")}
                          style={{ width: `${usageRate}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* 4. 나의 휴가 신청 (관리자 본인) */}
      {myStaff && (
        <div className="pt-8 border-t border-slate-200 mt-2">
          <h2 className="text-xl font-black text-slate-800 mb-6">나의 휴가 관리</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <LeaveApplicationForm storeId={storeId} myStaff={myStaff} remain={myRemain} onRefresh={onRefresh} />
            </div>
            <div>
              <MyLeaveStatusAndHistory 
                myRequests={myRequests} 
                usageRate={myUsageRate} 
                used={myUsed} 
                remain={myRemain} 
                total={myTotal} 
                isWarning={myRemain <= 3} 
                onCancel={handleCancel}
                cancelLoading={cancelLoading}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// --- 직원 뷰 ---
function EmployeeLeaveView({ storeId, currentUserId, staffList, leaveCalcType, data, onRefresh, referenceDate }: any) {
  const { balances, requests } = data
  const myStaff = staffList.find((s: any) => s.user_id === currentUserId)
  const myRequests = requests.filter((r: any) => r.member_id === myStaff?.id || r.member?.user_id === currentUserId)
  const myBalance = balances.find((b: any) => b.member_id === myStaff?.id)
  
  const hireDate = myStaff?.hired_at || myStaff?.join_date ? new Date(myStaff?.hired_at || myStaff?.join_date).toISOString().split('T')[0] : null
  const calcTotal = hireDate ? calculateAnnualLeave(hireDate, referenceDate, leaveCalcType) : 0
  const total = myBalance?.total_days ?? calcTotal
  const used = myBalance?.used_days || 0
  const remain = total - used
  const isWarning = remain <= 3
  const usageRate = total > 0 ? Math.min(100, Math.max(0, (used / total) * 100)) : 0

  const [cancelLoading, setCancelLoading] = useState<string | null>(null)

  const handleCancel = async (id: string) => {
    if (!window.confirm('신청한 휴가를 취소하시겠습니까?')) return
    setCancelLoading(id)
    try {
      const res = await cancelLeaveRequest(id, storeId)
      if (res.error) toast.error(res.error)
      else {
        toast.success('휴가 신청이 취소되었습니다.')
        onRefresh()
      }
    } catch (e) {
      toast.error('오류가 발생했습니다.')
    } finally {
      setCancelLoading(null)
    }
  }

  return (
    <div className="flex flex-col gap-10 pt-4 md:pt-6">
      {/* 1. 상단 요약 카드 (3개) - Card 유지 */}
      <div className="grid grid-cols-3 gap-3 md:gap-4">
        <Card className="bg-white border shadow-sm">
          <CardContent className="p-4 md:p-6 flex flex-col items-center justify-center text-center h-full">
            <p className="text-xs md:text-sm font-medium text-muted-foreground mb-1 md:mb-2">잔여 연차</p>
            <p className={cn("text-2xl md:text-4xl font-black", isWarning ? "text-red-500" : "text-[#1D9E75]")}>{remain}<span className="text-base font-medium ml-1">일</span></p>
          </CardContent>
        </Card>
        <Card className="bg-white border shadow-sm">
          <CardContent className="p-4 md:p-6 flex flex-col items-center justify-center text-center h-full">
            <p className="text-xs md:text-sm font-medium text-muted-foreground mb-1 md:mb-2">사용한 연차</p>
            <p className="text-2xl md:text-4xl font-black text-slate-700">{used}<span className="text-base font-medium ml-1">일</span></p>
          </CardContent>
        </Card>
        <Card className="bg-white border shadow-sm">
          <CardContent className="p-4 md:p-6 flex flex-col items-center justify-center text-center h-full">
            <p className="text-xs md:text-sm font-medium text-muted-foreground mb-1 md:mb-2">신청 건수</p>
            <p className="text-2xl md:text-4xl font-black text-slate-700">{myRequests.length}<span className="text-base font-medium ml-1">건</span></p>
          </CardContent>
        </Card>
      </div>

      {/* 2. 메인 2단 레이아웃 (Card 제거) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <LeaveApplicationForm storeId={storeId} myStaff={myStaff} remain={remain} onRefresh={onRefresh} />
        </div>
        <div>
          <MyLeaveStatusAndHistory 
            myRequests={myRequests} 
            usageRate={usageRate} 
            used={used} 
            remain={remain} 
            total={total} 
            isWarning={isWarning} 
            onCancel={handleCancel}
            cancelLoading={cancelLoading}
          />
        </div>
      </div>
    </div>
  )
}

// --- 공통 분리된 컴포넌트: 휴가 신청 폼 ---
function LeaveApplicationForm({ storeId, myStaff, remain, onRefresh, myRequests = [] }: any) {
  // 'annual', 'annual_am', 'annual_pm', 'sick', 'unpaid'
  const [selectedType, setSelectedType] = useState<'annual' | 'annual_am' | 'annual_pm' | 'sick' | 'unpaid'>('annual')
  
  const leaveType = selectedType.startsWith('annual') ? 'annual' : selectedType
  const leavePortion = selectedType === 'annual_am' ? 'am' : selectedType === 'annual_pm' ? 'pm' : 'full'

  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [reason, setReason] = useState('')
  const [attachmentUrl, setAttachmentUrl] = useState('')
  const [submitLoading, setSubmitLoading] = useState(false)

  // 반차 선택 시 종료일을 시작일과 동일하게 강제
  useEffect(() => {
    if (leavePortion !== 'full') {
      setEndDate(startDate)
    }
  }, [leavePortion, startDate])

  const requestedDays = useMemo(() => {
    if (!startDate || !endDate) return 0
    if (leavePortion !== 'full') return 0.5
    const s = parseISO(startDate)
    const e = parseISO(endDate)
    if (e < s) return 0
    return differenceInDays(e, s) + 1
  }, [startDate, endDate, leavePortion])

  const deductedDays = useMemo(() => {
    return calculateDeductedDays(leaveType, leavePortion, requestedDays)
  }, [leaveType, leavePortion, requestedDays])

  const checkOverlap = () => {
    const sDate = parseISO(startDate)
    const eDate = leavePortion === 'full' ? parseISO(endDate) : parseISO(startDate)

    for (const req of myRequests) {
      // 대기 중이거나 승인된 요청만 확인
      if (req.status !== 'pending' && req.status !== 'approved') continue

      const reqSDate = parseISO(req.start_date)
      const reqEDate = parseISO(req.end_date)

      // 날짜가 겹치는지 수학적 비교 (시작일 <= 기존종료일 AND 종료일 >= 기존시작일)
      if (sDate <= reqEDate && eDate >= reqSDate) {
        // 둘 중 하나라도 full이면 무조건 충돌
        if (leavePortion === 'full' || req.leave_portion === 'full' || !req.leave_portion) {
          return '해당 날짜에 이미 신청되거나 승인된 종일 휴가가 있습니다.'
        }
        // 같은 반차끼리 충돌
        if (leavePortion === req.leave_portion) {
          const portionName = leavePortion === 'am' ? '오전 반차' : '오후 반차'
          return `해당 날짜에 이미 신청되거나 승인된 ${portionName}가 있습니다.`
        }
      }
    }
    return null
  }

  const handleSubmit = async () => {
    if (requestedDays <= 0) return toast.error('올바른 휴가 기간을 설정해주세요.')
    if (deductedDays > remain) {
      toast.warning('잔여 연차보다 차감 예정 연차가 많습니다.')
    }

    const overlapError = checkOverlap()
    if (overlapError) {
      return toast.error(overlapError)
    }
    
    setSubmitLoading(true)
    try {
      const res = await createLeaveRequest(
        storeId, 
        myStaff.id, 
        leaveType, 
        startDate, 
        leavePortion === 'full' ? endDate : startDate, 
        requestedDays, 
        reason, 
        attachmentUrl,
        leavePortion
      )
      if (res.error) toast.error(res.error)
      else {
        toast.success('휴가 신청이 완료되었습니다.')
        setReason('')
        setAttachmentUrl('')
        setSelectedType('annual')
        onRefresh()
      }
    } catch (e) {
      toast.error('신청 중 오류가 발생했습니다.')
    } finally {
      setSubmitLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="pb-3 border-b border-slate-200 mb-4 min-h-[64px] flex flex-col justify-end">
        <h2 className="text-lg font-bold text-slate-800">휴가 신청</h2>
        <p className="text-sm text-slate-500 mt-1">필요한 휴가 유형과 기간을 선택해주세요.</p>
      </div>
      <div className="flex-1 flex flex-col gap-5 bg-white p-5 md:p-6 rounded-xl border shadow-sm">
        <div className="flex flex-col gap-2">
          <Label className="text-sm font-bold text-slate-700">휴가 유형</Label>
          <div className="flex flex-wrap gap-2 mt-1">
            {[
              { value: 'annual', label: '연차' },
              { value: 'annual_am', label: '오전 반차' },
              { value: 'annual_pm', label: '오후 반차' },
              { value: 'sick', label: '병가' },
              { value: 'unpaid', label: '무급/특별휴가' }
            ].map(type => (
              <button 
                key={type.value}
                onClick={() => setSelectedType(type.value as any)}
                className={cn(
                  "px-4 py-2.5 rounded-full text-sm font-semibold border transition-all active:scale-95",
                  selectedType === type.value 
                    ? type.value.includes('annual_') 
                      ? "bg-slate-800 text-white border-slate-800 shadow-md"
                      : "bg-[#1D9E75] text-white border-[#1D9E75] shadow-md shadow-[#1D9E75]/20" 
                    : "bg-white text-muted-foreground border-slate-200 hover:border-[#1D9E75]/40 hover:bg-slate-50"
                )}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <Label className="text-sm font-bold text-slate-700">시작일</Label>
            <Input type="date" value={startDate} className="h-11 border-slate-200 focus-visible:ring-[#1D9E75]" onChange={e => {
              setStartDate(e.target.value)
              if (e.target.value > endDate) setEndDate(e.target.value)
            }} />
          </div>
          <div className="flex flex-col gap-2">
            <Label className="text-sm font-bold text-slate-700">종료일</Label>
            <Input 
              type="date" 
              value={endDate} 
              className={cn("h-11 border-slate-200 focus-visible:ring-[#1D9E75]", leavePortion !== 'full' && "bg-slate-100 opacity-60")} 
              disabled={leavePortion !== 'full'}
              onChange={e => {
                setEndDate(e.target.value)
                if (e.target.value < startDate) setStartDate(e.target.value)
              }} 
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label className="text-sm font-bold text-slate-700 flex justify-between">
            사유 및 증빙 (선택)
          </Label>
          <Textarea 
            placeholder="휴가 사유를 간단히 입력해주세요." 
            className="resize-none h-24 border-slate-200 focus-visible:ring-[#1D9E75]"
            value={reason}
            onChange={e => setReason(e.target.value)}
          />
          <div className="mt-1">
            <LeaveAttachmentUpload storeId={storeId} onUpload={(url) => setAttachmentUrl(url || '')} />
          </div>
        </div>

        <div className="mt-auto pt-6 border-t border-slate-100 flex flex-col gap-4">
          <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-100">
            <span className="font-semibold text-slate-600">차감 예정 연차</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-[#1D9E75]">{deductedDays > 0 ? deductedDays : 0}</span>
              <span className="text-slate-500 font-medium">일</span>
            </div>
          </div>
          <Button 
            className="w-full h-12 text-base font-bold rounded-xl bg-[#1D9E75] hover:bg-[#16805f] text-white shadow-md shadow-[#1D9E75]/20 transition-transform active:scale-[0.98]" 
            onClick={handleSubmit} 
            disabled={submitLoading || requestedDays <= 0}
          >
            휴가 신청하기
          </Button>
        </div>
      </div>
    </div>
  )
}

// --- 공통 분리된 컴포넌트: 나의 연차 현황 및 신청 내역 ---
function MyLeaveStatusAndHistory({ myRequests, usageRate, used, remain, total, isWarning, onCancel, cancelLoading }: any) {
  return (
    <div className="flex flex-col h-full gap-8">
      <div>
        <div className="pb-3 border-b border-slate-200 mb-4 min-h-[64px] flex flex-col justify-end">
          <h2 className="text-lg font-bold text-slate-800">나의 연차 현황</h2>
          <p className="text-sm text-slate-500 mt-1">현재 잔여 연차와 소진율을 확인하세요.</p>
        </div>
        <div className="bg-white p-5 md:p-6 rounded-xl border shadow-sm flex flex-col gap-4">
          <div className="flex justify-between items-end">
            <span className="text-sm font-semibold text-slate-500">연차 소진율</span>
            <span className={cn("text-2xl font-black", isWarning ? "text-red-500" : "text-[#1D9E75]")}>{Math.round(usageRate)}%</span>
          </div>
          <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
            <div 
              className={cn("h-full transition-all duration-500 rounded-full", isWarning ? "bg-red-500" : "bg-[#1D9E75]")}
              style={{ width: `${usageRate}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-sm mt-1">
            <div className="flex gap-4 font-medium">
              <span className="text-slate-600 font-bold">총 {total}일</span>
              <span className="text-slate-500">사용: {used}일</span>
            </div>
            <span className={cn("font-bold text-base", isWarning ? "text-red-500" : "text-[#1D9E75]")}>
              잔여: {remain}일
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col flex-1">
        <div className="pb-3 border-b border-slate-200 mb-4 min-h-[64px] flex flex-col justify-end">
          <h2 className="text-lg font-bold text-slate-800">최근 신청 내역</h2>
          <p className="text-sm text-slate-500 mt-1">이전 휴가 신청 및 처리 결과를 확인하세요.</p>
        </div>
        <div className="flex-1 overflow-y-auto max-h-[350px] space-y-3 pr-2">
          {myRequests.length === 0 ? (
            <div className="h-full min-h-[150px] flex flex-col items-center justify-center text-muted-foreground opacity-60 bg-white rounded-xl border border-dashed">
              <FileText className="w-8 h-8 mb-3" />
              <p className="text-sm">신청 내역이 없습니다.</p>
            </div>
          ) : (
            myRequests.map((req: any) => (
              <div key={req.id} className="p-4 border border-slate-200 rounded-xl bg-white shadow-sm flex flex-col gap-3 transition-colors hover:border-slate-300">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <LeaveTypeBadge type={req.leave_type} portion={req.leave_portion} />
                      <span className="font-bold text-sm text-slate-800">{req.start_date} ~ {req.end_date}</span>
                    </div>
                    <div className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                      <span>차감일수: <strong className="text-slate-700">{req.requested_days}일</strong></span>
                      <span className="text-slate-300">|</span>
                      <span>신청일: {format(new Date(req.created_at), 'yyyy-MM-dd')}</span>
                    </div>
                  </div>
                  <StatusBadge status={req.status} />
                </div>
                
                {req.status === 'pending' && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full mt-1 border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    onClick={() => onCancel(req.id)}
                    disabled={!!cancelLoading}
                  >
                    신청 취소
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}