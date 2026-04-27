import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/formatters";
import { PayrollRecordWithStaff } from "../_hooks/usePayroll";
import { WageType, PayrollStatus } from "@/features/payroll/types";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, FileText, CheckCircle, HandCoins } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface PayrollTableProps {
  records: PayrollRecordWithStaff[];
  onRowClick: (record: PayrollRecordWithStaff) => void;
  onMarkPaid: (id: string) => void;
  onConfirm: (id: string) => void;
  onPrint: (id: string) => void;
}

const getWageTypeLabel = (type: WageType) => {
  const map: Record<WageType, string> = {
    hourly: "시급",
    daily: "일급",
    monthly: "월급",
    yearly: "연봉",
  };
  return map[type] || type;
};

const getStatusBadge = (status: PayrollStatus) => {
  switch (status) {
    case "draft":
      return <Badge variant="outline" className="bg-slate-100 text-slate-700">미확정</Badge>;
    case "confirmed":
      return <Badge variant="default" className="bg-blue-100 text-blue-700 hover:bg-blue-100">확정</Badge>;
    case "paid":
      return <Badge variant="default" className="bg-green-100 text-green-700 hover:bg-green-100">지급완료</Badge>;
    default:
      return null;
  }
};

export function PayrollTable({
  records,
  onRowClick,
  onMarkPaid,
  onConfirm,
  onPrint,
}: PayrollTableProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-center">직원</TableHead>
            <TableHead className="text-center">유형</TableHead>
            <TableHead className="text-center">근무일/시간</TableHead>
            <TableHead className="text-center">기본급</TableHead>
            <TableHead className="text-center">추가수당</TableHead>
            <TableHead className="text-center">공제액</TableHead>
            <TableHead className="text-center">실수령액</TableHead>
            <TableHead className="text-center">상태</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.length === 0 ? (
            <TableRow>
              <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">
                검색된 급여 내역이 없습니다.
              </TableCell>
            </TableRow>
          ) : (
            records.map((record) => {
              const extraPay = (record.overtime_pay || 0) + (record.weekly_holiday_pay || 0);
              const profile = record.store_members?.profiles;
              const manualName = record.store_members?.name;
              const displayName = profile?.full_name || manualName || "알 수 없음";
              const roleName = record.store_members?.store_roles?.name;

              return (
                <TableRow
                  key={record.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => onRowClick(record)}
                >
                  <TableCell>
                    <div className="flex items-center justify-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={profile?.avatar_url || undefined} />
                        <AvatarFallback>
                          {displayName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col text-left">
                        <span className="font-medium text-sm">{displayName}</span>
                        <span className="text-xs text-muted-foreground">{roleName}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">{getWageTypeLabel(record.wage_type)}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex flex-col">
                      <span className="text-sm">{record.work_days}일</span>
                      <span className="text-xs text-muted-foreground">
                        {record.work_hours}시간
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center font-medium">
                    {formatCurrency(record.base_pay)}
                  </TableCell>
                  <TableCell className="text-center">
                    {extraPay > 0 ? (
                      <span className="text-green-600 font-medium">
                        +{formatCurrency(extraPay)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {record.total_deduction > 0 ? (
                      <span className="text-destructive font-medium">
                        -{formatCurrency(record.total_deduction)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center font-bold text-primary">
                    {formatCurrency(record.net_pay)}
                  </TableCell>
                  <TableCell className="text-center">
                    {getStatusBadge(record.status)}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">메뉴 열기</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>액션</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => onPrint(record.id)}>
                          <FileText className="mr-2 h-4 w-4" />
                          명세서 출력
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {record.status === "draft" && (
                          <DropdownMenuItem onClick={() => onConfirm(record.id)}>
                            <CheckCircle className="mr-2 h-4 w-4" />
                            확정 처리
                          </DropdownMenuItem>
                        )}
                        {record.status === "confirmed" && (
                          <DropdownMenuItem onClick={() => onMarkPaid(record.id)}>
                            <HandCoins className="mr-2 h-4 w-4" />
                            지급 완료 처리
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}