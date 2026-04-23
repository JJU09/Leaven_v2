'use server';

import { createClient } from '@/lib/supabase/server';
import { VendorFormData, TransactionFormData } from '../types';
import { revalidatePath } from 'next/cache';

export async function getVendors(
  storeId: string,
  page: number = 1,
  limit: number = 10,
  search?: string,
  category?: string,
  contractType?: string
) {
  const supabase = await createClient();
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from('vendors')
    .select('*', { count: 'exact' })
    .eq('store_id', storeId)
    .is('deleted_at', null);

  if (search) {
    query = query.or(`name.ilike.%${search}%,manager_name.ilike.%${search}%`);
  }
  if (category && category !== 'all') {
    query = query.eq('category', category);
  }
  if (contractType && contractType !== 'all') {
    query = query.eq('contract_type', contractType);
  }

  const { data, count, error } = await query
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    console.error('Error fetching vendors:', error);
    throw new Error('거래처 목록을 불러오는데 실패했습니다.');
  }

  return { data, count };
}

export async function getVendorDetail(vendorId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('vendors')
    .select(`
      *,
      vendor_transactions(*),
      store_assets(id, name, category, purchase_date, purchase_amount, status)
    `)
    .eq('id', vendorId)
    .is('deleted_at', null)
    .single();

  if (error) {
    console.error('Error fetching vendor detail:', error);
    throw new Error('거래처 상세 정보를 불러오는데 실패했습니다.');
  }

  // vendor_transactions 정렬 (최신순)
  if (data && data.vendor_transactions) {
    data.vendor_transactions.sort((a: any, b: any) => 
      new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime()
    );
  }

  return data;
}

export async function getVendorSummary(storeId: string) {
  const supabase = await createClient();
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

  // 1. 전체 거래처 수
  const { count: totalVendors } = await supabase
    .from('vendors')
    .select('*', { count: 'exact', head: true })
    .eq('store_id', storeId)
    .is('deleted_at', null);

  // 2. 이번 달 총 거래 금액
  const { data: monthTransactions } = await supabase
    .from('vendor_transactions')
    .select('amount')
    .eq('store_id', storeId)
    .gte('transaction_date', startOfMonth)
    .lte('transaction_date', endOfMonth)
    .is('deleted_at', null);

  const monthTotalAmount = monthTransactions?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0;

  // 3. 미결제 건수
  const { count: unpaidCount } = await supabase
    .from('vendor_transactions')
    .select('id', { count: 'exact', head: true })
    .eq('store_id', storeId)
    .in('payment_status', ['unpaid', 'partial'])
    .is('deleted_at', null);

  // 4. 계약 만료 임박 (30일 이내)
  const in30Days = new Date();
  in30Days.setDate(in30Days.getDate() + 30);
  
  const { count: expiringCount } = await supabase
    .from('vendors')
    .select('id', { count: 'exact', head: true })
    .eq('store_id', storeId)
    .is('deleted_at', null)
    .not('contract_end_date', 'is', null)
    .lte('contract_end_date', in30Days.toISOString())
    .gte('contract_end_date', new Date().toISOString());

  return {
    totalVendors: totalVendors || 0,
    monthTotalAmount,
    unpaidCount: unpaidCount || 0,
    expiringCount: expiringCount || 0
  };
}

export async function createVendor(storeId: string, data: VendorFormData) {
  const supabase = await createClient();

  const { data: newVendor, error } = await supabase
    .from('vendors')
    .insert([{ ...data, store_id: storeId }])
    .select()
    .single();

  if (error) {
    console.error('Error creating vendor:', error);
    throw new Error('거래처 등록에 실패했습니다.');
  }

  revalidatePath(`/dashboard/vendors`);
  return newVendor;
}

export async function updateVendor(vendorId: string, data: Partial<VendorFormData>) {
  const supabase = await createClient();

  const { data: updatedVendor, error } = await supabase
    .from('vendors')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', vendorId)
    .select()
    .single();

  if (error) {
    console.error('Error updating vendor:', error);
    throw new Error('거래처 수정에 실패했습니다.');
  }

  revalidatePath(`/dashboard/vendors`);
  return updatedVendor;
}

export async function deleteVendor(vendorId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('vendors')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', vendorId);

  if (error) {
    console.error('Error deleting vendor:', error);
    throw new Error('거래처 삭제에 실패했습니다.');
  }

  revalidatePath(`/dashboard/vendors`);
}

export async function createTransaction(storeId: string, vendorId: string, data: TransactionFormData) {
  const supabase = await createClient();

  const { data: newTransaction, error } = await supabase
    .from('vendor_transactions')
    .insert([{ ...data, store_id: storeId, vendor_id: vendorId }])
    .select()
    .single();

  if (error) {
    console.error('Error creating transaction:', error);
    throw new Error('거래 내역 등록에 실패했습니다.');
  }

  revalidatePath(`/dashboard/vendors`);
  return newTransaction;
}

export async function updateTransaction(transactionId: string, data: Partial<TransactionFormData>) {
  const supabase = await createClient();

  const { data: updatedTransaction, error } = await supabase
    .from('vendor_transactions')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', transactionId)
    .select()
    .single();

  if (error) {
    console.error('Error updating transaction:', error);
    throw new Error('거래 내역 수정에 실패했습니다.');
  }

  revalidatePath(`/dashboard/vendors`);
  return updatedTransaction;
}

export async function deleteTransaction(transactionId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('vendor_transactions')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', transactionId);

  if (error) {
    console.error('Error deleting transaction:', error);
    throw new Error('거래 내역 삭제에 실패했습니다.');
  }

  revalidatePath(`/dashboard/vendors`);
}