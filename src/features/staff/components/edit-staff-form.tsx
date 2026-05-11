'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { 
  CalendarDays, Wallet, ShieldCheck, FileText, CheckCircle2, 
  Loader2, User, FileSignature, Mail, Phone, Link2, Link2Off, X,
  AlertTriangle, Clock, ExternalLink, AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatPhoneNumber } from '@/lib/formatters'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { toast } from 'sonner'
import { 
  updateStaffInfo, 
  approveRequest, 
  rejectRequest, 
  removeStaff, 
  inviteRegisteredStaff, 
  cancelContractRequest 
} from '../actions'
import { getStoreRoles, getStoreSettings } from '@/features/store/actions'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { SendContractDialog } from './send-contract-dialog'
import { LinkStaffDialog } from './link-staff-dialog'
import { Button } from '@/components/ui/button'

// --- Types ---
export interface WorkSchedule {
  day: number // 0: 일, 1: 월, ... 6: 토
  start_time: string
  end_time: string
  break_minutes: number
  is_holiday: boolean
}

export interface StaffFormData {
  name: string
  email: string
  phone: string
  memo: string
  roleId: string
  employmentType: string
  wageType: string
  baseWage: string
  hiredAt: string
  address: string
  birthDate: string
  emergencyContact: string
  customPayDay: string 
  weeklyHoliday: string
  contractEndDate: string
  insuranceStatus: {
    employment: boolean
    industrial: boolean
    national: boolean
    health: boolean
  }
  workSchedules: WorkSchedule[]
  customWageSettings: {
    is_custom: boolean
    wage_period_type: 'default' | 'custom'
    wage_start_day: string
    wage_end_day: string
    pay_month: 'current' | 'next'
    is_pay_day_last: boolean
    pay_day: string
  }
}

export interface TabProps {
  formData: StaffFormData
  onChange: (updates: Partial<StaffFormData>) => void
  canEdit: boolean
  isLinked?: boolean
}

// --- 1. Basic & Work Info Section ---
import { TimePicker } from '@/components/ui/time-picker'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

const DAYS = ['일', '월', '화', '수', '목', '금', '토']

interface BasicWorkTabProps extends TabProps {
  roles: any[]
  isOwner: boolean
  weeklyTotalMinutes: number
}

