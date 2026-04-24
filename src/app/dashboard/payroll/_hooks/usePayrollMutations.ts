import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { PayrollRecord } from "@/features/payroll/types";

export function useUpdatePayrollDeduction(storeId: string, year: number, month: number) {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      deductions,
      total_deduction,
      net_pay,
    }: {
      id: string;
      deductions: {
        income_tax: number;
        local_income_tax: number;
        national_pension: number;
        health_insurance: number;
        employment_insurance: number;
        long_term_care: number;
      };
      total_deduction: number;
      net_pay: number;
    }) => {
      const { data, error } = await supabase
        .from("payroll_records")
        .update({
          ...deductions,
          total_deduction,
          net_pay,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll", storeId, year, month] });
    },
  });
}

export function useConfirmPayroll(storeId: string, year: number, month: number) {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { data, error } = await supabase
        .from("payroll_records")
        .update({
          status: "confirmed",
          confirmed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .in("id", ids)
        .eq("status", "draft")
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll", storeId, year, month] });
    },
  });
}

export function useMarkPayrollPaid(storeId: string, year: number, month: number) {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("payroll_records")
        .update({
          status: "paid",
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("status", "confirmed")
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll", storeId, year, month] });
    },
  });
}