'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { createAsset, updateAsset } from '../actions';
import { AssetDetail } from '../types';
import { useRouter } from 'next/navigation';

const emptyToNull = z.string().transform(v => v === '' ? null : v).nullable().optional();

const assetFormSchema = z.object({
  name: z.string().min(1, '자산명은 필수입니다.'),
  category: emptyToNull,
  model_name: emptyToNull,
  manufacturer: emptyToNull,
  serial_number: emptyToNull,
  purchase_date: emptyToNull,
  purchase_amount: z.union([z.string(), z.number()]).transform(v => {
    if (v === '' || v === null || v === undefined) return null;
    const num = Number(v.toString().replace(/,/g, ''));
    return isNaN(num) ? null : num;
  }).nullable().optional(),
  warranty_expiry_date: emptyToNull,
  as_vendor_name: emptyToNull,
  as_contact: emptyToNull,
  as_url: emptyToNull,
  next_inspection_date: emptyToNull,
  notes: emptyToNull,
});

type AssetFormValues = z.infer<typeof assetFormSchema>;

interface AssetFormProps {
  storeId: string;
  userId: string;
  asset?: AssetDetail | null;
  locations?: string[];
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function AssetForm({ storeId, userId, asset, locations = [], onSuccess, onCancel }: AssetFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<AssetFormValues>({
    resolver: zodResolver(assetFormSchema) as any,
    defaultValues: {
      name: asset?.name || '',
      category: asset?.category || '',
      model_name: asset?.model_name || '',
      manufacturer: asset?.manufacturer || '',
      serial_number: asset?.serial_number || '',
      purchase_date: asset?.purchase_date || '',
      purchase_amount: asset?.purchase_amount ? asset.purchase_amount.toLocaleString() : ('' as any),
      warranty_expiry_date: asset?.warranty_expiry_date || '',
      as_vendor_name: asset?.as_vendor_name || '',
      as_contact: asset?.as_contact || '',
      as_url: asset?.as_url || '',
      next_inspection_date: asset?.next_inspection_date || '',
      notes: asset?.notes || '',
    },
  });

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      window.history.length > 1 ? router.back() : router.push('/dashboard/assets');
    }
  };

  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      if (asset) {
        await updateAsset(asset.id, data);
      } else {
        await createAsset({ ...data, store_id: storeId }, userId);
      }
      
      if (onSuccess) {
        onSuccess();
      } else {
        router.push('/dashboard/assets');
      }
    } catch (error) {
      console.error(error);
      alert('저장에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
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
                      <SelectItem value="소프트웨어">소프트웨어</SelectItem>
                      <SelectItem value="차량">차량</SelectItem>
                      <SelectItem value="공구">공구</SelectItem>
                      <SelectItem value="비품">비품</SelectItem>
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
            render={({ field: { onChange, value, ...field } }) => (
              <FormItem>
                <FormLabel>구매 금액 (원)</FormLabel>
                <FormControl>
                  <Input 
                    type="text" 
                    placeholder="0"
                    value={value || ''}
                    onChange={(e) => {
                      const rawValue = e.target.value.replace(/[^0-9]/g, '');
                      if (!rawValue) {
                        onChange('');
                        return;
                      }
                      const formatted = Number(rawValue).toLocaleString();
                      onChange(formatted);
                    }}
                    {...field} 
                  />
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
              render={({ field: { onChange, value, ...field } }) => (
                <FormItem>
                  <FormLabel>A/S 연락처</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="000-0000-0000"
                      value={value || ''}
                      onChange={(e) => {
                        let val = e.target.value.replace(/[^0-9]/g, '');
                        if (val.length > 11) {
                          val = val.slice(0, 11);
                        }
                        
                        let formatted = val;
                        if (val.length === 11) {
                          formatted = val.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
                        } else if (val.length === 10) {
                          if (val.startsWith('02')) {
                            formatted = val.replace(/(\d{2})(\d{4})(\d{4})/, '$1-$2-$3');
                          } else {
                            formatted = val.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
                          }
                        } else if (val.length > 7) {
                          if (val.startsWith('02')) {
                            formatted = val.replace(/(\d{2})(\d{3,4})(\d{1,4})/, '$1-$2-$3');
                          } else {
                            formatted = val.replace(/(\d{3})(\d{3,4})(\d{1,4})/, '$1-$2-$3');
                          }
                        } else if (val.length > 3) {
                          if (val.startsWith('02')) {
                            formatted = val.replace(/(\d{2})(\d{1,4})/, '$1-$2');
                          } else {
                            formatted = val.replace(/(\d{3})(\d{1,4})/, '$1-$2');
                          }
                        }
                        onChange(formatted);
                      }}
                      {...field} 
                    />
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
          <Button type="button" variant="outline" onClick={handleCancel} disabled={isSubmitting}>
            취소
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? '저장 중...' : '저장'}
          </Button>
        </div>
      </form>
    </Form>
  );
}