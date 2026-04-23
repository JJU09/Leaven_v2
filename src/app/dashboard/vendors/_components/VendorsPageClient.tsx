'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Vendor } from '@/features/vendor/types';
import { deleteVendor } from '@/features/vendor/actions';
import { toast } from 'sonner';
import { VendorSummaryCards } from './VendorSummaryCards';
import { VendorTable } from './VendorTable';
import { VendorFormDialog } from './VendorFormDialog';
import { TransactionFormDialog } from './TransactionFormDialog';
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

interface VendorsPageClientProps {
  storeId: string;
  initialVendors: Vendor[];
  totalCount: number;
  summary: {
    totalVendors: number;
    monthTotalAmount: number;
    unpaidCount: number;
    expiringCount: number;
  };
}

export function VendorsPageClient({
  storeId,
  initialVendors,
  totalCount,
  summary
}: VendorsPageClientProps) {
  const router = useRouter();
  
  // Dialog States
  const [isVendorFormOpen, setIsVendorFormOpen] = useState(false);
  const [vendorToEdit, setVendorToEdit] = useState<Vendor | null>(null);
  
  const [isTransactionFormOpen, setIsTransactionFormOpen] = useState(false);
  const [transactionVendorId, setTransactionVendorId] = useState<string | null>(null);

  const [vendorToDelete, setVendorToDelete] = useState<Vendor | null>(null);

  const handleRefresh = () => {
    router.refresh();
  };

  const handleAddClick = () => {
    setVendorToEdit(null);
    setIsVendorFormOpen(true);
  };

  const handleEditClick = (vendor: Vendor) => {
    setVendorToEdit(vendor);
    setIsVendorFormOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!vendorToDelete) return;
    
    try {
      await deleteVendor(vendorToDelete.id);
      toast.success('거래처가 삭제되었습니다.');
      handleRefresh();
    } catch (error: any) {
      toast.error(error.message || '삭제 중 오류가 발생했습니다.');
    } finally {
      setVendorToDelete(null);
    }
  };

  const handleAddTransaction = (vendorId: string) => {
    setTransactionVendorId(vendorId);
    setIsTransactionFormOpen(true);
  };

  return (
    <div className="space-y-6">
      <VendorSummaryCards {...summary} />
      
      <VendorTable 
        vendors={initialVendors} 
        totalCount={totalCount}
        onVendorClick={(v) => router.push(`/dashboard/vendors/${v.id}`)}
        onAddClick={handleAddClick}
        onEditClick={handleEditClick}
        onDeleteClick={(v) => setVendorToDelete(v)}
      />

      <VendorFormDialog 
        storeId={storeId}
        vendor={vendorToEdit}
        isOpen={isVendorFormOpen}
        onClose={() => setIsVendorFormOpen(false)}
        onSuccess={handleRefresh}
      />

      <TransactionFormDialog 
        storeId={storeId}
        vendorId={transactionVendorId}
        isOpen={isTransactionFormOpen}
        onClose={() => setIsTransactionFormOpen(false)}
        onSuccess={() => {
          handleRefresh();
        }}
      />

      <AlertDialog open={!!vendorToDelete} onOpenChange={(open) => !open && setVendorToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>거래처 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              정말로 '{vendorToDelete?.name}' 거래처를 삭제하시겠습니까?<br/>
              이 작업은 취소할 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-600 hover:bg-red-700">
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}