'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { createAsset, updateAsset } from '../actions';
import { AssetDetail } from '../types';
import { Upload } from 'lucide-react';

const assetFormSchema = z.object({
  name: z.string().min(1, '자산명은 필수입니다.'),
  category: z.string().optional(),
  model_name: z.string().optional(),
  manufacturer: z.string().optional(),
  serial_number: z.string().optional(),
  installation_location: z.string().optional(),
  purchase_date: z.string().optional(),
  purchase_amount: z.coerce.number().optional(),
  warranty_expiry_date: z.string().optional(),
  as_vendor_name: z.string().optional(),
  as_contact: z.string().optional(),
  as_url: z.string().optional(),
  next_inspection_date: z.string().optional(),
  notes: z.string().optional(),
});

type AssetFormValues = z.infer<typeof assetFormSchema>;

interface AssetFormDialogProps {
  storeId: string;
  userId: string;
  asset: AssetDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AssetFormDialog({ storeId, userId, asset, open, onOpenChange, onSuccess }: AssetFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<AssetFormValues>({
    resolver: zodResolver(assetFormSchema) as any,
    defaultValues: {
      name: asset?.name || '',
      category: asset?.category || '',
      model_name: asset?.model_name || '',
      manufacturer: asset?.manufacturer || '',
      serial_number: asset?.serial_number || '',
      installation_location: asset?.installation_location || '',
      purchase_date: asset?.purchase_date || '',
      purchase_amount: asset?.purchase_amount ?? ('' as any),
      warranty_expiry_date: asset?.warranty_expiry_date || '',
      as_vendor_name: asset?.as_vendor_name || '',
      as_contact: asset?.as_contact || '',
      as_url: asset?.as_url || '',
      next_inspection_date: asset?.next_inspection_date || '',
      notes: asset?.notes || '',
    },
  });

  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      if (asset) {
        await updateAsset(asset.id, data);
      } else {
        await createAsset({ ...data, store_id: storeId }, userId);
      }
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      alert('저장에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl sm:max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{asset ? '자산 정보 수정' : '새 자산 등록'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control as any}
                name="name"
                render={({ field }) => (
                  <FormItem className="col-span-1 md:col-span-2">
                    <FormLabel>자산명 *</FormLabel>
                    <FormControl>
                      <Input placeholder="예: LG 그램 16인치" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control as any}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>카테고리</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="카테고리 선택" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="전자기기">전자기기</SelectItem>
                        <SelectItem value="가구집기">가구집기</SelectItem>
                        <SelectItem value="주방기기">주방기기</SelectItem>
                        <SelectItem value="기타">기타</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control as any}
                name="manufacturer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>제조사</FormLabel>
                    <FormControl>
                      <Input placeholder="예: LG전자" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control as any}
                name="model_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>모델명</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control as any}
                name="serial_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>시리얼 번호</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control as any}
                name="installation_location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>설치 위치</FormLabel>
                    <FormControl>
                      <Input placeholder="예: 1층 홀, 주방 등" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control as any}
                name="purchase_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>구매일</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control as any}
                name="purchase_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>구매 금액 (원)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-4">A/S 및 보증 정보</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control as any}
                  name="warranty_expiry_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>보증 만료일</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control as any}
                  name="next_inspection_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>다음 점검 예정일</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control as any}
                  name="as_vendor_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>A/S 업체명</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control as any}
                  name="as_contact"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>A/S 연락처</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control as any}
                  name="as_url"
                  render={({ field }) => (
                    <FormItem className="col-span-1 md:col-span-2">
                      <FormLabel>A/S 접수 URL</FormLabel>
                      <FormControl>
                        <Input placeholder="https://" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <FormField
              control={form.control as any}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>메모</FormLabel>
                  <FormControl>
                    <Textarea placeholder="특이사항 등을 자유롭게 입력하세요" className="min-h-[80px]" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                취소
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? '저장 중...' : '저장'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}