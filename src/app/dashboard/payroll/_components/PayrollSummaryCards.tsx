import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/formatters";
import { PayrollRecordWithStaff } from "../_hooks/usePayroll";
import { DollarSign, FileCheck, FileMinus, FileText } from "lucide-react";

interface PayrollSummaryCardsProps {
  records: PayrollRecordWithStaff[];
}

export function PayrollSummaryCards({ records }: PayrollSummaryCardsProps) {
  const summary = records.reduce(
    (acc, record) => {
      acc.total_gross_pay += record.gross_pay || 0;
      acc.total_deduction += record.total_deduction || 0;
      acc.total_net_pay += record.net_pay || 0;
      if (record.status === "confirmed" || record.status === "paid") {
        acc.confirmed_count += 1;
      }
      return acc;
    },
    {
      total_gross_pay: 0,
      total_deduction: 0,
      total_net_pay: 0,
      confirmed_count: 0,
    }
  );

  const totalCount = records.length;
  const progressPercent = totalCount > 0 ? Math.round((summary.confirmed_count / totalCount) * 100) : 0;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">이번 달 총 급여</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(summary.total_gross_pay)}</div>
          <p className="text-xs text-muted-foreground">세전 총액 기준</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">공제 합계</CardTitle>
          <FileMinus className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-destructive">
            -{formatCurrency(summary.total_deduction)}
          </div>
          <p className="text-xs text-muted-foreground">소득세 및 4대보험 합계</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">실수령 합계</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-primary">
            {formatCurrency(summary.total_net_pay)}
          </div>
          <p className="text-xs text-muted-foreground">실제 지급될 총액</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">정산 현황</CardTitle>
          <FileCheck className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {summary.confirmed_count} / {totalCount}
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full bg-primary transition-all duration-500 ease-in-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {progressPercent}% 완료 (확정 및 지급완료)
          </p>
        </CardContent>
      </Card>
    </div>
  );
}