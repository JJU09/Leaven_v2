import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatCurrency } from "@/lib/formatters";

interface PayrollConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  count: number;
  totalNetPay: number;
}

export function PayrollConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  count,
  totalNetPay,
}: PayrollConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{count > 1 ? "급여 일괄 확정" : "급여 확정"}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 mt-2">
              <div>
                {count > 1 
                  ? `선택한 ${count}명의 급여 내역을 확정하시겠습니까?` 
                  : "현재 직원의 급여 내역을 확정하시겠습니까?"}
              </div>
              <div className="bg-muted p-3 rounded-md mt-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">총 실수령액 합계</span>
                  <span className="font-bold text-primary">
                    {formatCurrency(totalNetPay)}
                  </span>
                </div>
              </div>
              <div className="text-sm text-destructive mt-2">
                ※ 확정 후에는 공제액을 수정할 수 없습니다. 계속하시겠습니까?
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>취소</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>확정하기</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}