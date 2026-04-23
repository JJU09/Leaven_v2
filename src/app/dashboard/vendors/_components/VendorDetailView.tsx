'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Building2 } from 'lucide-react';
import { Vendor, VendorDetail } from '@/features/vendor/types';
import { deleteVendor } from '@/features/vendor/actions';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

// Tabs
import { BasicInfoTab } from './tabs/BasicInfoTab';
import { ContractTab } from './tabs/ContractTab';
import { TransactionTab } from './tabs/TransactionTab';
import { RelationsTab } from './tabs/RelationsTab';

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

interface VendorDetailViewProps {
  vendorDetail: VendorDetail;
}

export function VendorDetailView({ vendorDetail: initialVendorDetail }: VendorDetailViewProps) {
  const router = useRouter();
  const [vendorDetail, setVendorDetail] = useState<VendorDetail>(initialVendorDetail);
  
  // Dialog States
  const [isVendorFormOpen, setIsVendorFormOpen] = useState(false);
  const [isTransactionFormOpen, setIsTransactionFormOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const getContractTypeBadge = (type: string | null) => {
    switch (type) {
      case 'delivery': return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">납품</Badge>;
      case 'lease': return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">임대</Badge>;
      case 'service': return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">서비스</Badge>;
      default: return null;
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      await deleteVendor(vendorDetail.id);
      toast.success('거래처가 삭제되었습니다.');
      router.push('/dashboard/vendors');
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || '삭제 중 오류가 발생했습니다.');
    } finally {
      setIsDeleteDialogOpen(false);
    }
  };

  const handleRefresh = () => {
    router.refresh();
    // Note: In a more complex setup, we might re-fetch the detail here.
    // For now, depending on Next.js server actions and router.refresh()
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between bg-card p-6 border rounded-lg shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Building2 className="h-6 w-6 text-muted-foreground" />
            <h3 className="text-2xl font-semibold tracking-tight">{vendorDetail.name}</h3>
            {getContractTypeBadge(vendorDetail.contract_type)}
          </div>
          <p className="text-sm text-muted-foreground">
            {vendorDetail.category || '카테고리 없음'}
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => setIsVendorFormOpen(true)}>
            <Edit className="h-4 w-4 mr-2" />
            수정
          </Button>
          <Button variant="outline" className="text-red-600 hover:text-red-700" onClick={() => setIsDeleteDialogOpen(true)}>
            <Trash2 className="h-4 w-4 mr-2" />
            삭제
          </Button>
        </div>
      </div>

      <div className="bg-card border rounded-lg shadow-sm p-6">
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="basic">기본 정보</TabsTrigger>
            <TabsTrigger value="contract">계약 관리</TabsTrigger>
            <TabsTrigger value="transaction">거래 기록</TabsTrigger>
            <TabsTrigger value="relations">연결 관계</TabsTrigger>
          </TabsList>
          
          <TabsContent value="basic" className="mt-0">
            <BasicInfoTab vendor={vendorDetail} />
          </TabsContent>
          
          <TabsContent value="contract" className="mt-0">
            <ContractTab vendor={vendorDetail} />
          </TabsContent>
          
          <TabsContent value="transaction" className="mt-0">
            <TransactionTab 
              vendor={vendorDetail} 
              onAddTransaction={() => setIsTransactionFormOpen(true)} 
            />
          </TabsContent>
          
          <TabsContent value="relations" className="mt-0">
            <RelationsTab vendor={vendorDetail} />
          </TabsContent>
        </Tabs>
      </div>

      <VendorFormDialog 
        storeId={vendorDetail.store_id}
        vendor={vendorDetail as unknown as Vendor} // Hacky cast, assuming it works as before
        isOpen={isVendorFormOpen}
        onClose={() => setIsVendorFormOpen(false)}
        onSuccess={handleRefresh}
      />

      <TransactionFormDialog 
        storeId={vendorDetail.store_id}
        vendorId={vendorDetail.id}
        isOpen={isTransactionFormOpen}
        onClose={() => setIsTransactionFormOpen(false)}
        onSuccess={handleRefresh}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>거래처 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              정말로 '{vendorDetail.name}' 거래처를 삭제하시겠습니까?<br/>
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