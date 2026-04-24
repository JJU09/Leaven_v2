"use client";

import { useState } from "react";
import { format, subMonths, addMonths } from "date-fns";
import { ko } from "date-fns/locale";
import { usePayroll, PayrollRecordWithStaff } from "../_hooks/usePayroll";
import { useConfirmPayroll, useMarkPayrollPaid } from "../_hooks/usePayrollMutations";
import { PayrollSummaryCards } from "./PayrollSummaryCards";
import { PayrollTable } from "./PayrollTable";
import { PayrollDetailPanel } from "./PayrollDetailPanel";
import { PayrollConfirmDialog } from "./PayrollConfirmDialog";
import { PayrollPrintView } from "./PayrollPrintView";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, FileText, CheckCircle, Printer } from "lucide-react";

interface PayrollPageClientProps {
  storeId: string;
  storeName: string;
}

export function PayrollPageClient({ storeId, storeName }: PayrollPageClientProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  const { data: records = [], isLoading } = usePayroll(storeId, year, month);
  const confirmMutation = useConfirmPayroll(storeId, year, month);
  const markPaidMutation = useMarkPayrollPaid(storeId, year, month);

  // Filters & State
  const [wageTypeFilter, setWageTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<PayrollRecordWithStaff | null>(null);
  
  // Dialog State
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
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

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredRecords.filter((r) => r.status === "draft").map((r) => r.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleConfirmBatch = () => {
    if (selectedIds.length === 0) return;
    setConfirmDialogOpen(true);
  };

  const executeConfirmBatch = async () => {
    await confirmMutation.mutateAsync(selectedIds);
    setConfirmDialogOpen(false);
    setSelectedIds([]);
    if (selectedRecord && selectedIds.includes(selectedRecord.id)) {
      setSelectedRecord(null); // 확정 후 패널 닫기 (상태 동기화 단순화를 위해)
    }
  };

  const handleConfirmSingle = async (id: string) => {
    await confirmMutation.mutateAsync([id]);
    setSelectedRecord(null); // 확정 후 패널 닫기
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

  const totalNetPayForSelected = records
    .filter((r) => selectedIds.includes(r.id))
    .reduce((sum, r) => sum + r.net_pay, 0);

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
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={() => handlePrint(filteredRecords.map(r => r.id))}
              disabled={filteredRecords.length === 0}
            >
              <Printer className="mr-2 h-4 w-4" />
              목록 전체 출력
            </Button>
            <Button
              onClick={handleConfirmBatch}
              disabled={selectedIds.length === 0 || confirmMutation.isPending}
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              급여 일괄 확정 ({selectedIds.length})
            </Button>
          </div>
        </div>

        {/* Toolbar (Month Picker & Filters) */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-muted/50 p-2 rounded-lg">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={handlePrevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="font-semibold text-lg w-32 text-center">
              {format(currentDate, "yyyy년 MM월")}
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
                selectedIds={selectedIds}
                onToggleSelect={handleToggleSelect}
                onToggleSelectAll={handleToggleSelectAll}
                onRowClick={(record) => setSelectedRecord(record)}
                onMarkPaid={handleMarkPaid}
                onConfirm={handleConfirmSingle}
                onPrint={(id) => handlePrint([id])}
              />
            </div>
          </>
        )}
      </div>

      <PayrollDetailPanel
        record={selectedRecord}
        onClose={() => setSelectedRecord(null)}
        onConfirm={handleConfirmSingle}
        onPrint={(id) => handlePrint([id])}
      />

      <PayrollConfirmDialog
        open={confirmDialogOpen}
        onOpenChange={setConfirmDialogOpen}
        onConfirm={executeConfirmBatch}
        count={selectedIds.length}
        totalNetPay={totalNetPayForSelected}
      />

      {printMode && (
        <PayrollPrintView records={printRecords} storeName={storeName} />
      )}
    </>
  );
}