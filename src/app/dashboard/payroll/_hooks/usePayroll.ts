import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { PayrollRecord, PayrollSummary, WageType, PayrollStatus } from "@/features/payroll/types";

export interface PayrollRecordWithStaff extends PayrollRecord {
  store_members: {
    id: string;
    user_id: string;
    role_id: string;
    wage_type: WageType;
    base_hourly_wage: number;
    base_daily_wage: number;
    base_monthly_wage: number;
    base_yearly_wage: number;
    profiles: {
      full_name: string;
      avatar_url: string | null;
    } | null;
    store_roles: {
      name: string;
    } | null;
  } | null;
}

export function usePayroll(storeId: string | undefined, year: number, month: number) {
  const supabase = createClient();

  return useQuery({
    queryKey: ["payroll", storeId, year, month],
    queryFn: async () => {
      if (!storeId) throw new Error("Store ID is required");

      const { data, error } = await supabase
        .from("payroll_records")
        .select(`
          *,
          store_members:staff_id (
            id,
            user_id,
            role_id,
            wage_type,
            base_hourly_wage,
            base_daily_wage,
            base_monthly_wage,
            base_yearly_wage,
            profiles:user_id (
              full_name,
              avatar_url
            ),
            store_roles:role_id (
              name
            )
          )
        `)
        .eq("store_id", storeId)
        .eq("period_year", year)
        .eq("period_month", month)
        .order("id", { foreignTable: "store_members", ascending: true });

      if (error) throw error;

      return data as unknown as PayrollRecordWithStaff[];
    },
    enabled: !!storeId && !!year && !!month,
  });
}