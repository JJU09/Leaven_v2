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
import { Switch } from '@/components/ui/switch';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Vendor, VendorFormData, vendorSchema } from '@/features/vendor/types';
import { createVendor, updateVendor } from '@/features/vendor/actions';

interface VendorFormDialogProps {
  storeId: string;
  vendor?: Vendor | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function VendorFormDialog({
  storeId,
  vendor,
  isOpen,
  onClose,
  onSuccess
}: VendorFormDialogProps) {
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors }
  } = useForm<VendorFormData>({
    resolver: zodResolver(vendorSchema),
    defaultValues: {
      name: vendor?.name || '',
      category: vendor?.category || '',
      manager_name: vendor?.manager_name || '',
      contact_number: vendor?.contact_number || '',
      email: vendor?.email || '',
      address: vendor?.address || '',
      business_number: vendor?.business_number || '',
      bank_account: vendor?.bank_account || '',
      direct_contact: vendor?.direct_contact || '',
      contract_type: (vendor?.contract_type as any) || undefined,
      contract_amount: vendor?.contract_amount || 0,
      payment_cycle: (vendor?.payment_cycle as any) || undefined,
      notes: vendor?.notes || '',
      contract_start_date: vendor?.contract_start_date || '',
      contract_end_date: vendor?.contract_end_date || '',
      is_auto_renewal: vendor?.is_auto_renewal || false,
      contract_file_url: vendor?.contract_file_url || '',
    }
  });

  const onSubmit = async (data: VendorFormData) => {
    setLoading(true);
    try {
      const submitData = { ...data };
      // 빈 문자열 날짜 처리
      if (!submitData.contract_start_date) delete submitData.contract_start_date;
      if (!submitData.contract_end_date) delete submitData.contract_end_date;

      if (vendor) {
        await updateVendor(vendor.id, submitData);
        toast.success('거래처 정보가 수정되었습니다.');
      } else {
        await createVendor(storeId, submitData);
        toast.success('거래처가 등록되었습니다.');
      }
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.message || '저장 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl sm:max-w-5xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{vendor ? '거래처 정보 수정' : '새 거래처 등록'}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-grow px-1">
          <form id="vendor-form" onSubmit={handleSubmit(onSubmit)} className="space-y-8 p-1">
            {/* 섹션 1: 기본 정보 */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium border-b pb-2">기본 정보</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2 col-span-1 md:col-span-2">
                  <Label htmlFor="name">거래처명 <span className="text-red-500">*</span></Label>
                  <Input id="name" {...register('name')} placeholder="거래처명 입력" />
                  {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">카테고리</Label>
                  <Input id="category" {...register('category')} placeholder="예: 식자재, 소모품" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="manager_name">담당자명</Label>
                  <Input id="manager_name" {...register('manager_name')} placeholder="담당자 이름" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact_number">대표 연락처</Label>
                  <Input id="contact_number" {...register('contact_number')} placeholder="02-000-0000" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="direct_contact">직통 연락처</Label>
                  <Input id="direct_contact" {...register('direct_contact')} placeholder="010-0000-0000" />
                </div>

                <div className="space-y-2 col-span-1 md:col-span-3">
                  <Label htmlFor="address">주소</Label>
                  <Input id="address" {...register('address')} placeholder="상세 주소 입력" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">이메일</Label>
                  <Input id="email" type="email" {...register('email')} placeholder="example@email.com" />
                  {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="business_number">사업자등록번호</Label>
                  <Input id="business_number" {...register('business_number')} placeholder="000-00-00000" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bank_account">계좌번호</Label>
                  <Input id="bank_account" {...register('bank_account')} placeholder="은행명 계좌번호 예금주" />
                </div>

                <div className="space-y-2 col-span-1 md:col-span-3">
                  <Label htmlFor="notes">메모</Label>
                  <Textarea id="notes" {...register('notes')} placeholder="참고사항을 입력하세요" className="h-24" />
                </div>
              </div>
            </div>

            {/* 섹션 2: 계약 정보 */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium border-b pb-2">계약 정보</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>계약 유형</Label>
                  <Select 
                    onValueChange={(v) => setValue('contract_type', v as any)} 
                    defaultValue={vendor?.contract_type || undefined}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="계약 유형 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="delivery">납품</SelectItem>
                      <SelectItem value="lease">임대</SelectItem>
                      <SelectItem value="service">서비스</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contract_amount">계약 금액</Label>
                  <Input 
                    id="contract_amount" 
                    type="number" 
                    {...register('contract_amount', { valueAsNumber: true })} 
                    placeholder="0" 
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contract_start_date">계약 시작일</Label>
                  <Input id="contract_start_date" type="date" {...register('contract_start_date')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contract_end_date">계약 종료일</Label>
                  <Input id="contract_end_date" type="date" {...register('contract_end_date')} />
                </div>

                <div className="space-y-2">
                  <Label>결제 주기</Label>
                  <Select 
                    onValueChange={(v) => setValue('payment_cycle', v as any)} 
                    defaultValue={vendor?.payment_cycle || undefined}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="결제 주기 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">매월</SelectItem>
                      <SelectItem value="quarterly">분기별</SelectItem>
                      <SelectItem value="yearly">매년</SelectItem>
                      <SelectItem value="per_case">건별결제</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 flex flex-col justify-center">
                  <Label className="mb-2">자동 갱신</Label>
                  <div className="flex items-center space-x-2">
                    <Switch 
                      checked={watch('is_auto_renewal') || false}
                      onCheckedChange={(v) => setValue('is_auto_renewal', v)}
                    />
                    <span className="text-sm text-muted-foreground">계약 자동 연장</span>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </ScrollArea>

        <DialogFooter className="pt-4 mt-2 border-t">
          <Button variant="outline" onClick={onClose} disabled={loading}>취소</Button>
          <Button type="submit" form="vendor-form" disabled={loading}>
            {loading ? '저장 중...' : (vendor ? '수정 내용 저장' : '거래처 등록')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}