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
import { toast } from 'sonner'
import { Save, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'


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
