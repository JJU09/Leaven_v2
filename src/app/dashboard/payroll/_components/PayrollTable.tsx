import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
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
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: (checked: boolean) => void;
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
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onRowClick,
  onMarkPaid,
  onConfirm,
  onPrint,
}: PayrollTableProps) {
  const allDraftSelected =
    records.length > 0 &&
    records.filter((r) => r.status === "draft").every((r) => selectedIds.includes(r.id));
  const someDraftSelected =
    records.filter((r) => r.status === "draft").some((r) => selectedIds.includes(r.id));

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12 text-center">
              <Checkbox
                checked={allDraftSelected || (someDraftSelected ? "indeterminate" : false)}
                onCheckedChange={(checked) => onToggleSelectAll(!!checked)}
                aria-label="Select all"
              />
            </TableHead>
            <TableHead>직원</TableHead>
            <TableHead>유형</TableHead>
            <TableHead className="text-right">근무일/시간</TableHead>
            <TableHead className="text-right">기본급</TableHead>
            <TableHead className="text-right">추가수당</TableHead>
            <TableHead className="text-right">공제액</TableHead>
            <TableHead className="text-right">실수령액</TableHead>
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
              const isSelected = selectedIds.includes(record.id);
              const extraPay = (record.overtime_pay || 0) + (record.weekly_holiday_pay || 0);
              const profile = record.store_members?.profiles;
              const roleName = record.store_members?.store_roles?.name;

              return (
                <TableRow
                  key={record.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => onRowClick(record)}
                >
                  <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={isSelected}
                      disabled={record.status !== "draft"}
                      onCheckedChange={() => onToggleSelect(record.id)}
                      aria-label={`Select ${profile?.full_name}`}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={profile?.avatar_url || undefined} />
                        <AvatarFallback>
                          {profile?.full_name?.charAt(0) || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">{profile?.full_name}</span>
                        <span className="text-xs text-muted-foreground">{roleName}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{getWageTypeLabel(record.wage_type)}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-col">
                      <span className="text-sm">{record.work_days}일</span>
                      <span className="text-xs text-muted-foreground">
                        {record.work_hours}시간
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(record.base_pay)}
                  </TableCell>
                  <TableCell className="text-right">
                    {extraPay > 0 ? (
                      <span className="text-green-600 font-medium">
                        +{formatCurrency(extraPay)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {record.total_deduction > 0 ? (
                      <span className="text-destructive font-medium">
                        -{formatCurrency(record.total_deduction)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-bold text-primary">
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