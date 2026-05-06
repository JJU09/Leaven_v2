'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
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
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Vendor, VendorFormData, vendorSchema } from '@/features/vendor/types';
import { createVendor, updateVendor } from '@/features/vendor/actions';
import { VendorContractUpload } from './VendorContractUpload';
import { formatPhoneNumber, formatBusinessNumber } from '@/lib/formatters';

interface VendorFormProps {
  storeId: string;
  vendor?: Vendor | null;
}

export function VendorForm({
  storeId,
  vendor,
}: VendorFormProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
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
      bank_name: vendor?.bank_name || '',
      account_number: vendor?.account_number || '',
      account_holder: vendor?.account_holder || '',
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
        router.push(`/dashboard/vendors/${vendor.id}`);
      } else {
        await createVendor(storeId, submitData);
        toast.success('거래처가 등록되었습니다.');
        router.push('/dashboard/vendors');
      }
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || '저장 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form id="vendor-form" onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <h3 className="text-lg font-medium border-b pb-2">기본 정보</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2 col-span-1 md:col-span-2">
                <Label htmlFor="name">거래처명 <span className="text-red-500">*</span></Label>
                <Input id="name" {...register('name')} placeholder="거래처명 입력" />
                {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">카테고리</Label>
                <Select 
                  onValueChange={(v) => setValue('category', v)} 
                  defaultValue={vendor?.category || undefined}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="카테고리 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="식자재">식자재</SelectItem>
                    <SelectItem value="주류/음료">주류/음료</SelectItem>
                    <SelectItem value="소모품">소모품</SelectItem>
                    <SelectItem value="장비">장비</SelectItem>
                    <SelectItem value="서비스/유지보수">서비스/유지보수</SelectItem>
                    <SelectItem value="마케팅/광고">마케팅/광고</SelectItem>
                    <SelectItem value="공과금">공과금</SelectItem>
                    <SelectItem value="기타">기타</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="manager_name">담당자명</Label>
                <Input id="manager_name" {...register('manager_name')} placeholder="담당자 이름" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_number">대표 연락처</Label>
                <Input 
                  id="contact_number" 
                  {...register('contact_number', {
                    onChange: (e) => {
                      const formatted = formatPhoneNumber(e.target.value);
                      setValue('contact_number', formatted, { shouldValidate: true });
                    }
                  })} 
                  placeholder="02-000-0000" 
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="direct_contact">직통 연락처</Label>
                <Input 
                  id="direct_contact" 
                  {...register('direct_contact', {
                    onChange: (e) => {
                      const formatted = formatPhoneNumber(e.target.value);
                      setValue('direct_contact', formatted, { shouldValidate: true });
                    }
                  })} 
                  placeholder="010-0000-0000" 
                />
              </div>

              <div className="space-y-2 col-span-1 md:col-span-3">
                <Label htmlFor="address">주소</Label>
                <Input id="address" {...register('address')} placeholder="상세 주소 입력" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">이메일 <span className="text-red-500">*</span></Label>
                <Input id="email" type="email" {...register('email')} placeholder="example@email.com" />
                {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="business_number">사업자등록번호</Label>
                <Input 
                  id="business_number" 
                  {...register('business_number', {
                    onChange: (e) => {
                      const formatted = formatBusinessNumber(e.target.value);
                      setValue('business_number', formatted, { shouldValidate: true });
                    }
                  })} 
                  placeholder="000-00-00000" 
                />
              </div>
              <div className="space-y-2 col-span-1 md:col-span-2">
                <Label>계좌 정보</Label>
                <div className="flex gap-2">
                  <Input 
                    className="w-[120px]" 
                    id="bank_name" 
                    {...register('bank_name')} 
                    placeholder="은행명" 
                  />
                  <Input 
                    className="flex-1" 
                    id="account_number" 
                    {...register('account_number')} 
                    placeholder="계좌번호 (숫자만)" 
                  />
                  <Input 
                    className="w-[120px]" 
                    id="account_holder" 
                    {...register('account_holder')} 
                    placeholder="예금주" 
                  />
                </div>
              </div>

              <div className="space-y-2 col-span-1 md:col-span-3">
                <Label htmlFor="notes">메모</Label>
                <Textarea id="notes" {...register('notes')} placeholder="참고사항을 입력하세요" className="h-24" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <h3 className="text-lg font-medium border-b pb-2">계약 정보</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                    <SelectItem value="maintenance">유지보수</SelectItem>
                    <SelectItem value="outsourcing">외주</SelectItem>
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

              <div className="space-y-2">
                <Label htmlFor="contract_start_date">계약 시작일</Label>
                <Input id="contract_start_date" type="date" {...register('contract_start_date')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contract_end_date">계약 종료일</Label>
                <Input id="contract_end_date" type="date" {...register('contract_end_date')} />
              </div>
              
              <div className="space-y-2 col-span-1 md:col-span-3 mt-4">
                <Label>계약서 첨부 파일</Label>
                <VendorContractUpload 
                  storeId={storeId}
                  currentUrl={watch('contract_file_url')}
                  onUpload={(url) => setValue('contract_file_url', url || '')}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4 pt-4">
        <Button 
          type="button" 
          variant="outline" 
          onClick={() => router.back()} 
          disabled={loading}
        >
          취소
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? '저장 중...' : (vendor ? '수정 내용 저장' : '거래처 등록')}
        </Button>
      </div>
    </form>
  );
}