import { PayrollRecordWithStaff } from "../_hooks/usePayroll";
import { formatCurrency } from "@/lib/formatters";
import { DeductionEditor } from "./DeductionEditor";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, FileText, CheckCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface PayrollDetailPanelProps {
  record: PayrollRecordWithStaff | null;
  onClose: () => void;
  onConfirm: (id: string) => void;
  onPrint: (id: string) => void;
}

export function PayrollDetailPanel({
  record,
  onClose,
  onConfirm,
  onPrint,
}: PayrollDetailPanelProps) {
  if (!record) return null;

  const profile = record.store_members?.profiles;
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

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 transform bg-background border-t shadow-lg transition-transform duration-300 ease-in-out md:left-[16rem]">
      <div className="flex flex-col h-full max-h-[80vh]">
        <div className="flex items-center justify-between border-b p-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-10 w-10">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback>{profile?.full_name?.charAt(0) || "?"}</AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-lg">{profile?.full_name}</h3>
                <Badge variant="secondary">{getWageTypeLabel(wageType)}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {record.period_year}년 {record.period_month}월 급여
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onPrint(record.id)}>
              <FileText className="mr-2 h-4 w-4" />
              명세서 출력
            </Button>
            {isDraft && (
              <Button size="sm" onClick={() => onConfirm(record.id)}>
                <CheckCircle className="mr-2 h-4 w-4" />
                확정하기
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={onClose} className="ml-2">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid gap-6 md:grid-cols-2">
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
        <div className="border-t bg-muted/30 p-4">
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
    </div>
  );
}