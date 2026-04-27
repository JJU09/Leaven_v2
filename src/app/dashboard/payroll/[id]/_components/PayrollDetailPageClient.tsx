"use client";

import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/formatters";
import { DeductionEditor } from "../../_components/DeductionEditor";
import { PayrollPrintView } from "../../_components/PayrollPrintView";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, FileText, CheckCircle } from "lucide-react";
import { PayrollRecordWithStaff } from "../../_hooks/usePayroll";
import { useConfirmPayroll } from "../../_hooks/usePayrollMutations";
import { useState } from "react";
import { PayrollConfirmDialog } from "../../_components/PayrollConfirmDialog";

interface PayrollDetailPageClientProps {
  initialRecord: PayrollRecordWithStaff;
}

export function PayrollDetailPageClient({ initialRecord }: PayrollDetailPageClientProps) {
  const router = useRouter();
  const [record, setRecord] = useState(initialRecord);
  const [printMode, setPrintMode] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const confirmMutation = useConfirmPayroll(record.store_id, record.period_year, record.period_month);

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

  const deductions = {
    income_tax: record.income_tax,
    local_income_tax: record.local_income_tax,
    national_pension: record.national_pension,
    health_insurance: record.health_insurance,
    employment_insurance: record.employment_insurance,
    long_term_care: record.long_term_care,
  };

  const executeConfirm = async () => {
    await confirmMutation.mutateAsync([record.id]);
    setRecord((prev) => ({ ...prev, status: "confirmed" }));
    setConfirmDialogOpen(false);
  };

  const handlePrint = () => {
    setPrintMode(true);
    setTimeout(() => {
      window.print();
      setPrintMode(false);
    }, 100);
  };

  return (
    <>
      <div className={`flex flex-col h-full gap-6 p-6 ${printMode ? "hidden" : ""}`}>
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">급여 상세</h1>
            <p className="text-muted-foreground">
              {record.period_year}년 {record.period_month}월 급여 명세
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="grid gap-6 md:grid-cols-2">
            {/* 직원 정보 및 요약 */}
            <div className="space-y-6 md:col-span-2">
              <Card>
                <CardContent className="p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={profile?.avatar_url || undefined} />
                      <AvatarFallback className="text-xl">{displayName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-xl">{displayName}</h3>
                        <Badge variant="secondary">{getWageTypeLabel(wageType)}</Badge>
                      </div>
                      <p className="text-muted-foreground">
                        {record.store_members?.store_roles?.name || "역할 없음"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={handlePrint}>
                      <FileText className="mr-2 h-4 w-4" />
                      명세서 출력
                    </Button>
                    {isDraft && (
                      <Button onClick={() => setConfirmDialogOpen(true)} disabled={confirmMutation.isPending}>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        확정하기
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 근무 내역 */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">
                근무 내역
              </h4>
              <Card>
                <CardContent className="p-4 grid gap-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">근무 일수</span>
                    <span className="font-medium">{record.work_days}일</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">총 근무 시간</span>
                    <span className="font-medium">{record.work_hours}시간</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">연장 근무 시간</span>
                    <span className="font-medium">{record.overtime_hours}시간</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">주휴수당 발생</span>
                    <span>
                      {wageType === "hourly" ? (
                        record.weekly_holiday_pay > 0 ? (
                          <Badge variant="default" className="bg-green-100 text-green-700">해당</Badge>
                        ) : (
                          <Badge variant="outline">미해당</Badge>
                        )
                      ) : (
                        <span className="text-sm text-muted-foreground">해당없음</span>
                      )}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 급여 및 공제 계산 */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">
                급여 계산
              </h4>
              <Card>
                <CardContent className="p-4 space-y-6">
                  {/* 지급 항목 */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">기본급</span>
                      <span>{formatCurrency(record.base_pay)}</span>
                    </div>
                    {record.overtime_pay > 0 && (
                      <div className="flex justify-between items-center text-green-600">
                        <span>연장근무수당</span>
                        <span>+{formatCurrency(record.overtime_pay)}</span>
                      </div>
                    )}
                    {record.weekly_holiday_pay > 0 && (
                      <div className="flex justify-between items-center text-green-600">
                        <span>주휴수당</span>
                        <span>+{formatCurrency(record.weekly_holiday_pay)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center font-semibold pt-2 border-t">
                      <span>총 지급액 (세전)</span>
                      <span>{formatCurrency(record.gross_pay)}</span>
                    </div>
                  </div>

                  <Separator />

                  {/* 공제 항목 */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-sm">공제 내역</span>
                      {isDraft && (
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                          금액을 클릭하여 수정
                        </span>
                      )}
                    </div>
                    
                    <DeductionEditor
                      storeId={record.store_id}
                      year={record.period_year}
                      month={record.period_month}
                      recordId={record.id}
                      grossPay={record.gross_pay}
                      initialDeductions={deductions}
                      disabled={!isDraft}
                      onChange={({ deductions, total_deduction, net_pay }) => {
                        setRecord((prev) => ({
                          ...prev,
                          ...deductions,
                          total_deduction,
                          net_pay,
                        }));
                      }}
                    />

                    <div className="flex justify-between items-center font-semibold pt-2 border-t text-destructive">
                      <span>총 공제액</span>
                      <span>-{formatCurrency(record.total_deduction)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* 하단 합계 바 */}
        <div className="border-t bg-muted/30 p-4 rounded-lg mt-auto">
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            <div className="text-sm text-muted-foreground hidden sm:flex items-center gap-4">
              <span>총 지급액 {formatCurrency(record.gross_pay)}</span>
              <span>-</span>
              <span>총 공제액 {formatCurrency(record.total_deduction)}</span>
              <span>=</span>
            </div>
            <div className="flex items-center gap-4 ml-auto">
              <span className="text-lg font-medium">최종 실수령액</span>
              <span className="text-2xl font-bold text-primary">
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

      {printMode && (
        <PayrollPrintView records={[record]} storeName="매장" />
      )}
    </>
  );
}
