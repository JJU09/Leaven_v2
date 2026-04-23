'use client'

import { useState, useEffect, useMemo } from 'react'
import { updateStore } from '../actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { toast } from 'sonner'
import { Save, Plus, Trash2, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'

const EMPLOYMENT_TYPES = [
  { value: 'fulltime', label: '정규직' },
  { value: 'contract', label: '계약직' },
  { value: 'parttime', label: '파트타임/알바' },
  { value: 'probation', label: '수습/교육생' },
  { value: 'daily', label: '일용직/단기' },
]

interface StorePoliciesFormProps {
  initialData: {
    id: string
    wage_start_day?: number
    wage_end_day?: number
    pay_day?: number
    wage_exceptions?: any
    leave_calc_type?: string
  }
}

export function StorePoliciesForm({ initialData }: StorePoliciesFormProps) {
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const initialFormState = useMemo(() => {
    const wStart = initialData.wage_start_day != null ? initialData.wage_start_day : 1
    const wEnd = initialData.wage_end_day != null ? initialData.wage_end_day : 0
    const isDefaultPeriod = wStart === 1 && wEnd === 0
    const isPayDayLast = initialData.pay_day === 0

    return {
      wage_start_day: String(wStart),
      wage_end_day: String(wEnd),
      pay_day: initialData.pay_day != null ? String(initialData.pay_day) : '10',
      wage_exceptions: initialData.wage_exceptions || {},
      wage_period_type: isDefaultPeriod ? 'default' : 'custom',
      pay_month: initialData.wage_exceptions?.pay_month || 'next',
      holiday_rule: initialData.wage_exceptions?.holiday_rule || 'prev',
      is_pay_day_last: isPayDayLast,
      leave_calc_type: initialData.leave_calc_type || 'hire_date',
    }
  }, [initialData])

  const [formData, setFormData] = useState(initialFormState)
  const [isDirty, setIsDirty] = useState(false)

  useEffect(() => {
    setFormData(initialFormState)
  }, [initialFormState])

  useEffect(() => {
    const isChanged = JSON.stringify(formData) !== JSON.stringify(initialFormState)
    setIsDirty(isChanged)
  }, [formData, initialFormState])

  async function handleSubmit() {
    setIsSaving(true)
    const submitData = new FormData()
    
    // 이 폼에서 관리하는 데이터만 전송
    const startDay = formData.wage_period_type === 'default' ? '1' : formData.wage_start_day
    const endDay = formData.wage_period_type === 'default' ? '0' : formData.wage_end_day
    const payDay = formData.is_pay_day_last ? '0' : formData.pay_day

    submitData.append('wage_start_day', startDay)
    submitData.append('wage_end_day', endDay)
    submitData.append('pay_day', payDay)

    const finalExceptions = {
      ...formData.wage_exceptions,
      pay_month: formData.pay_month,
      holiday_rule: formData.holiday_rule
    }
    submitData.append('wage_exceptions', JSON.stringify(finalExceptions))
    submitData.append('leave_calc_type', formData.leave_calc_type)

    const result = await updateStore(submitData)
    
    if (result?.error) {
      setError(result.error)
      toast.error("저장 실패", { description: result.error })
    } else {
      setError(null)
      toast.success("저장 완료", { description: "운영 정책이 성공적으로 수정되었습니다." })
      setIsDirty(false) 
    }
    setIsSaving(false)
  }

  const handleReset = () => {
    setFormData(initialFormState)
    toast.info('변경사항이 초기화되었습니다.')
  }

  return (
    <div className="relative">
      <div className="space-y-10 pb-24">
        {/* SECTION: 매장 기본 급여/정산 설정 */}
        <section>
          <div className="flex flex-col md:flex-row gap-8">
            <div className="w-full md:w-1/3 shrink-0">
              <h2 className="text-lg font-bold tracking-tight">급여 및 정산</h2>
              <p className="text-sm text-muted-foreground mt-2">
                우리 매장의 가장 기본적인 급여 산정 기간과 지급일을 설정해 주세요.
                <br className="hidden sm:block mt-2"/>
                (개인별/고용형태별 상세 설정은 직원 관리 메뉴에서 개별 변경할 수 있습니다.)
              </p>
            </div>
            
            <div className="w-full md:w-2/3 max-w-2xl space-y-8">
              <div className="space-y-4">
                <Label className="text-base font-semibold">정산 기간 (급여 산정 기준일)</Label>
                <RadioGroup 
                  value={formData.wage_period_type} 
                  onValueChange={(val) => setFormData(prev => ({ ...prev, wage_period_type: val }))}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="default" id="period-default" />
                    <Label htmlFor="period-default" className="font-normal cursor-pointer">매월 1일 ~ 말일 <span className="text-muted-foreground text-xs ml-1">(가장 많이 사용)</span></Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="custom" id="period-custom" />
                    <Label htmlFor="period-custom" className="font-normal cursor-pointer">직접 설정</Label>
                  </div>
                </RadioGroup>

                {formData.wage_period_type === 'custom' && (
                  <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg border flex-wrap">
                    <div className="flex items-center gap-2 bg-background p-1.5 rounded-md border shadow-sm">
                      <span className="px-2 py-1 bg-muted rounded text-sm font-medium text-muted-foreground">전월</span>
                        <Input
                          type="number" min="1" max="31"
                          value={formData.wage_start_day}
                          onChange={(e) => {
                            let val = parseInt(e.target.value)
                            if (isNaN(val)) val = 1
                            if (val > 31) val = 31
                            if (val < 1) val = 1
                            
                            setFormData(prev => ({
                              ...prev,
                              wage_start_day: String(val),
                              wage_end_day: String(val === 1 ? 0 : val - 1)
                            }))
                          }}
                          className="w-14 h-8 text-center border-none shadow-none focus-visible:ring-0 px-1 font-medium"
                        />
                      <span className="text-sm font-medium pr-2">일</span>
                    </div>
                    
                    <span className="text-muted-foreground font-medium">~</span>
                    
                    <div className="flex items-center gap-2 bg-background p-1.5 rounded-md border shadow-sm">
                      <span className="px-2 py-1 bg-primary/10 text-primary rounded text-sm font-medium">당월</span>
                        <Input
                          type="number" min="0" max="31"
                          value={formData.wage_end_day}
                          onChange={(e) => {
                            let val = parseInt(e.target.value)
                            if (isNaN(val)) val = 0
                            if (val > 31) val = 31
                            if (val < 0) val = 0
                            setFormData(prev => ({ ...prev, wage_end_day: String(val) }))
                          }}
                          className="w-14 h-8 text-center border-none shadow-none focus-visible:ring-0 px-1 font-medium"
                        />
                      <span className="text-sm font-medium pr-2">{formData.wage_end_day === '0' ? '말일' : '일'}</span>
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-4">
                <Label className="text-base font-semibold">급여 지급일</Label>
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <Select value={formData.pay_month} onValueChange={(v) => setFormData(prev => ({ ...prev, pay_month: v }))}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="지급 월" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="current">당월</SelectItem>
                      <SelectItem value="next">익월</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="flex items-center gap-2">
                    <Input
                      type="number" min="1" max="31"
                      value={formData.is_pay_day_last ? '' : formData.pay_day}
                      onChange={(e) => setFormData(prev => ({ ...prev, pay_day: e.target.value }))}
                      disabled={formData.is_pay_day_last}
                      className="w-20 text-center"
                    />
                    <span className="text-sm">일</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="pay-day-last" 
                      checked={formData.is_pay_day_last}
                      onCheckedChange={(c) => setFormData(prev => ({ ...prev, is_pay_day_last: !!c }))}
                    />
                    <Label htmlFor="pay-day-last" className="text-sm font-medium cursor-pointer">말일 지급</Label>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <Label className="text-base font-semibold">휴일 지급 규칙</Label>
                <Select value={formData.holiday_rule} onValueChange={(v) => setFormData(prev => ({ ...prev, holiday_rule: v }))}>
                  <SelectTrigger className="w-full sm:w-64">
                    <SelectValue placeholder="지급 규칙 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="prev">전 영업일에 지급</SelectItem>
                    <SelectItem value="next">다음 영업일에 지급</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  * 전 영업일 지급: 10일이 일요일이면 8일 금요일 지급<br/>
                  * 다음 영업일 지급: 10일이 일요일이면 11일 월요일 지급
                </p>
              </div>

              {/* 고용 형태별 예외 설정 아코디언 */}
              <div className="pt-4 border-t border-dashed">
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="exceptions" className="border-none">
                    <AccordionTrigger className="hover:no-underline py-2 text-sm text-primary hover:text-primary/80 justify-start gap-2 [&[data-state=open]>svg:first-child]:rotate-45">
                      <Plus className="w-4 h-4 transition-transform duration-200" />
                      고용 형태별 예외 정책 추가하기
                    </AccordionTrigger>
                    <AccordionContent className="pt-4 pb-2">
                      <div className="bg-muted/20 border rounded-xl p-6 space-y-6">
                        <p className="text-sm text-muted-foreground">
                          매장 기본 설정과 다르게 적용되는 고용 형태가 있다면 아래에 추가해주세요.<br/>
                          미설정된 고용 형태는 '매장 기본 설정'을 따릅니다.
                        </p>
                        
                        {EMPLOYMENT_TYPES.map((type) => {
                          const wageExceptions = formData.wage_exceptions || {}
                          const hasException = !!wageExceptions[type.value]
                          const exceptionData = wageExceptions[type.value] || { 
                            wage_start_day: '1', 
                            wage_end_day: '0', 
                            pay_day: '10',
                            wage_period_type: 'default',
                            pay_month: 'next',
                            is_pay_day_last: false
                          }
                          
                          const isDefaultPeriod = exceptionData.wage_period_type === 'default'
                          const isPayDayLast = exceptionData.is_pay_day_last

                          return (
                            <div key={type.value} className="flex flex-col border rounded-lg bg-background overflow-hidden">
                              <div className="flex items-center justify-between p-3 bg-muted/30 border-b">
                                <span className="font-medium text-sm">{type.label}</span>
                                {!hasException ? (
                                  <Button 
                                    type="button" 
                                    variant="outline" 
                                    size="sm" 
                                    className="h-8 text-xs"
                                    onClick={() => setFormData(prev => ({
                                      ...prev,
                                      wage_exceptions: {
                                        ...(prev.wage_exceptions || {}),
                                        [type.value]: { 
                                          wage_start_day: '1', 
                                          wage_end_day: '0', 
                                          pay_day: '10',
                                          wage_period_type: 'default',
                                          pay_month: 'next',
                                          is_pay_day_last: false
                                        }
                                      }
                                    }))}
                                  >
                                    예외 추가
                                  </Button>
                                ) : (
                                  <Button 
                                    type="button" 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-8 text-xs text-red-500 hover:text-red-600 hover:bg-red-50"
                                    onClick={() => {
                                      const newExceptions = { ...(formData.wage_exceptions || {}) }
                                      delete newExceptions[type.value]
                                      setFormData(prev => ({ ...prev, wage_exceptions: newExceptions }))
                                    }}
                                  >
                                    <Trash2 className="w-3.5 h-3.5 mr-1" />
                                    삭제
                                  </Button>
                                )}
                              </div>
                              
                              {hasException && (
                                <div className="p-5 flex flex-col gap-6">
                                  <div className="space-y-3">
                                    <Label className="text-sm font-semibold">정산 기간 (급여 산정 기준일)</Label>
                                    <RadioGroup 
                                      value={exceptionData.wage_period_type} 
                                      onValueChange={(val) => setFormData(prev => ({
                                        ...prev,
                                        wage_exceptions: {
                                          ...prev.wage_exceptions,
                                          [type.value]: { ...exceptionData, wage_period_type: val, wage_start_day: val === 'default' ? '1' : exceptionData.wage_start_day, wage_end_day: val === 'default' ? '0' : exceptionData.wage_end_day }
                                        }
                                      }))}
                                      className="flex flex-col gap-3"
                                    >
                                      <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="default" id={`period-default-${type.value}`} />
                                        <Label htmlFor={`period-default-${type.value}`} className="font-normal cursor-pointer text-sm">매월 1일 ~ 말일</Label>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="custom" id={`period-custom-${type.value}`} />
                                        <Label htmlFor={`period-custom-${type.value}`} className="font-normal cursor-pointer text-sm">직접 설정</Label>
                                      </div>
                                    </RadioGroup>

                                    {exceptionData.wage_period_type === 'custom' && (
                                      <div className="flex items-center gap-3 p-3 bg-muted/20 rounded-lg border flex-wrap">
                                        <div className="flex items-center gap-2 bg-background p-1.5 rounded-md border shadow-sm">
                                          <span className="px-2 py-1 bg-muted rounded text-[13px] font-medium text-muted-foreground">전월</span>
                                          <Input
                                            type="number" min="1" max="31"
                                            value={exceptionData.wage_start_day}
                                            onChange={(e) => {
                                              let val = parseInt(e.target.value)
                                              if (isNaN(val)) val = 1
                                              if (val > 31) val = 31
                                              if (val < 1) val = 1
                                              
                                              setFormData(prev => ({
                                                ...prev,
                                                wage_exceptions: {
                                                  ...prev.wage_exceptions,
                                                  [type.value]: {
                                                    ...exceptionData,
                                                    wage_start_day: String(val),
                                                    wage_end_day: String(val === 1 ? 0 : val - 1)
                                                  }
                                                }
                                              }))
                                            }}
                                            className="w-12 h-7 text-center border-none shadow-none focus-visible:ring-0 px-1 font-medium text-[13px]"
                                          />
                                          <span className="text-[13px] font-medium pr-1">일</span>
                                        </div>
                                        <span className="text-muted-foreground font-medium text-sm">~</span>
                                        <div className="flex items-center gap-2 bg-background p-1.5 rounded-md border shadow-sm">
                                          <span className="px-2 py-1 bg-primary/10 text-primary rounded text-[13px] font-medium">당월</span>
                                          <Input
                                            type="number" min="0" max="31"
                                            value={exceptionData.wage_end_day}
                                            onChange={(e) => {
                                              let val = parseInt(e.target.value)
                                              if (isNaN(val)) val = 0
                                              if (val > 31) val = 31
                                              if (val < 0) val = 0
                                              
                                              setFormData(prev => ({
                                                ...prev,
                                                wage_exceptions: {
                                                  ...prev.wage_exceptions,
                                                  [type.value]: { ...exceptionData, wage_end_day: String(val) }
                                                }
                                              }))
                                            }}
                                            className="w-12 h-7 text-center border-none shadow-none focus-visible:ring-0 px-1 font-medium text-[13px]"
                                          />
                                          <span className="text-[13px] font-medium pr-1">{exceptionData.wage_end_day === '0' ? '말일' : '일'}</span>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                  
                                  <Separator />
                                  
                                  <div className="space-y-3">
                                    <Label className="text-sm font-semibold">급여 지급일</Label>
                                    <div className="flex flex-wrap items-center gap-3">
                                      <Select 
                                        value={exceptionData.pay_month} 
                                        onValueChange={(v) => setFormData(prev => ({
                                          ...prev,
                                          wage_exceptions: {
                                            ...prev.wage_exceptions,
                                            [type.value]: { ...exceptionData, pay_month: v }
                                          }
                                        }))}
                                      >
                                        <SelectTrigger className="w-24 h-9 text-[13px]">
                                          <SelectValue placeholder="지급 월" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="current" className="text-[13px]">당월</SelectItem>
                                          <SelectItem value="next" className="text-[13px]">익월</SelectItem>
                                        </SelectContent>
                                      </Select>

                                      <div className="flex items-center gap-2">
                                        <Input
                                          type="number" min="1" max="31"
                                          value={exceptionData.is_pay_day_last ? '' : exceptionData.pay_day}
                                          onChange={(e) => setFormData(prev => ({
                                            ...prev,
                                            wage_exceptions: {
                                              ...prev.wage_exceptions,
                                              [type.value]: { ...exceptionData, pay_day: e.target.value }
                                            }
                                          }))}
                                          disabled={exceptionData.is_pay_day_last}
                                          className="w-16 h-9 text-center text-[13px]"
                                        />
                                        <span className="text-[13px] font-medium">일</span>
                                      </div>

                                      <div className="flex items-center space-x-2 ml-2">
                                        <Checkbox 
                                          id={`pay-day-last-${type.value}`}
                                          checked={exceptionData.is_pay_day_last}
                                          onCheckedChange={(c) => setFormData(prev => ({
                                            ...prev,
                                            wage_exceptions: {
                                              ...prev.wage_exceptions,
                                              [type.value]: { ...exceptionData, is_pay_day_last: !!c, pay_day: !!c ? '0' : exceptionData.pay_day }
                                            }
                                          }))}
                                        />
                                        <Label htmlFor={`pay-day-last-${type.value}`} className="text-[13px] font-medium cursor-pointer">말일 지급</Label>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            </div>
          </div>
        </section>

        <Separator className="my-10" />

        {/* SECTION: 휴가 및 연차 설정 */}
        <section>
          <div className="flex flex-col md:flex-row gap-8">
            <div className="w-full md:w-1/3 shrink-0">
              <h2 className="text-lg font-bold tracking-tight">휴가 및 연차</h2>
              <p className="text-sm text-muted-foreground mt-2">
                우리 매장의 직원 연차 부여 기준을 설정합니다.
              </p>
            </div>
            
            <div className="w-full md:w-2/3 max-w-2xl space-y-6">
              <div className="space-y-4">
                <Label className="text-base font-semibold">연차 발생 기준</Label>
                <RadioGroup 
                  value={formData.leave_calc_type} 
                  onValueChange={(val) => setFormData(prev => ({ ...prev, leave_calc_type: val }))}
                  className="space-y-3"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="hire_date" id="leave-hire" />
                    <Label htmlFor="leave-hire" className="font-normal cursor-pointer text-base">입사일 기준 <span className="text-muted-foreground text-sm">(추천)</span></Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="fiscal_year" id="leave-fiscal" />
                    <Label htmlFor="leave-fiscal" className="font-normal cursor-pointer text-base">회계연도 기준 <span className="text-muted-foreground text-sm">(매년 1월 1일 일괄 갱신)</span></Label>
                  </div>
                </RadioGroup>
                <div className="bg-muted/30 p-4 rounded-lg mt-4">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    * <strong>입사일 기준:</strong> 직원의 입사일을 기준으로 매월/매년 연차가 자동 발생합니다.<br/>
                    * <strong>회계연도 기준:</strong> 1월 1일에 일괄 부여되며, 1년 미만자는 입사일부터 연말까지 비례 계산됩니다.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {error && <div className="text-sm text-destructive font-medium p-4 bg-destructive/10 rounded-md mt-8">{error}</div>}
      </div>

      {/* Floating Save Bar */}
      <div className={cn(
        "fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-3xl px-4 transition-all duration-300 ease-in-out transform z-50",
        isDirty ? "translate-y-0 opacity-100" : "translate-y-24 opacity-0 pointer-events-none"
      )}>
        <div className="bg-background text-foreground p-4 rounded-xl shadow-2xl flex items-center justify-between border border-border">
          <div className="flex items-center gap-2 px-2">
            <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
            <span className="text-sm font-medium">변경사항이 감지되었습니다.</span>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleReset}
              className="text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              재설정
            </Button>
            <Button 
              onClick={handleSubmit} 
              size="sm"
              disabled={isSaving}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isSaving ? '저장 중...' : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  변경사항 저장
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
