'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { TransactionFormData, transactionSchema, VendorTransaction } from '@/features/vendor/types';
import { createTransaction, updateTransaction, deleteTransaction } from '@/features/vendor/actions';

interface TransactionFormDialogProps {
  storeId: string;
  vendorId: string | null;
  transaction?: VendorTransaction | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function TransactionFormDialog({
  storeId,
  vendorId,
  transaction,
  isOpen,
  onClose,
  onSuccess
}: TransactionFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors }
  } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    values: transaction ? {
      transaction_date: transaction.transaction_date,
      description: transaction.description || '',
      amount: transaction.amount || 0,
      payment_status: transaction.payment_status as any || 'unpaid',
      statement_file_url: transaction.statement_file_url || '',
      tax_invoice_file_url: transaction.tax_invoice_file_url || ''
    } : {
      transaction_date: new Date().toISOString().split('T')[0],
      description: '',
      amount: 0,
      payment_status: 'unpaid',
      statement_file_url: '',
      tax_invoice_file_url: ''
    }
  });

  const onSubmit = async (data: TransactionFormData) => {
    if (!vendorId) return;
    
    setLoading(true);
    try {
      if (transaction) {
        await updateTransaction(transaction.id, data);
        toast.success('거래 내역이 수정되었습니다.');
      } else {
        await createTransaction(storeId, vendorId, data);
        toast.success('거래 내역이 추가되었습니다.');
      }
      onSuccess();
      onClose();
      reset();
    } catch (error: any) {
      toast.error(error.message || '저장 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!transaction) return;
    
    setLoading(true);
    try {
      await deleteTransaction(transaction.id);
      toast.success('거래 내역이 삭제되었습니다.');
      onSuccess();
      onClose();
      reset();
    } catch (error: any) {
      toast.error(error.message || '삭제 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
      setIsDeleteDialogOpen(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{transaction ? '거래 내역 수정' : '새 거래 내역 추가'}</DialogTitle>
        </DialogHeader>

        <form id="transaction-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="transaction_date">거래일 <span className="text-red-500">*</span></Label>
            <Input id="transaction_date" type="date" {...register('transaction_date')} />
            {errors.transaction_date && <p className="text-sm text-red-500">{errors.transaction_date.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">거래 내용</Label>
            <Input id="description" {...register('description')} placeholder="예: 4월 식자재 납품 대금" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">금액 <span className="text-red-500">*</span></Label>
            <Input 
              id="amount" 
              type="number" 
              {...register('amount', { valueAsNumber: true })} 
              placeholder="0" 
            />
            {errors.amount && <p className="text-sm text-red-500">{errors.amount.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>결제 상태 <span className="text-red-500">*</span></Label>
            <Select 
              onValueChange={(v) => setValue('payment_status', v as any)} 
              defaultValue="unpaid"
            >
              <SelectTrigger>
                <SelectValue placeholder="결제 상태 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unpaid">미결제</SelectItem>
                <SelectItem value="paid">결제 완료</SelectItem>
                <SelectItem value="partial">부분 결제</SelectItem>
                <SelectItem value="cancelled">취소됨</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </form>

        <DialogFooter className="flex items-center justify-between sm:justify-between w-full">
          <div>
            {transaction && (
              <Button 
                type="button" 
                variant="destructive" 
                onClick={() => setIsDeleteDialogOpen(true)}
                disabled={loading}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                삭제
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={loading}>취소</Button>
            <Button type="submit" form="transaction-form" disabled={loading}>
              {loading ? '저장 중...' : (transaction ? '수정' : '추가')}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>거래 내역 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              이 거래 내역을 삭제하시겠습니까? 이 작업은 취소할 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>취소</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              className="bg-red-600 hover:bg-red-700"
              disabled={loading}
            >
              {loading ? '삭제 중...' : '삭제'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