export function BasicWorkInfoSection({ formData, onChange, canEdit, isLinked, roles, isOwner, weeklyTotalMinutes }: BasicWorkTabProps) {
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = formatPhoneNumber(e.target.value)
    onChange({ phone: val })
  }

  const parseEmergencyContact = (contact: string) => {
    if (!contact) return { relation: '', phone: '' }
    const parts = contact.trim().split(' ')
    if (parts.length > 1) {
      const lastPart = parts[parts.length - 1]
      if (/^[\d-]+$/.test(lastPart)) return { phone: lastPart, relation: parts.slice(0, parts.length - 1).join(' ') }
    } else if (/^[\d-]+$/.test(contact.trim())) {
      return { relation: '', phone: contact.trim() }
    }
    return { relation: contact, phone: '' }
  }

  const { relation: emRelation, phone: emPhone } = parseEmergencyContact(formData.emergencyContact || '')

  const handleEmergencyRelationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const relation = e.target.value
    onChange({ emergencyContact: `${relation} ${emPhone}`.trim() })
  }

  const handleEmergencyPhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = formatPhoneNumber(e.target.value)
    onChange({ emergencyContact: `${emRelation} ${val}`.trim() })
  }

  const calculateBreakTime = (start: string, end: string): number => {
    if (!start || !end) return 0
    const [startH, startM] = start.split(':').map(Number)
    const [endH, endM] = end.split(':').map(Number)
    let diffMinutes = (endH * 60 + endM) - (startH * 60 + startM)
    if (diffMinutes < 0) diffMinutes += 24 * 60
    if (diffMinutes >= 8 * 60) return 60
    if (diffMinutes >= 4 * 60) return 30
    return 0
  }

  const handleScheduleChange = (index: number, field: keyof WorkSchedule, value: any) => {
    const next = [...formData.workSchedules]
    const current = { ...next[index], [field]: value }
    if ((field === 'start_time' || field === 'end_time') && !current.is_holiday) {
      current.break_minutes = calculateBreakTime(current.start_time, current.end_time)
    }
    next[index] = current
    onChange({ workSchedules: next })
  }

  return (
    <div className="flex flex-col md:flex-row gap-8 lg:gap-12 w-full">
      <div className="w-full md:flex-[3] shrink-0 space-y-6">
        {/* Personal Details */}
        <div className="grid gap-2">
          <Label htmlFor="name" className="flex items-center">
            이름 
            <Badge variant="outline" className="ml-2 px-1.5 py-0 text-[9px] bg-amber-50 text-amber-600 border-amber-200 font-medium">📝 필수</Badge>
          </Label>
          <Input id="name" name="name" value={formData.name} onChange={(e) => onChange({ name: e.target.value })} disabled={!canEdit} />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="phone" className="flex items-center">
              전화번호
              {(!formData.email) && <Badge variant="outline" className="ml-2 px-1.5 py-0 text-[9px] bg-amber-50 text-amber-600 border-amber-200 font-medium">📝 필수</Badge>}
            </Label>
            <Input id="phone" name="phone" type="tel" value={formData.phone} onChange={handlePhoneChange} placeholder="010-0000-0000" disabled={!canEdit} maxLength={13} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email" className="flex items-center">
              이메일
              {(!formData.phone) && <Badge variant="outline" className="ml-2 px-1.5 py-0 text-[9px] bg-amber-50 text-amber-600 border-amber-200 font-medium">📝 필수</Badge>}
            </Label>
            <Input 
              id="email" 
              name="email" 
              value={formData.email} 
              onChange={(e) => onChange({ email: e.target.value })} 
              disabled={!canEdit || isLinked} 
              className={cn(isLinked && "bg-muted text-muted-foreground")}
              placeholder="example@email.com"
            />
          </div>
        </div>

        {/* Work Roles */}
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label>역할 (직무)</Label>
            {isOwner ? (
              <div className="h-10 px-3 py-2 rounded-md border bg-muted text-muted-foreground text-sm flex items-center">점주 (고정)</div>
            ) : (
              <Select name="roleId" value={formData.roleId || "none"} onValueChange={(v) => onChange({ roleId: v === 'none' ? '' : v })} disabled={!canEdit}>
                <SelectTrigger><SelectValue placeholder="미설정" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    <span className="text-muted-foreground">미설정</span>
                  </SelectItem>
                  {roles
                    .filter(role => !(role.is_system && role.hierarchy_level === 100))
                    .map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: role.color }} />
                          {role.name}
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            )}
          </div>
          
          <div className="grid gap-2">
            <Label className="flex items-center">
              고용 형태
              <Badge variant="outline" className="ml-2 px-1.5 py-0 text-[9px] bg-amber-50 text-amber-600 border-amber-200 font-medium">📝 필수</Badge>
            </Label>
            <Select 
              name="employmentType" 
              value={formData.employmentType} 
              onValueChange={(v) => {
                let wageType = formData.wageType
                if (v === 'fulltime' || v === 'contract') wageType = 'monthly'
                else if (v === 'parttime') wageType = 'hourly'
                else if (v === 'daily') wageType = 'daily'
                onChange({ employmentType: v, wageType })
              }} 
              disabled={!canEdit}
            >
              <SelectTrigger><SelectValue placeholder="선택" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="fulltime">정규직</SelectItem>
                <SelectItem value="contract">계약직</SelectItem>
                <SelectItem value="parttime">파트타임/알바</SelectItem>
                <SelectItem value="daily">일용직/단기</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="grid gap-2">
            <Label htmlFor="hiredAt" className="flex items-center">
              입사일 (근로개시일)
              <Badge variant="outline" className="ml-2 px-1.5 py-0 text-[9px] bg-amber-50 text-amber-600 border-amber-200 font-medium">📝 필수</Badge>
            </Label>
            <Input id="hiredAt" name="hiredAt" type="date" value={formData.hiredAt} onChange={(e) => onChange({ hiredAt: e.target.value })} disabled={!canEdit} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="contractEndDate">계약 종료일</Label>
            <Input id="contractEndDate" name="contractEndDate" type="date" value={formData.contractEndDate} onChange={(e) => onChange({ contractEndDate: e.target.value })} disabled={!canEdit} />
          </div>
        </div>
      </div>

      <div className="hidden md:block w-px bg-border/60 my-2"></div>

      {/* Additional Details */}
      <div className="w-full md:flex-[2] space-y-6">
        <div className="grid grid-cols-2 gap-6">
          <div className="grid gap-2">
            <Label htmlFor="birthDate">생년월일 (6자리)</Label>
            <Input id="birthDate" name="birthDate" value={formData.birthDate} onChange={(e) => onChange({ birthDate: e.target.value })} placeholder="예: 950101" disabled={!canEdit} maxLength={6} />
          </div>
          <div className="grid gap-2">
            <Label>주휴일</Label>
            <Select name="weeklyHoliday" value={formData.weeklyHoliday} onValueChange={(v) => onChange({ weeklyHoliday: v })} disabled={!canEdit}>
              <SelectTrigger><SelectValue placeholder="미지정 (선택안함)" /></SelectTrigger>
              <SelectContent>
                  <SelectItem value="null">미지정</SelectItem>
                  <SelectItem value="0">일요일</SelectItem>
                  <SelectItem value="1">월요일</SelectItem>
                  <SelectItem value="2">화요일</SelectItem>
                  <SelectItem value="3">수요일</SelectItem>
                  <SelectItem value="4">목요일</SelectItem>
                  <SelectItem value="5">금요일</SelectItem>
                  <SelectItem value="6">토요일</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="address">주소지</Label>
          <Input id="address" name="address" value={formData.address} onChange={(e) => onChange({ address: e.target.value })} placeholder="시/도 구/군 동 상세주소" disabled={!canEdit} />
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="grid gap-2">
            <Label htmlFor="emRelation">비상연락망 (관계)</Label>
            <Input id="emRelation" value={emRelation} onChange={handleEmergencyRelationChange} placeholder="예: 어머니" disabled={!canEdit} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="emPhone">전화번호</Label>
            <Input id="emPhone" type="tel" value={emPhone} onChange={handleEmergencyPhoneChange} placeholder="010-0000-0000" disabled={!canEdit} maxLength={13} />
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="memo">직원 메모</Label>
          <Textarea id="memo" name="memo" value={formData.memo} onChange={(e) => onChange({ memo: e.target.value })} disabled={!canEdit} placeholder="직원에 대한 특이사항을 남겨주세요." className="h-[88px] resize-none text-sm" />
        </div>
      </div>
    </div>
  )
}

// --- 2. Contract Settings Section ---
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

interface ContractTabProps extends TabProps {
  weeklyTotalMinutes: number
  isOver15Hours: boolean
  storeSettings: any
  staff?: any
}

