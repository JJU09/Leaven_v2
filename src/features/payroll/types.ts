import { Database } from "@/lib/supabase/database.types";

export type WageType = Database["public"]["Enums"]["wage_type"];
export type PayrollStatus = Database["public"]["Enums"]["payroll_status"];

export interface PayrollRecord {
  id: string;
  store_id: string;
  staff_id: string;
  period_year: number;
  period_month: number;
  wage_type: WageType;
  
  work_days: number;
  work_hours: number;
  overtime_hours: number;
  
  base_pay: number;
  overtime_pay: number;
  weekly_holiday_pay: number;
  gross_pay: number;
  
  income_tax: number;
  local_income_tax: number;
  national_pension: number;
  health_insurance: number;
  employment_insurance: number;
  long_term_care: number;
  
  total_deduction: number;
  net_pay: number;
  
  status: PayrollStatus;
  confirmed_at: string | null;
  paid_at: string | null;
  note: string | null;
  
  created_at: string;
  updated_at: string;
}

export interface PayrollSummary {
  total_gross_pay: number;
  total_deduction: number;
  total_net_pay: number;
  confirmed_count: number;
  paid_count: number;
  total_count: number;
}