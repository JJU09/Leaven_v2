import { Database } from '@/lib/supabase/database.types';
import { z } from 'zod';

export type Vendor = Database['public']['Tables']['vendors']['Row'];
export type VendorTransaction = Database['public']['Tables']['vendor_transactions']['Row'];

export const vendorSchema = z.object({
  name: z.string().min(1, '거래처명을 입력해주세요'),
  category: z.string().optional().nullable(),
  manager_name: z.string().optional().nullable(),
  contact_number: z.string().optional().nullable(),
  email: z.string().email('유효한 이메일을 입력해주세요').optional().nullable(),
  address: z.string().optional().nullable(),
  business_number: z.string().optional().nullable(),
  bank_account: z.string().optional().nullable(),
  direct_contact: z.string().optional().nullable(),
  contract_type: z.enum(['delivery', 'lease', 'service']).optional().nullable(),
  contract_amount: z.number().optional().nullable(),
  payment_cycle: z.enum(['monthly', 'quarterly', 'yearly', 'per_case']).optional().nullable(),
  notes: z.string().optional().nullable(),
  contract_start_date: z.string().optional().nullable(),
  contract_end_date: z.string().optional().nullable(),
  is_auto_renewal: z.boolean().optional().nullable(),
  contract_file_url: z.string().optional().nullable(),
});

export type VendorFormData = z.infer<typeof vendorSchema>;

export const transactionSchema = z.object({
  transaction_date: z.string().min(1, '거래일을 선택해주세요'),
  description: z.string().optional().nullable(),
  amount: z.number().min(0, '금액을 입력해주세요'),
  payment_status: z.enum(['unpaid', 'paid', 'partial', 'cancelled']),
  statement_file_url: z.string().optional().nullable(),
  tax_invoice_file_url: z.string().optional().nullable(),
});

export type TransactionFormData = z.infer<typeof transactionSchema>;

export interface VendorWithStats extends Vendor {
  transaction_count?: number;
  total_amount?: number;
}

export interface VendorDetail extends Vendor {
  vendor_transactions: VendorTransaction[];
  store_assets: {
    id: string;
    name: string;
    category: string | null;
    purchase_date: string | null;
    purchase_amount: number | null;
    status: string;
  }[];
}