export function ContractSettingsSection({ formData, onChange, canEdit, weeklyTotalMinutes, isOver15Hours, storeSettings, staff }: ContractTabProps) {
  const handleWageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, '')
    onChange({ baseWage: val })
  }

  const formattedBaseWage = formData.baseWage ? Number(formData.baseWage).toLocaleString() : ''

  const effectiveStoreSetting = useMemo(() => {
    if (!storeSettings) return null;
    const empType = formData.employmentType;
    const exceptions = storeSettings.wage_exceptions || {};
    
    if (exceptions[empType]) {
      return { ...exceptions[empType], is_exception: true };
    }
    
    const isDefaultPeriod = storeSettings.wage_start_day === 1 && storeSettings.wage_end_day === 0;
    return {
      wage_period_type: isDefaultPeriod ? 'default' : 'custom',
      wage_start_day: String(storeSettings.wage_start_day),
      wage_end_day: String(storeSettings.wage_end_day),
      pay_month: storeSettings.wage_exceptions?.pay_month || 'next',
      pay_day: String(storeSettings.pay_day),
      is_pay_day_last: storeSettings.pay_day === 0,
      is_exception: false
    };
  }, [storeSettings, formData.employmentType]);

  const customSet = formData.customWageSettings;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
      <div className="space-y-5">
        <h4 className="font-semibold text-sm flex items-center gap-2 pb-2 border-b"><Wallet className="w-4 h-4"/> 임금 및 지급 설정</h4>
        
        <div className="grid gap-5">
            <div className="grid grid-cols-2 gap-5">
              <div className="grid gap-2">
                <Label htmlFor="wageType" className="flex items-center">
                  지급 기준
                  <Badge variant="outline" className="ml-2 px-1.5 py-0 text-[9px] bg-amber-50 text-amber-600 border-amber-200 font-medium">📝 필수</Badge>
                </Label>
                <Select name="wageType" value={formData.wageType} onValueChange={(v) => onChange({ wageType: v })} disabled={!canEdit}>
                  <SelectTrigger><SelectValue placeholder="선택" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hourly">시급</SelectItem>
                    <SelectItem value="daily">일급</SelectItem>
                    <SelectItem value="monthly">월급</SelectItem>
                    <SelectItem value="yearly">연봉</SelectItem>
                  </SelectContent>
                </Select>
                <input type="hidden" name="wageType" value={formData.wageType} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="baseWage" className="flex items-center">
                  {formData.wageType === 'hourly' ? '시급' : formData.wageType === 'daily' ? '일급' : formData.wageType === 'monthly' ? '월 기본급' : '연봉'} (원)
                  <Badge variant="outline" className="ml-2 px-1.5 py-0 text-[9px] bg-amber-50 text-amber-600 border-amber-200 font-medium">📝 필수</Badge>
                </Label>
                <Input id="baseWage" name="baseWage" type="text" inputMode="numeric" value={formattedBaseWage} onChange={handleWageChange} className="font-mono" disabled={!canEdit} placeholder="0" />
              </div>
            </div>
            
            <div className="bg-primary/5 p-3 rounded-md border border-primary/10 text-sm">
              <div className="flex justify-between items-center text-primary/80 mb-1">
                <span>{formData.wageType === 'monthly' ? '예상 연봉 (월급 * 12)' : formData.wageType === 'yearly' ? '예상 월급 (연봉 / 12)' : '기본 스케줄 기준 월 예상 급여'}</span>
                <span className="font-bold text-primary">
                  {(() => {
                      const base = parseInt(formData.baseWage) || 0
                      if (formData.wageType === 'monthly') return (base * 12).toLocaleString()
                      if (formData.wageType === 'yearly') return Math.round(base / 12).toLocaleString()
                      if (formData.wageType === 'daily') {
                        let workDays = 0
                        formData.workSchedules.forEach(sch => {
                          if (!sch.is_holiday && sch.start_time && sch.end_time) workDays++
                        })
                        return Math.round(base * workDays * 4.345).toLocaleString()
                      }
                      const weeklyPay = (weeklyTotalMinutes / 60) * base
                      return Math.round(weeklyPay * 4.345).toLocaleString()
                  })()} 원
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground/80 text-right">* 비과세 식대, 주휴수당, 초과수당 등 미포함 산정액</p>
            </div>

            <div className="grid gap-4 mt-4 pt-4 border-t border-border/50">
              <Label className="text-sm font-semibold">정산 및 지급 정책 적용</Label>
              <RadioGroup 
                value={customSet.is_custom ? 'custom' : 'store'} 
                onValueChange={(val) => onChange({ customWageSettings: { ...customSet, is_custom: val === 'custom' } })}
                disabled={!canEdit}
                className="flex flex-col gap-4"
              >
                <div className="flex items-start space-x-3">
                  <RadioGroupItem value="store" id="rule-store" className="mt-1" />
                  <div className="space-y-2 flex-1">
                    <Label htmlFor="rule-store" className="font-medium cursor-pointer text-[13px]">
                      {effectiveStoreSetting?.is_exception 
                        ? `'${formData.employmentType === 'parttime' ? '파트타임' : formData.employmentType}' 고용형태 정책 따름` 
                        : '매장 기본 정책 따름'}
                    </Label>
                    {!customSet.is_custom && effectiveStoreSetting && (
                      <div className="bg-muted/30 p-3 rounded-md border text-xs text-muted-foreground space-y-1.5 opacity-80 pointer-events-none">
                        <div className="flex items-center justify-between">
                          <span>정산 기간</span>
                          <span className="font-medium text-foreground">
                            {effectiveStoreSetting.wage_period_type === 'default' ? '매월 1일 ~ 말일' : `전월 ${effectiveStoreSetting.wage_start_day}일 ~ 당월 ${effectiveStoreSetting.wage_end_day === '0' ? '말일' : effectiveStoreSetting.wage_end_day + '일'}`}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>지급일</span>
                          <span className="font-medium text-foreground">
                            {effectiveStoreSetting.pay_month === 'current' ? '당월' : '익월'} {effectiveStoreSetting.is_pay_day_last || effectiveStoreSetting.pay_day === '0' ? '말일' : `${effectiveStoreSetting.pay_day}일`} 지급
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <RadioGroupItem value="custom" id="rule-custom" className="mt-1" />
                  <div className="space-y-3 flex-1 min-w-0">
                    <Label htmlFor="rule-custom" className="font-medium cursor-pointer text-[13px]">직원 개별 예외 설정 (계약서 전용)</Label>
                    {customSet.is_custom && (
                      <div className="bg-background p-4 rounded-md border shadow-sm space-y-5">
                        <div className="space-y-3">
                          <Label className="text-[12px] text-muted-foreground">정산 기간</Label>
                          <RadioGroup 
                            value={customSet.wage_period_type} 
                            onValueChange={(val: any) => onChange({ customWageSettings: { ...customSet, wage_period_type: val, wage_start_day: val === 'default' ? '1' : customSet.wage_start_day, wage_end_day: val === 'default' ? '0' : customSet.wage_end_day } })}
                            disabled={!canEdit}
                            className="flex flex-col gap-2"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="default" id="c-period-default" className="w-3.5 h-3.5" />
                              <Label htmlFor="c-period-default" className="font-normal cursor-pointer text-[13px]">매월 1일 ~ 말일</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="custom" id="c-period-custom" className="w-3.5 h-3.5" />
                              <Label htmlFor="c-period-custom" className="font-normal cursor-pointer text-[13px]">직접 설정</Label>
                            </div>
                          </RadioGroup>
                          {customSet.wage_period_type === 'custom' && (
                            <div className="flex items-center gap-2 p-2 bg-muted/20 rounded border flex-wrap mt-1">
                              <div className="flex items-center gap-1.5 bg-background p-1 rounded border shadow-sm">
                                <span className="px-1.5 py-0.5 bg-muted rounded text-[12px] font-medium text-muted-foreground">전월</span>
                                <Input type="number" min="1" max="31" value={customSet.wage_start_day} onChange={(e) => onChange({ customWageSettings: { ...customSet, wage_start_day: e.target.value, wage_end_day: String(parseInt(e.target.value) === 1 ? 0 : parseInt(e.target.value) - 1) } })} disabled={!canEdit} className="w-10.5 h-6 text-center border-none shadow-none focus-visible:ring-0 px-1 text-[13px]" />
                                <span className="text-[12px] font-medium pr-1">일</span>
                              </div>
                              <span className="text-muted-foreground font-medium text-[12px]">~</span>
                              <div className="flex items-center gap-1.5 bg-background p-1 rounded border shadow-sm">
                                <span className="px-1.5 py-0.5 bg-primary/10 text-primary rounded text-[12px] font-medium">당월</span>
                                <Input type="number" min="0" max="31" value={customSet.wage_end_day} onChange={(e) => onChange({ customWageSettings: { ...customSet, wage_end_day: e.target.value } })} disabled={!canEdit} className="w-10.5 h-6 text-center border-none shadow-none focus-visible:ring-0 px-1 text-[13px]" />
                                <span className="text-[12px] font-medium pr-1">{customSet.wage_end_day === '0' ? '말일' : '일'}</span>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label className="text-[12px] text-muted-foreground">급여 지급일</Label>
                          <div className="flex flex-wrap items-center gap-2">
                            <Select value={customSet.pay_month} onValueChange={(v: any) => onChange({ customWageSettings: { ...customSet, pay_month: v } })} disabled={!canEdit}>
                              <SelectTrigger className="w-20 h-7 text-[12px]"><SelectValue placeholder="지급 월" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="current" className="text-[12px]">당월</SelectItem>
                                <SelectItem value="next" className="text-[12px]">익월</SelectItem>
                              </SelectContent>
                            </Select>
                            <div className="flex items-center gap-1.5">
                              <Input type="number" min="1" max="31" value={customSet.is_pay_day_last ? '' : customSet.pay_day} onChange={(e) => onChange({ customWageSettings: { ...customSet, pay_day: e.target.value } })} disabled={customSet.is_pay_day_last || !canEdit} className="w-11.5 h-7 text-center text-[12px]" />
                              <span className="text-[12px] font-medium">일</span>
                            </div>
                            <div className="flex items-center space-x-1.5 ml-1">
                              <Checkbox id="staff-pay-day-last" checked={customSet.is_pay_day_last} onCheckedChange={(c) => onChange({ customWageSettings: { ...customSet, is_pay_day_last: !!c, pay_day: !!c ? '0' : customSet.pay_day } })} disabled={!canEdit} className="w-3.5 h-3.5" />
                              <Label htmlFor="staff-pay-day-last" className="text-[12px] font-medium cursor-pointer">말일 지급</Label>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </RadioGroup>
            </div>
        </div>
      </div>

      <div className="space-y-5">
        <div className="flex items-center justify-between pb-2 border-b">
            <h4 className="font-semibold text-sm flex items-center gap-2"><ShieldCheck className="w-4 h-4"/> 4대 사회보험 적용</h4>
            <div className={cn("px-2 py-0.5 rounded text-[11px] font-semibold", isOver15Hours ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" : "bg-muted text-muted-foreground")}>
              주 소정근로 {Math.floor(weeklyTotalMinutes / 60)}h {weeklyTotalMinutes % 60}m
            </div>
        </div>
        <div className="flex flex-wrap gap-4 p-3 bg-muted/20 border rounded-lg items-center">
            <div className="flex items-center space-x-2">
              <Checkbox id="ins_emp" className="w-3.5 h-3.5" checked={isOver15Hours ? true : formData.insuranceStatus.employment} onCheckedChange={(c) => onChange({ insuranceStatus: { ...formData.insuranceStatus, employment: !!c } })} disabled={!canEdit || isOver15Hours} />
              <Label htmlFor="ins_emp" className="cursor-pointer font-medium text-[13px]">고용보험</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="ins_ind" className="w-3.5 h-3.5" checked={true} disabled={true} />
              <Label htmlFor="ins_ind" className="cursor-pointer font-medium text-[13px] text-muted-foreground">산재보험</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="ins_nat" className="w-3.5 h-3.5" checked={isOver15Hours ? true : formData.insuranceStatus.national} onCheckedChange={(c) => onChange({ insuranceStatus: { ...formData.insuranceStatus, national: !!c } })} disabled={!canEdit || isOver15Hours} />
              <Label htmlFor="ins_nat" className="cursor-pointer font-medium text-[13px]">국민연금</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="ins_health" className="w-3.5 h-3.5" checked={isOver15Hours ? true : formData.insuranceStatus.health} onCheckedChange={(c) => onChange({ insuranceStatus: { ...formData.insuranceStatus, health: !!c } })} disabled={!canEdit || isOver15Hours} />
              <Label htmlFor="ins_health" className="cursor-pointer font-medium text-[13px]">건강보험</Label>
            </div>
            <span className="text-xs text-muted-foreground ml-auto pr-1">{isOver15Hours ? <span className="text-blue-600 dark:text-blue-400 font-medium">15h+ 자동적용</span> : <span>15h 미만</span>}</span>
        </div>

      </div>
    </div>
  )
}

// --- 3. Schedule Section ---
interface ScheduleTabProps extends TabProps {
  weeklyTotalMinutes: number
}

export function ScheduleSection({ formData, onChange, canEdit, weeklyTotalMinutes }: ScheduleTabProps) {
  const handleScheduleChange = (index: number, field: keyof WorkSchedule, value: any) => {
    const next = [...formData.workSchedules]
    const current = { ...next[index], [field]: value }
    if ((field === 'start_time' || field === 'end_time') && !current.is_holiday) {
      const calculateBreakTime = (start: string, end: string): number => {
        if (!start || !end) return 0
        const [startH, startM] = start.split(':').map(Number)
        const [endH, endM] = end.split(':').map(Number)
        let diffMinutes = (endH * 60 + endM) - (startH * 60 + startM)
        if (diffMinutes < 0) diffMinutes += 24 * 60
        if (diffMinutes >= 8 * 60) return 60
        if (diffMinutes >= 4 * 60) return 30
        return 0
      }
      current.break_minutes = calculateBreakTime(current.start_time, current.end_time)
    }
    next[index] = current
    onChange({ workSchedules: next })
  }

  return (
    <div className="flex-1 flex flex-col min-h-[400px] w-full">
      <div className="pb-4 border-b flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold flex items-center gap-2"><CalendarDays className="w-4 h-4"/> 주간 근무 스케줄</span>
          <Badge variant="outline" className="px-1.5 py-0 text-[9px] bg-amber-50 text-amber-600 border-amber-200 font-medium hidden sm:inline-flex">📝 필수</Badge>
        </div>
        <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground hidden lg:inline-block">주 소정근로:</span>
            <Badge variant="outline" className="font-mono bg-background text-sm px-2 py-0.5">
              {Math.floor(weeklyTotalMinutes / 60)}h {weeklyTotalMinutes % 60}m
            </Badge>
        </div>
      </div>
      <div className="flex-1 min-h-0 pt-4">
        <div className="divide-y divide-border/30">
          {formData.workSchedules.map((schedule, index) => (
            <div key={index} className={cn("flex flex-col sm:flex-row items-start sm:items-center gap-y-2 gap-x-8 py-3 lg:py-4 transition-colors", schedule.is_holiday ? "opacity-70" : "hover:bg-muted/5")}>
              <div className="flex items-center gap-2 w-20 shrink-0 mt-1 sm:mt-0">
                <Checkbox 
                  id={`day-${index}`} checked={!schedule.is_holiday}
                  onCheckedChange={(checked) => handleScheduleChange(index, 'is_holiday', !checked)}
                  disabled={!canEdit} className="h-4 w-4"
                />
                <Label htmlFor={`day-${index}`} className={cn("cursor-pointer font-medium text-[13px]", schedule.day === 0 ? "text-red-500" : schedule.day === 6 ? "text-blue-500" : "")}>
                  {DAYS[schedule.day]}요일
                </Label>
              </div>

              {!schedule.is_holiday ? (
                <div className="flex flex-wrap sm:flex-nowrap items-center flex-1 w-full justify-between gap-y-2 gap-x-2">
                  <div className="flex items-center gap-2">
                    <TimePicker value={schedule.start_time} onChange={(val) => handleScheduleChange(index, 'start_time', val)} disabled={!canEdit} className="w-[110px]" />
                    <span className="text-muted-foreground/50 text-xs font-medium shrink-0">~</span>
                    <TimePicker value={schedule.end_time} onChange={(val) => handleScheduleChange(index, 'end_time', val)} disabled={!canEdit} className="w-[110px]" />
                  </div>
                  <div className="flex items-center gap-2 bg-muted/40 px-2 py-1 rounded-md border border-border/50 shrink-0 ml-auto sm:ml-0">
                    <span className="text-xs font-medium text-muted-foreground">휴게</span>
                    <Input
                      type="number" value={schedule.break_minutes}
                      onChange={(e) => handleScheduleChange(index, 'break_minutes', parseInt(e.target.value) || 0)}
                      className="w-14 h-7 text-xs text-center px-1 bg-background"
                      min={0} step={10} disabled={!canEdit}
                    />
                    <span className="text-[11px] text-muted-foreground">분</span>
                  </div>
                </div>
              ) : (
                <div className="flex-1 w-full flex items-center">
                  <span className="text-xs text-muted-foreground/50 italic px-1">휴무일</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// --- 4. Contract Section ---
export function ContractFilesSection({ formData, staff, readinessPercent, isContractReady, onSendClick }: { formData: StaffFormData, staff: any, readinessPercent: number, isContractReady: boolean, onSendClick: () => void }) {
  return (
    <div className="space-y-6 w-full">
      <div className="flex items-center justify-between pb-2 border-b">
        <div className="flex items-center gap-3">
          <h4 className="font-semibold text-sm flex items-center gap-2 text-foreground/90"><FileText className="w-4 h-4" /> 전자 근로계약서 체결 현황</h4>
          <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/20">
            {formData.employmentType === 'parttime' ? '단시간 근로자 표준근로계약서' : formData.employmentType === 'daily' ? '일용 근로자 표준근로계약서' : '표준근로계약서'}
          </Badge>
        </div>
        
        <Button 
          variant={isContractReady ? "default" : "outline"}
          size="sm" 
          onClick={onSendClick}
          disabled={!isContractReady}
          className={cn(isContractReady ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "", "h-8")}
        >
          <FileSignature className="w-4 h-4 mr-2" />
          계약서 발송 ({readinessPercent}%)
        </Button>
      </div>
      <div className="bg-background border rounded-lg p-5 flex flex-col gap-4 relative overflow-hidden">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-[14px] text-foreground">진행 상태</p>
              <Badge variant="outline" className={cn(
                staff?.contract_status === 'signed' ? "bg-emerald-50 text-emerald-600 border-emerald-200" :
                staff?.contract_status === 'sent' || staff?.contract_status === 'pending_staff' ? "bg-amber-50 text-amber-600 border-amber-200" : "bg-muted text-muted-foreground border-muted-foreground/20"
              )}>
                {staff?.contract_status === 'signed' ? <><CheckCircle2 className="w-3 h-3 mr-1" /> 체결 완료</> : staff?.contract_status === 'sent' || staff?.contract_status === 'pending_staff' ? <><Clock className="w-3 h-3 mr-1" /> 서명 대기</> : '미발송'}
              </Badge>
            </div>
            <p className="text-[12px] text-muted-foreground">{staff?.contract_status === 'signed' ? '근로자와의 전자계약 체결이 모두 완료되었습니다.' : '입력된 근로 조건을 바탕으로 전자계약서를 발송할 수 있습니다.'}</p>
          </div>
        </div>
        {staff?.contract_status === 'signed' && staff?.contract_file_url ? (
          <div className="flex items-center justify-between mt-2 p-3 bg-muted/40 border rounded-lg hover:bg-muted/60 transition-colors cursor-pointer" onClick={() => window.open(staff.contract_file_url, '_blank')}>
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-10 h-10 rounded bg-red-100/80 text-red-600 flex items-center justify-center shrink-0"><FileText className="w-5 h-5" /></div>
              <div className="flex flex-col min-w-0">
                <span className="text-[13px] font-medium text-foreground truncate block">근로계약서_{formData.name}.pdf</span>
                <span className="text-[11px] text-muted-foreground flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>전자 서명 및 교부 완료</span>
              </div>
            </div>
            <Button type="button" variant="ghost" size="icon" className="w-8 h-8 rounded-full" title="문서 열람"><ExternalLink className="w-4 h-4" /></Button>
          </div>
        ) : (
          <div className="mt-4 p-8 border border-dashed rounded-lg flex flex-col items-center justify-center text-center space-y-3 bg-muted/10">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <FileSignature className="w-6 h-6 text-muted-foreground/50" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">저장된 근로계약서가 없습니다</p>
              <p className="text-xs text-muted-foreground/60">필수 정보를 모두 입력하고 계약서를 전송해 보세요.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// --- Main EditStaffForm Component ---
interface EditStaffFormProps {
  staff: any
  storeId: string
  canManage: boolean
  isReadOnly?: boolean
  isPageMode?: boolean
  onSuccess?: (action: 'approve' | 'reject' | 'remove' | 'update', staffId: string, updatedData?: any) => void
}

const DEFAULT_SCHEDULES = Array.from({ length: 7 }, (_, i) => ({
  day: i, start_time: '09:00', end_time: '18:00', break_minutes: 60, is_holiday: true
}))

const DEFAULT_FORM_DATA: StaffFormData = {
  name: '', email: '', phone: '', memo: '', roleId: '',
  employmentType: 'parttime', wageType: 'hourly', baseWage: '0',
  hiredAt: '', address: '', birthDate: '', emergencyContact: '',
  customPayDay: '', weeklyHoliday: '', contractEndDate: '',
  insuranceStatus: { employment: false, industrial: false, national: false, health: false },
  workSchedules: DEFAULT_SCHEDULES,
  customWageSettings: {
    is_custom: false, wage_period_type: 'default', wage_start_day: '1', wage_end_day: '0', pay_month: 'next', is_pay_day_last: false, pay_day: '10'
  }
}

export function EditStaffForm({ staff, storeId, canManage, isReadOnly = false, isPageMode = false, onSuccess }: EditStaffFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const isCreateMode = !staff || staff.id === 'new'
  
  const [roles, setRoles] = useState<any[]>([])
  const [storeSettings, setStoreSettings] = useState<any>(null)
  const [formData, setFormData] = useState<StaffFormData>(DEFAULT_FORM_DATA)
  const [isDirty, setIsDirty] = useState(false)
  const [showSendDialog, setShowSendDialog] = useState(false)
  const [showLinkDialog, setShowLinkDialog] = useState(false)
  const [showApproveConfirm, setShowApproveConfirm] = useState(false)
  const [showRejectConfirm, setShowRejectConfirm] = useState(false)

  const handleFormChange = (updates: Partial<StaffFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }))
    setIsDirty(true)
  }

  const weeklyTotalMinutes = useMemo(() => {
    const schedules = formData?.workSchedules || []
    return schedules.reduce((acc, sch) => {
      if (!sch.is_holiday && sch.start_time && sch.end_time) {
        const [startH, startM] = sch.start_time.split(':').map(Number)
        const [endH, endM] = sch.end_time.split(':').map(Number)
        let diff = (endH * 60 + endM) - (startH * 60 + startM)
        if (diff < 0) diff += 24 * 60
        diff -= (sch.break_minutes || 0)
        return acc + Math.max(0, diff)
      }
      return acc
    }, 0)
  }, [formData?.workSchedules])

  const isOver15Hours = weeklyTotalMinutes >= 15 * 60

  useEffect(() => {
    if (storeId) {
      getStoreRoles(storeId).then(setRoles)
      getStoreSettings(storeId).then(setStoreSettings)
    }
  }, [storeId])

  useEffect(() => {
    if (staff && staff.id !== 'new') {
      const initialDate = staff.hired_at || staff.joined_at
      setFormData({
        name: staff.profile?.full_name || staff.name || '',
        email: staff.profile?.email || staff.email || '',
        phone: staff.profile?.phone || staff.phone || '',
        memo: staff.memo || '',
        roleId: staff.role_id || '',
        employmentType: staff.employment_type || 'parttime',
        wageType: staff.wage_type || 'hourly',
        baseWage: staff.base_wage?.toString() || '0',
        hiredAt: initialDate ? new Date(initialDate).toISOString().split('T')[0] : '',
        address: staff.address || '', birthDate: staff.birth_date || '', emergencyContact: staff.emergency_contact || '',
        customPayDay: staff.custom_pay_day?.toString() || '', weeklyHoliday: staff.weekly_holiday?.toString() || '',
        contractEndDate: staff.contract_end_date ? new Date(staff.contract_end_date).toISOString().split('T')[0] : '',
        insuranceStatus: staff.insurance_status || { employment: false, industrial: false, national: false, health: false },
        workSchedules: staff.work_schedules || DEFAULT_SCHEDULES,
        customWageSettings: staff.custom_wage_settings || DEFAULT_FORM_DATA.customWageSettings
      })
      setIsDirty(false)
    } else {
      setFormData({ ...DEFAULT_FORM_DATA, hiredAt: new Date().toISOString().split('T')[0] })
      setIsDirty(false)
    }
  }, [staff])

  const handleSave = async () => {
    if (!canManage || isReadOnly || (staff?.resigned_at)) return
    setLoading(true)
    const fd = new FormData()
    Object.entries(formData).forEach(([k, v]) => {
      if (['workSchedules', 'insuranceStatus', 'customWageSettings'].includes(k)) fd.append(k, JSON.stringify(v))
      else if (v != null) fd.append(k, v.toString())
    })
    fd.set('insuranceStatus', JSON.stringify({ employment: isOver15Hours || formData.insuranceStatus.employment, industrial: true, national: isOver15Hours || formData.insuranceStatus.national, health: isOver15Hours || formData.insuranceStatus.health }))

    const result = isCreateMode ? await (await import('../actions')).createManualStaff(storeId, fd) : await updateStaffInfo(storeId, staff.id, fd)
    setLoading(false)
    if ((result as any)?.error) toast.error('실패', { description: (result as any).error })
    else {
      toast.success('성공')
      if (isCreateMode && isPageMode) router.push('/dashboard/staff')
      if (onSuccess) onSuccess('update', staff?.id || 'new', formData)
      router.refresh()
    }
  }

  const handleApprove = async () => {
    setLoading(true)
    await approveRequest(storeId, staff.id)
    setLoading(false)
    toast.success('승인 완료')
    if (onSuccess) onSuccess('approve', staff.id)
    router.refresh()
  }

  const handleReject = async () => {
    setLoading(true)
    await rejectRequest(storeId, staff.id)
    setLoading(false)
    toast.success('거절 완료')
    if (onSuccess) onSuccess('reject', staff.id)
    router.refresh()
  }

  const handleRemove = async () => {
    if (!confirm('정말 퇴사 처리하시겠습니까?')) return
    setLoading(true)
    await removeStaff(storeId, staff.id)
    setLoading(false)
    toast.success('퇴사 처리 완료')
    if (isPageMode) {
      router.push('/dashboard/staff?tab=resigned')
    }
    if (onSuccess) onSuccess('remove', staff.id)
    router.refresh()
  }

  const isPending = staff?.status === 'pending_approval' || staff?.status === 'invited'
  const isContractSent = staff?.contract_status === 'sent' || staff?.contract_status === 'pending_staff'
  const isLinked = !!staff?.user_id
  const canEdit = canManage && !staff?.resigned_at && !isReadOnly
  const displayName = staff?.profile?.full_name || formData.name || (isCreateMode ? '신규 등록' : '성명 미상')

  const contractRequirements = [
    { label: '이름', fulfilled: !!formData.name },
    { label: '연락처', fulfilled: !!(formData.email || formData.phone) },
    { label: '고용 형태', fulfilled: !!formData.employmentType },
    { label: '입사일', fulfilled: !!formData.hiredAt },
    { label: '스케줄', fulfilled: weeklyTotalMinutes > 0 },
    { label: '급여', fulfilled: !!formData.baseWage && formData.baseWage !== '0' }
  ]
  const readinessPercent = Math.round((contractRequirements.filter(r => r.fulfilled).length / contractRequirements.length) * 100)
  const isContractReady = readinessPercent === 100

  return (
    <div className={cn("flex flex-col h-[calc(100vh-80px)] md:h-[calc(100vh-100px)]", staff?.resigned_at && "opacity-95")}>
      {/* Dynamic Page Header */}
      <div className="flex items-center justify-between py-6 shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild className="rounded-full hover:bg-white shadow-sm border bg-white">
            <Link href="/dashboard/staff">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h3 className="text-2xl font-bold tracking-tight text-slate-900">
              {isCreateMode ? '신규 직원 등록' : '직원 상세 정보'}
            </h3>
            <p className="text-sm text-muted-foreground mt-1 hidden sm:block">
              {isCreateMode 
                ? '새로운 직원의 정보를 입력하여 명부에 등록합니다.' 
                : '직원의 인적 사항, 급여 조건, 계약서 등을 관리합니다.'}
            </p>
          </div>
        </div>

        {/* Save & Top Actions */}
        <div className="flex items-center gap-2">
          {!isCreateMode && isPending && (
            <Button variant="outline" onClick={() => setShowApproveConfirm(true)}>즉시 합류</Button>
          )}
          {canEdit && (
             <Button 
               onClick={handleSave} 
               disabled={!isDirty || loading} 
               className={cn("min-w-24 font-bold transition-all shadow-sm", isDirty ? "bg-primary text-primary-foreground scale-105" : "bg-muted text-muted-foreground border opacity-70 hover:bg-muted")}
             >
               {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : '저장'}
             </Button>
           )}
        </div>
      </div>

      <div className="flex-1 bg-white rounded-xl border shadow-sm flex flex-col overflow-hidden relative mb-6 min-h-0">
        <Tabs defaultValue="basic" className="flex-1 flex flex-col w-full min-h-0 gap-0">
          <div className="px-6 pt-2 border-b shrink-0 bg-white">
            <TabsList 
              variant="line"
              className="w-full justify-start h-auto p-0 gap-8 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
            >
              <TabsTrigger 
                value="basic" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:ring-0 px-0 pb-4 pt-2 font-semibold text-muted-foreground data-[state=active]:text-foreground shadow-none after:hidden"
              >
                기본 정보
              </TabsTrigger>
              <TabsTrigger 
                value="schedule" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:ring-0 px-0 pb-4 pt-2 font-semibold text-muted-foreground data-[state=active]:text-foreground shadow-none after:hidden"
              >
                스케줄
              </TabsTrigger>
              <TabsTrigger 
                value="payroll" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:ring-0 px-0 pb-4 pt-2 font-semibold text-muted-foreground data-[state=active]:text-foreground shadow-none after:hidden"
              >
                근로 조건 및 급여
              </TabsTrigger>
              {!isCreateMode && (
                <TabsTrigger 
                  value="contracts" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:ring-0 px-0 pb-4 pt-2 font-semibold text-muted-foreground data-[state=active]:text-foreground shadow-none after:hidden"
                >
                  계약서
                </TabsTrigger>
              )}
            </TabsList>
          </div>

          <ScrollArea className="flex-1 min-h-0">
            <div className="p-8">
              {/* Profile Summary Header inside the content area for better flow */}
              {!isCreateMode && (
                <div className="flex flex-col md:flex-row items-center gap-6 p-6 mb-8 bg-slate-50/50 rounded-xl border border-slate-100">
                  <Avatar className="h-20 w-20 border-4 border-white shadow-sm shrink-0">
                    <AvatarImage src={staff?.profile?.avatar_url} />
                    <AvatarFallback className="text-xl bg-primary/10 text-primary font-bold">{displayName.slice(0, 2)}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="text-xl font-bold text-foreground">{displayName}</h3>
                      {formData.roleId && (
                        <div className="px-2.5 py-0.5 rounded-full text-[11px] font-bold border bg-white shadow-sm" style={{ color: roles.find(r => r.id === formData.roleId)?.color }}>
                          {roles.find(r => r.id === formData.roleId)?.name || '직원'}
                        </div>
                      )}
                      <Badge variant={staff?.resigned_at ? "destructive" : isPending ? "outline" : "secondary"} className="shadow-sm">
                        {staff?.resigned_at ? '퇴사자' : isPending ? (isContractSent ? '서명 대기' : '승인 대기') : '재직중'}
                      </Badge>
                      {isLinked ? (
                        <Badge variant="outline" className="text-[10px] bg-white border-dashed text-muted-foreground">
                          <Link2 className="w-3 h-3 mr-1" /> 연동됨
                        </Badge>
                      ) : (
                        !isCreateMode && canEdit && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-6 px-2 text-[10px] border-dashed text-primary hover:text-primary hover:bg-primary/5 gap-1"
                            onClick={() => setShowLinkDialog(true)}
                          >
                            <Link2 className="w-3 h-3" />
                            앱 계정 연동
                          </Button>
                        )
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground flex gap-4 mt-1">
                      {formData.email && <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" />{formData.email}</span>}
                      {formData.phone && <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" />{formatPhoneNumber(formData.phone)}</span>}
                    </div>
                  </div>
                </div>
              )}

              <TabsContent value="basic" className="m-0 focus-visible:outline-none focus-visible:ring-0">
                <BasicWorkInfoSection formData={formData} onChange={handleFormChange} canEdit={canEdit} isLinked={isLinked} roles={roles} isOwner={staff?.role === 'owner'} weeklyTotalMinutes={weeklyTotalMinutes} />
              </TabsContent>

              <TabsContent value="schedule" className="m-0 focus-visible:outline-none focus-visible:ring-0">
                <ScheduleSection formData={formData} onChange={handleFormChange} canEdit={canEdit} weeklyTotalMinutes={weeklyTotalMinutes} />
              </TabsContent>

              <TabsContent value="payroll" className="m-0 focus-visible:outline-none focus-visible:ring-0">
                <ContractSettingsSection formData={formData} onChange={handleFormChange} canEdit={canEdit} weeklyTotalMinutes={weeklyTotalMinutes} isOver15Hours={isOver15Hours} storeSettings={storeSettings} staff={staff} />
              </TabsContent>

              {!isCreateMode && (
                <TabsContent value="contracts" className="m-0 focus-visible:outline-none focus-visible:ring-0">
                  <ContractFilesSection 
                    formData={formData} 
                    staff={staff} 
                    readinessPercent={readinessPercent} 
                    isContractReady={isContractReady}
                    onSendClick={() => setShowSendDialog(true)}
                  />
                </TabsContent>
              )}
            </div>
          </ScrollArea>
        </Tabs>

        {/* Footer Actions / Danger Zone */}
        {canEdit && !isCreateMode && (
          <div className="bg-slate-50/80 px-6 py-4 border-t flex justify-between items-center shrink-0">
            <span className="text-xs text-muted-foreground">직원 관리에 필요한 추가 동작을 수행할 수 있습니다.</span>
            <div className="flex gap-2">
              {isPending && <Button variant="outline" size="sm" onClick={() => setShowRejectConfirm(true)} className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200">초대 거절</Button>}
              {staff?.role !== 'owner' && <Button variant="ghost" size="sm" onClick={handleRemove} className="text-muted-foreground hover:text-red-600 hover:bg-red-50">퇴사 처리</Button>}
            </div>
          </div>
        )}
      </div>

      <SendContractDialog open={showSendDialog} onOpenChange={setShowSendDialog} staff={staff} storeId={storeId} onSendSuccess={() => { router.refresh(); if (onSuccess) onSuccess('update', staff.id) }} />
      <LinkStaffDialog open={showLinkDialog} onOpenChange={setShowLinkDialog} staff={{ id: staff?.id, name: formData.name, email: formData.email }} storeId={storeId} inviteCode={storeSettings?.invite_code} />
      <AlertDialog open={showApproveConfirm} onOpenChange={setShowApproveConfirm}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle className="text-red-600 flex gap-2"><AlertTriangle />수면(종이) 계약 확인</AlertDialogTitle><AlertDialogDescription>이미 서면으로 계약을 완료하셨나요? 전자 계약 없이 즉시 합류 처리합니다.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>취소</AlertDialogCancel><AlertDialogAction onClick={handleApprove} className="bg-red-600">네, 체결했습니다</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      <AlertDialog open={showRejectConfirm} onOpenChange={setShowRejectConfirm}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle className="text-red-600">거절 확인</AlertDialogTitle><AlertDialogDescription>해당 직원의 요청을 거절하시겠습니까? 목록에서 삭제됩니다.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>취소</AlertDialogCancel><AlertDialogAction onClick={handleReject} className="bg-red-600">거절하기</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  )
}