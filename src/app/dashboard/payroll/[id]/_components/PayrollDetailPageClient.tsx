"use client";

import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/formatters";
import { DeductionEditor } from "../../_components/DeductionEditor";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, FileText, CheckCircle, HelpCircle } from "lucide-react";
import { PayrollRecordWithStaff } from "../../_hooks/usePayroll";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useConfirmPayroll, useUpdatePayrollRecord } from "../../_hooks/usePayrollMutations";
import { AllowanceEditor } from "../../_components/AllowanceEditor";
import { format } from "date-fns";
import { calculateDeductions } from "../../_utils/deductionCalculator";
import { useState } from "react";
import { PayrollConfirmDialog } from "../../_components/PayrollConfirmDialog";
import { DeductionResult } from "@/features/payroll/types";
import { DEDUCTION_RATES } from "../../_utils/deductionCalculator";
import dynamic from 'next/dynamic';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const PayrollPDFPreview = dynamic(
  () => import("../../_components/PayrollPDFPreview"),
  { ssr: false }
);

interface PayrollDetailPageClientProps {
  initialRecord: PayrollRecordWithStaff;
}

export function PayrollDetailPageClient({ initialRecord }: PayrollDetailPageClientProps) {
  const router = useRouter();
  const [record, setRecord] = useState(initialRecord);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const confirmMutation = useConfirmPayroll(record.store_id, record.period_year, record.period_month);
  const updateRecordMutation = useUpdatePayrollRecord(record.store_id, record.period_year, record.period_month);

  const profile = record.store_members?.profiles;
  const manualName = record.store_members?.name;
  const displayName = profile?.full_name || manualName || "알 수 없음";
  const wageType = record.wage_type;
  const isDraft = record.status === "draft";

  const getWageTypeLabel = (type: string) => {
    const map: Record<string, string> = {
      hourly: "시급",
      daily: "일급",
      monthly: "월급",
      yearly: "연봉",
    };
    return map[type] || type;
  };

  const currentDeductions: DeductionResult = {
    nationalPension: record.national_pension,
    healthInsurance: record.health_insurance,
    longTermCare: record.long_term_care,
    employmentInsurance: record.employment_insurance,
    incomeTax: record.income_tax,
    localIncomeTax: record.local_income_tax,
    totalDeduction: record.total_deduction,
    netPay: record.net_pay,
  };

  // 임시로 원래 값과 동일하게 세팅. 실제로는 계산 헬퍼(`calculateDeductions`)를 통해 얻은 초기 계산값이 필요하지만
  // 우선 에러 방지를 위해 현재 값과 같게 둡니다.
  const baseDeductions: DeductionResult = { ...currentDeductions };

  const executeConfirm = async () => {
    await confirmMutation.mutateAsync([record.id]);
    setRecord((prev) => ({ ...prev, status: "confirmed" }));
    setConfirmDialogOpen(false);
  };

  const handleAllowanceOverride = async (override: any, shouldRecalculate: boolean) => {
    const isOvertime = override.field === 'overtime_pay';
    const isHoliday = override.field === 'weekly_holiday_pay';
    
    const newOvertimePay = isOvertime ? override.overriddenValue : record.overtime_pay;
    const newHolidayPay = isHoliday ? override.overriddenValue : record.weekly_holiday_pay;
    
    // 단순 합산 방식 (향후 인센티브 등 추가 시 포함 필요)
    const newGrossPay = record.base_pay + newOvertimePay + newHolidayPay;

    let updatedFields: any = {
      overtime_pay: newOvertimePay,
      weekly_holiday_pay: newHolidayPay,
      gross_pay: newGrossPay,
    };

    if (shouldRecalculate) {
      const newDeductions = calculateDeductions({
        wageType: record.wage_type,
        grossPay: newGrossPay,
        monthlyHours: record.work_hours,
      });
      
      updatedFields = {
        ...updatedFields,
        national_pension: newDeductions.nationalPension,
        health_insurance: newDeductions.healthInsurance,
        long_term_care: newDeductions.longTermCare,
        employment_insurance: newDeductions.employmentInsurance,
        income_tax: newDeductions.incomeTax,
        local_income_tax: newDeductions.localIncomeTax,
        total_deduction: newDeductions.totalDeduction,
        net_pay: newDeductions.netPay,
      };
    } else {
      updatedFields.net_pay = newGrossPay - record.total_deduction;
    }

    try {
      await updateRecordMutation.mutateAsync({
        id: record.id,
        override,
        updatedFields,
      });

      setRecord((prev) => ({
        ...prev,
        ...updatedFields,
        overrides: [...(prev.overrides || []), { ...override, overriddenBy: "me", overriddenAt: new Date().toISOString() }]
      }));
    } catch (error) {
      console.error("Failed to update allowance", error);
    }
  };

  const storeName = "매장"; // Todo: 추후 실제 사업장명 주입 필요 (필요 시 API 수정)

  return (
    <>
      <div className="flex flex-col h-full bg-slate-50/30">
        <div className="flex items-center justify-between px-6 pt-6 pb-2 shrink-0">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">급여 상세</h1>
              <p className="text-sm text-slate-500 mt-0.5">
                {record.period_year}년 {record.period_month}월 급여 명세
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setPdfModalOpen(true)}>
              <FileText className="mr-2 h-4 w-4" />
              출력
            </Button>
            {isDraft && (
              <Button onClick={() => setConfirmDialogOpen(true)} disabled={confirmMutation.isPending}>
                <CheckCircle className="mr-2 h-4 w-4" />
                확정
              </Button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6 pt-4">
          <div className="grid gap-6 lg:grid-cols-4 items-stretch h-full">
            
            {/* 직원 프로필 (좌측 1/4) */}
            <div className="lg:col-span-1">
              <Card className="shadow-sm border-slate-200 h-full">
                <CardContent className="p-6 flex flex-col h-full">
                  <div className="flex flex-col items-center text-center pb-6 border-b border-slate-100">
                    <Avatar className="h-20 w-20 mb-4">
                      <AvatarImage src={profile?.avatar_url || undefined} />
                      <AvatarFallback className="text-2xl">{displayName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <h3 className="font-bold text-xl text-slate-800 mb-1">{displayName}</h3>
                    <p className="text-sm text-slate-500 mb-3">
                      {record.store_members?.store_roles?.name || "직원"}
                    </p>
                    <Badge variant="secondary" className="font-normal">{getWageTypeLabel(wageType)}</Badge>
                  </div>
                  
                  <div className="flex-1 py-6 space-y-5">
                    <div className="flex flex-col gap-1.5">
                      <span className="text-xs text-slate-400 font-medium">연락처</span>
                      <span className="text-sm font-medium text-slate-700">
                        {profile?.phone || record.store_members?.phone || "미등록"}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <span className="text-xs text-slate-400 font-medium">입사일</span>
                      <span className="text-sm font-medium text-slate-700">
                        {record.store_members?.joined_at ? format(new Date(record.store_members.joined_at), 'yyyy. MM. dd.') : "미등록"}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <span className="text-xs text-slate-400 font-medium">계약 급여</span>
                      <span className="text-sm font-medium text-slate-700">
                        {wageType === "hourly" && `시급 ${formatCurrency(record.store_members?.base_hourly_wage || 0)}`}
                        {wageType === "daily" && `일급 ${formatCurrency(record.store_members?.base_daily_wage || 0)}`}
                        {wageType === "monthly" && `월급 ${formatCurrency(record.store_members?.base_monthly_wage || 0)}`}
                        {wageType === "yearly" && `연봉 ${formatCurrency(record.store_members?.base_yearly_wage || 0)}`}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 급여 및 공제 계산 (우측 3/4) */}
            <div className="lg:col-span-3">
              <Card className="shadow-sm border-slate-200 h-full">
                <CardContent className="p-0 h-full">
                  <div className="flex flex-col xl:flex-row divide-y xl:divide-y-0 xl:divide-x border-slate-100 h-full">
                    {/* 지급 항목 (좌측) */}
                    <div className="flex-1 p-6 flex flex-col h-full">
                      <div className="flex justify-between items-center mb-5">
                        <span className="font-bold text-slate-800">지급 내역</span>
                      </div>
                      
                      <div className="flex-1 flex flex-col h-full">
                        {/* 기본급 및 근무 내역 */}
                        <div className="flex flex-col gap-3 pb-5">
                          <div className="flex justify-between items-center px-1">
                            <span className="text-slate-600 font-medium text-sm">기본급</span>
                            <span className="text-base font-semibold">{formatCurrency(record.base_pay)}</span>
                          </div>
                          
                          <div className="bg-slate-50 border border-slate-100 rounded-md p-4 flex flex-col gap-3">
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-slate-500">근무 일수</span>
                              <span className="font-medium">{record.work_days}일</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-slate-500">총 근무 시간</span>
                              <span className="font-medium">{record.work_hours}시간</span>
                            </div>
                            <div className="mt-1 pt-3 border-t border-slate-200/60 flex justify-between items-center text-[11px] text-slate-400">
                              <span>산정 방식</span>
                              <span>
                                {wageType === "hourly" && `시급 ${formatCurrency(record.store_members?.base_hourly_wage || 0)}`}
                                {wageType === "daily" && `일급 ${formatCurrency(record.store_members?.base_daily_wage || 0)}`}
                                {wageType === "monthly" && `월급 ${formatCurrency(record.store_members?.base_monthly_wage || 0)}`}
                                {wageType === "yearly" && `연봉 ${formatCurrency(record.store_members?.base_yearly_wage || 0)}`}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {/* 수당 수정 에디터 */}
                        <div className="pt-5 border-t border-slate-100 border-dashed">
                          <div className="flex justify-between items-center mb-4 px-1">
                            <span className="font-medium text-sm text-slate-600">추가 수당</span>
                            {isDraft && (
                              <span className="text-[11px] text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                                금액을 클릭하여 수정
                              </span>
                            )}
                          </div>
                          <AllowanceEditor 
                            record={record}
                            isLocked={!isDraft}
                            onOverrideSubmit={handleAllowanceOverride}
                          />
                        </div>

                        {/* 총 지급액 (세전) - 공제 합계와 동일한 디자인. mt-auto 적용 */}
                        <div className="mt-auto pt-6">
                          <div className="flex justify-between items-center bg-slate-50 border border-slate-100 p-4 rounded-lg h-[68px]">
                            <span className="font-medium text-slate-700">총 지급액 (세전)</span>
                            <span className="text-lg font-bold text-blue-600">
                              {formatCurrency(record.gross_pay)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 공제 항목 (우측) */}
                    <div className="flex-1 p-6 flex flex-col h-full">
                      <div className="flex justify-between items-center mb-5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800">공제 내역</span>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="h-4 w-4 text-muted-foreground hover:text-primary cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent 
                                className="w-[95vw] sm:w-[560px] max-w-[95vw] sm:max-w-none p-0 overflow-hidden z-[100]" 
                                side="bottom" 
                                align="end"
                                avoidCollisions={true}
                              >
                                <div className="flex flex-col w-full text-xs leading-relaxed break-keep">
                                  {/* 상단 제목 영역 (전체 너비) */}
                                  <div className="w-full text-center border-b border-white/10 p-3 pb-2 mb-1">
                                    <span className="font-semibold text-sm">공제액 계산 방식</span>
                                  </div>
                                  
                                  {/* 하단 2단 컬럼 영역 */}
                                  <div className="px-4 pb-4 pt-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-2">
                                      <p className="font-medium opacity-100">월 60시간 미만 근무 시</p>
                                      <div className="bg-white/5 p-3 rounded-md flex-1">
                                        <p className="opacity-90 font-medium">소득세 {parseFloat((DEDUCTION_RATES.SIMPLE_INCOME_TAX * 100).toFixed(3))}% 적용</p>
                                        <p className="opacity-60 text-[11px] mt-1">(소득세 3% + 지방소득세 {parseFloat(((DEDUCTION_RATES.SIMPLE_INCOME_TAX * 100) - 3).toFixed(3))}%)</p>
                                      </div>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                      <p className="font-medium opacity-100">월 60시간 이상 근무 시</p>
                                      <div className="bg-white/5 p-3 rounded-md flex-1 space-y-2">
                                        <p className="opacity-90">
                                          4대보험 가입 대상으로 분류되어 아래 요율이 자동 적용됩니다.
                                        </p>
                                        <div className="grid grid-cols-2 gap-x-2 gap-y-1 opacity-70 text-[11px]">
                                          <div>• 국민연금: {parseFloat((DEDUCTION_RATES.NATIONAL_PENSION * 100).toFixed(3))}%</div>
                                          <div>• 건강보험: {parseFloat((DEDUCTION_RATES.HEALTH_INSURANCE * 100).toFixed(3))}%</div>
                                          <div>• 장기요양: {parseFloat((DEDUCTION_RATES.LONG_TERM_CARE / DEDUCTION_RATES.HEALTH_INSURANCE * 100).toFixed(2))}%</div>
                                          <div>• 고용보험: {parseFloat((DEDUCTION_RATES.EMPLOYMENT_INSURANCE * 100).toFixed(3))}%</div>
                                          <div>• 소득세: 간이세액</div>
                                          <div>• 지방소득: {parseFloat((DEDUCTION_RATES.LOCAL_INCOME_TAX_RATIO * 100).toFixed(3))}%</div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        
                        {isDraft && (
                          <span className="text-[11px] text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                            금액을 클릭하여 수정
                          </span>
                        )}
                      </div>
                      
                      <div className="flex-1 flex flex-col h-full">
                        <DeductionEditor
                          baseDeductions={baseDeductions}
                          currentDeductions={currentDeductions}
                          overrides={record.overrides || []}
                          isLocked={!isDraft}
                          onOverrideSubmit={async (override) => {
                            const newTotal = currentDeductions.totalDeduction 
                              - currentDeductions[override.field] 
                              + override.overriddenValue;
                            const newNetPay = record.gross_pay - newTotal;

                            // UI 낙관적 업데이트를 위해 새 deduction 객체 구성
                            const newDeductions = {
                              national_pension: override.field === 'nationalPension' ? override.overriddenValue : record.national_pension,
                              health_insurance: override.field === 'healthInsurance' ? override.overriddenValue : record.health_insurance,
                              long_term_care: override.field === 'longTermCare' ? override.overriddenValue : record.long_term_care,
                              employment_insurance: override.field === 'employmentInsurance' ? override.overriddenValue : record.employment_insurance,
                              income_tax: override.field === 'incomeTax' ? override.overriddenValue : record.income_tax,
                              local_income_tax: override.field === 'localIncomeTax' ? override.overriddenValue : record.local_income_tax,
                              total_deduction: newTotal,
                              net_pay: newNetPay
                            };

                            try {
                              await updateRecordMutation.mutateAsync({
                                id: record.id,
                                override,
                                updatedFields: newDeductions,
                              });

                              setRecord((prev) => ({
                                ...prev,
                                ...newDeductions,
                                overrides: [...(prev.overrides || []), { ...override, overriddenBy: "me", overriddenAt: new Date().toISOString() }]
                              }));
                            } catch (error) {
                              console.error("Failed to update deduction", error);
                            }
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* 하단 합계 바 (스크롤 밖 고정 영역) */}
        <div className="border-t border-slate-200 bg-white p-5 shrink-0 shadow-[0_-4px_6px_-1px_rgb(0,0,0,0.02)]">
          <div className="flex items-center justify-center sm:justify-between max-w-4xl mx-auto">
            <div className="text-sm text-slate-500 hidden sm:flex items-center gap-4 font-medium">
              <span>총 지급액 {formatCurrency(record.gross_pay)}</span>
              <span className="text-slate-300">-</span>
              <span>총 공제액 {formatCurrency(record.total_deduction)}</span>
              <span className="text-slate-300">=</span>
            </div>
            <div className="flex items-center gap-4 ml-auto">
              <span className="text-base font-semibold text-slate-700">최종 실수령액</span>
              <span className="text-2xl font-bold text-slate-900">
                {formatCurrency(record.net_pay)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <PayrollConfirmDialog
        open={confirmDialogOpen}
        onOpenChange={setConfirmDialogOpen}
        onConfirm={executeConfirm}
        count={1}
        totalNetPay={record.net_pay}
      />

      <Dialog open={pdfModalOpen} onOpenChange={setPdfModalOpen}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle>급여 명세서 미리보기</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-hidden">
            {pdfModalOpen && (
              <PayrollPDFPreview 
                records={[record]} 
                storeName={storeName} 
                fileName={`급여명세서_${displayName}_${record.period_year}년${record.period_month}월.pdf`} 
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
