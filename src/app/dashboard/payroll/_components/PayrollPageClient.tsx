"use client";

import { useState } from "react";
import { format, subMonths, addMonths } from "date-fns";
import { ko } from "date-fns/locale";
import { usePayroll, PayrollRecordWithStaff } from "../_hooks/usePayroll";
import { useConfirmPayroll, useMarkPayrollPaid } from "../_hooks/usePayrollMutations";
import { PayrollSummaryCards } from "./PayrollSummaryCards";
import { PayrollTable } from "./PayrollTable";
import { PayrollPrintView } from "./PayrollPrintView";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, FileText, CheckCircle, Printer } from "lucide-react";
import { useRouter } from "next/navigation";

interface PayrollPageClientProps {
  storeId: string;
  storeName: string;
}

export function PayrollPageClient({ storeId, storeName }: PayrollPageClientProps) {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  const { data: payrollData, isLoading } = usePayroll(storeId, year, month);
  
  // Array 반환 (초안 생성 전 등)과 Object 반환 분기 처리
  const records = Array.isArray(payrollData) 
    ? payrollData 
    : (payrollData?.records || []);
    
  const period = !Array.isArray(payrollData) ? payrollData?.period : null;
  
  const confirmMutation = useConfirmPayroll(storeId, year, month);
  const markPaidMutation = useMarkPayrollPaid(storeId, year, month);

  // Filters & State
  const [wageTypeFilter, setWageTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  // Dialog State
  const [printMode, setPrintMode] = useState(false);
  const [printRecords, setPrintRecords] = useState<PayrollRecordWithStaff[]>([]);

  // Filtering
  const filteredRecords = records.filter((r) => {
    if (wageTypeFilter !== "all" && r.wage_type !== wageTypeFilter) return false;
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    return true;
  });

  // Handlers
  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  const handleConfirmSingle = async (id: string) => {
    await confirmMutation.mutateAsync([id]);
  };

  const handleMarkPaid = async (id: string) => {
    await markPaidMutation.mutateAsync(id);
  };

  const handlePrint = (ids: string[]) => {
    const toPrint = records.filter(r => ids.includes(r.id));
    setPrintRecords(toPrint);
    setPrintMode(true);
    
    // setTimeout to allow React to render the print view before calling window.print
    setTimeout(() => {
      window.print();
      setPrintMode(false);
    }, 100);
  };

  if (!storeId) return null;

  return (
    <>
      <div className={`flex h-full flex-col gap-6 p-6 ${printMode ? 'hidden' : ''}`}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">급여 정산</h1>
            <p className="text-muted-foreground">
              직원들의 급여를 계산하고 명세서를 발급할 수 있습니다.
            </p>
          </div>
        </div>

        {/* Toolbar (Month Picker & Filters) */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-muted/50 p-2 rounded-lg">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={handlePrevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex flex-col items-center justify-center">
              <div className="font-semibold text-lg w-32 text-center">
                {format(currentDate, "yyyy년 MM월")}
              </div>
              {period && (
                <div className="text-xs text-muted-foreground mt-1">
                  정산 기간: {period.start.replace(/-/g, '.')} ~ {period.end.replace(/-/g, '.')}
                </div>
              )}
            </div>
            <Button variant="ghost" size="icon" onClick={handleNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <Select value={wageTypeFilter} onValueChange={setWageTypeFilter}>
              <SelectTrigger className="w-[120px] bg-background">
                <SelectValue placeholder="급여 유형" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">유형 전체</SelectItem>
                <SelectItem value="hourly">시급</SelectItem>
                <SelectItem value="daily">일급</SelectItem>
                <SelectItem value="monthly">월급</SelectItem>
                <SelectItem value="yearly">연봉</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[120px] bg-background">
                <SelectValue placeholder="상태" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">상태 전체</SelectItem>
                <SelectItem value="draft">미확정</SelectItem>
                <SelectItem value="confirmed">확정</SelectItem>
                <SelectItem value="paid">지급완료</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-muted-foreground">급여 내역을 불러오는 중...</p>
          </div>
        ) : (
          <>
            <PayrollSummaryCards records={filteredRecords} />

            <div className="flex-1 min-h-0 overflow-auto">
              <PayrollTable
                records={filteredRecords}
                onRowClick={(record) => router.push(`/dashboard/payroll/${record.id}`)}
                onMarkPaid={handleMarkPaid}
                onConfirm={handleConfirmSingle}
                onPrint={(id) => handlePrint([id])}
              />
            </div>
          </>
        )}
      </div>

      {printMode && (
        <PayrollPrintView records={printRecords} storeName={storeName} />
      )}
    </>
  );
}