'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Plus, Store, User, Phone, Mail } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { getVendorsByStore, createVendor, updateAssetVendor } from '../actions';
import { useDebounce } from '@/shared/lib/use-debounce';

const vendorFormSchema = z.object({
  name: z.string().min(1, '거래처명은 필수입니다.'),
  category: z.string().optional(),
  manager_name: z.string().optional(),
  contact_number: z.string().optional(),
  email: z.string().email('올바른 이메일 형식이 아닙니다.').optional().or(z.literal('')),
});

type VendorFormValues = z.infer<typeof vendorFormSchema>;

interface AssetVendorDialogProps {
  storeId: string;
  assetId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (vendor: any) => void;
}

export function AssetVendorDialog({ storeId, assetId, open, onOpenChange, onSuccess }: AssetVendorDialogProps) {
  const [mode, setMode] = useState<'search' | 'create'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);
  
  const [vendors, setVendors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchVendors = useCallback(async (query: string) => {
    setIsLoading(true);
    try {
      const data = await getVendorsByStore(storeId, query, 10);
      setVendors(data || []);
    } catch (error) {
      console.error('Failed to fetch vendors:', error);
    } finally {
      setIsLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    if (open && mode === 'search') {
      fetchVendors(debouncedSearch);
    }
  }, [open, mode, debouncedSearch, fetchVendors]);

  // 다이얼로그가 열릴 때 모드 초기화
  useEffect(() => {
    if (open) {
      setMode('search');
      setSearchQuery('');
    }
  }, [open]);

  const form = useForm<VendorFormValues>({
    resolver: zodResolver(vendorFormSchema),
    defaultValues: {
      name: '',
      category: '',
      manager_name: '',
      contact_number: '',
      email: '',
    },
  });

  const handleSelectVendor = async (vendor: any) => {
    setIsSubmitting(true);
    try {
      await updateAssetVendor(storeId, assetId, vendor.id);
      onSuccess(vendor);
      onOpenChange(false);
    } catch (error: any) {
      alert(error.message || '거래처 연결에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSubmitCreate = async (data: VendorFormValues) => {
    setIsSubmitting(true);
    try {
      // 1. 거래처 생성
      const newVendor = await createVendor(storeId, data);
      
      // 2. 자산에 연결
      await updateAssetVendor(storeId, assetId, newVendor.id);
      
      // 3. 성공 콜백 및 닫기
      onSuccess(newVendor);
      form.reset();
      onOpenChange(false);
    } catch (error: any) {
      alert(error.message || '거래처 생성 및 연결에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      if (!isSubmitting) onOpenChange(val);
    }}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle>{mode === 'search' ? '거래처 연결' : '새 거래처 등록 및 연결'}</DialogTitle>
          <DialogDescription>
            {mode === 'search' 
              ? '자산과 연결할 거래처를 검색하고 선택하세요.' 
              : '새로운 거래처 정보를 입력하면 자산에 즉시 연결됩니다.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6">
          {mode === 'search' ? (
            <div className="space-y-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="거래처명, 연락처로 검색..." 
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="space-y-3">
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">검색 중...</div>
                ) : vendors.length > 0 ? (
                  vendors.map(vendor => (
                    <div 
                      key={vendor.id} 
                      className="border rounded-lg p-4 hover:border-primary cursor-pointer transition-colors flex justify-between items-center group"
                      onClick={() => handleSelectVendor(vendor)}
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold">{vendor.name}</span>
                          {vendor.category && <Badge variant="secondary" className="text-xs">{vendor.category}</Badge>}
                        </div>
                        <div className="text-sm text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
                          {vendor.manager_name && (
                            <span className="flex items-center"><User className="w-3 h-3 mr-1" />{vendor.manager_name}</span>
                          )}
                          {vendor.contact_number && (
                            <span className="flex items-center"><Phone className="w-3 h-3 mr-1" />{vendor.contact_number}</span>
                          )}
                          {vendor.email && (
                            <span className="flex items-center"><Mail className="w-3 h-3 mr-1" />{vendor.email}</span>
                          )}
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100" disabled={isSubmitting}>
                        선택
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 px-4 border border-dashed rounded-lg bg-muted/30">
                    <Store className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
                    <p className="text-muted-foreground mb-4">검색된 거래처가 없습니다.</p>
                    <Button onClick={() => setMode('create')} variant="outline">
                      <Plus className="w-4 h-4 mr-2" /> 새 거래처 등록하기
                    </Button>
                  </div>
                )}
              </div>

              {vendors.length > 0 && (
                <div className="pt-4 border-t text-center">
                  <span className="text-sm text-muted-foreground mr-3">찾으시는 거래처가 없나요?</span>
                  <Button variant="link" size="sm" onClick={() => setMode('create')} className="px-0">
                    새 거래처 등록하기
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <Form {...form}>
              <form id="vendor-create-form" onSubmit={form.handleSubmit(onSubmitCreate)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>거래처명 *</FormLabel>
                      <FormControl>
                        <Input placeholder="예: (주)삼성전자 서비스" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>카테고리</FormLabel>
                      <FormControl>
                        <Input placeholder="예: A/S, 자재공급 등" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="manager_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>담당자 이름</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="contact_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>연락처</FormLabel>
                        <FormControl>
                          <Input placeholder="010-0000-0000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>이메일</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="example@email.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </Form>
          )}
        </div>

        <div className="p-6 pt-4 border-t bg-muted/10 flex justify-end gap-2">
          {mode === 'create' && (
            <Button variant="ghost" onClick={() => setMode('search')} disabled={isSubmitting}>
              뒤로
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            취소
          </Button>
          {mode === 'create' && (
            <Button type="submit" form="vendor-create-form" disabled={isSubmitting}>
              {isSubmitting ? '저장 및 연결 중...' : '저장 및 연결'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}