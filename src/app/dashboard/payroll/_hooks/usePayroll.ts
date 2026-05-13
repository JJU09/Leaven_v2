import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { PayrollRecord, PayrollSummary, WageType, PayrollStatus } from "@/features/payroll/types";
import { addMonths, endOfMonth, startOfMonth, format, setDate, subMonths } from "date-fns";
import { calculateDeductions } from "../_utils/deductionCalculator";

export interface PayrollRecordWithStaff extends PayrollRecord {
  store_members: {
    id: string;
    user_id: string;
    role_id: string;
    name: string | null;
    phone: string | null;
    wage_type: WageType;
    base_hourly_wage: number;
    base_daily_wage: number;
    base_monthly_wage: number;
    base_yearly_wage: number;
    joined_at: string;
    profiles: {
      full_name: string;
      avatar_url: string | null;
      phone: string | null;
    } | null;
    store_roles: {
      name: string;
      hierarchy_level: number;
    } | null;
  } | null;
}

export function usePayroll(storeId: string | undefined, year: number, month: number) {
  const supabase = createClient();

  return useQuery({
    queryKey: ["payroll", storeId, year, month],
    queryFn: async () => {
      if (!storeId) throw new Error("Store ID is required");

      // 1. 매장의 정산 기간 설정 항상 조회
      const { data: storeInfo, error: storeError } = await supabase
        .from("stores")
        .select("wage_start_day, wage_end_day")
        .eq("id", storeId)
        .single();

      if (storeError) throw storeError;

      const wageStartDay = storeInfo?.wage_start_day || 1;
      const wageEndDay = storeInfo?.wage_end_day || 0;

      // 2. 실제 정산 기간 날짜 계산
      let startDate: Date;
      let endDate: Date;

      const currentMonthDate = new Date(year, month - 1);

      if (wageStartDay === 1 && wageEndDay === 0) {
        startDate = startOfMonth(currentMonthDate);
        endDate = endOfMonth(currentMonthDate);
      } else {
        const prevMonthDate = subMonths(currentMonthDate, 1);
        startDate = setDate(prevMonthDate, wageStartDay);
        
        if (wageEndDay === 0) {
           endDate = setDate(currentMonthDate, wageStartDay - 1);
        } else {
           endDate = setDate(currentMonthDate, wageEndDay);
        }
      }

      const startDateStr = format(startDate, 'yyyy-MM-dd');
      const endDateStr = format(endDate, 'yyyy-MM-dd');

      const fetchRecords = async () => {
        return await supabase
          .from("payroll_records")
          .select(`
            *,
            store_members:staff_id (
              id,
              user_id,
              role_id,
              name,
              phone,
              wage_type,
              base_hourly_wage,
              base_daily_wage,
              base_monthly_wage,
              base_yearly_wage,
              joined_at,
              profiles:user_id (
                full_name,
                avatar_url,
                phone
              ),
              store_roles:role_id (
                name,
                hierarchy_level
              )
            )
          `)
          .eq("store_id", storeId)
          .eq("period_year", year)
          .eq("period_month", month)
          .order("id", { foreignTable: "store_members", ascending: true });
      };

      // 관리자 권한 확인
      const { data: hasManageSalaryPerm } = await supabase.rpc('has_store_permission', {
        store_id_param: storeId,
        permission_param: 'manage_salary'
      });

      let { data, error } = await fetchRecords();

      if (error) throw error;

      if (data) {
        data = data.filter((record: any) => record.store_members?.store_roles?.hierarchy_level !== 100);
        
        // overrides 별도 조회 (안전한 관계 매핑)
        const recordIds = data.map((r: any) => r.id);
        if (recordIds.length > 0) {
          const { data: overrides } = await supabase
            .from("deduction_overrides")
            .select("*")
            .in("payroll_entry_id", recordIds);

          // 가져온 overrides를 각 레코드에 매핑
          data.forEach((record: any) => {
            const recordOverrides = overrides?.filter(o => o.payroll_entry_id === record.id) || [];
            record.overrides = recordOverrides.map((o: any) => ({
              field: o.field,
              originalValue: o.original_value,
              overriddenValue: o.overridden_value,
              reason: o.reason,
              overriddenBy: o.overridden_by,
              overriddenAt: o.created_at,
            }));
          });
        }
      }

      // 삭제됨: useQuery 내부에서의 DB 수정(Insert/Update) 동기화 로직은 안티패턴이므로 별도 Mutation 훅으로 분리 예정.
      // 여기서는 순수 조회(Read)만 수행합니다.

      return {
        records: data as unknown as PayrollRecordWithStaff[],
        period: {
          start: startDateStr,
          end: endDateStr
        },
        hasManageSalaryPerm
      };
    },
    enabled: !!storeId && !!year && !!month,
  });
}
