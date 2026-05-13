import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { PayrollRecord, DeductionOverride } from "@/features/payroll/types";
import { calculateDeductions } from "../_utils/deductionCalculator";
import { startOfMonth, endOfMonth, setDate, subMonths, format } from "date-fns";

// 급여 데이터 동기화 Mutation (usePayroll 훅에서 분리된 로직)
export function useSyncPayrollDrafts() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async ({ storeId, year, month }: { storeId: string; year: number; month: number }) => {
      if (!storeId) throw new Error("Store ID is required");

      // 1. 매장의 정산 기간 설정 조회
      const { data: storeInfo, error: storeError } = await supabase
        .from("stores")
        .select("wage_start_day, wage_end_day")
        .eq("id", storeId)
        .single();

      if (storeError) throw storeError;

      const wageStartDay = storeInfo?.wage_start_day || 1;
      const wageEndDay = storeInfo?.wage_end_day || 0;

      const currentMonthDate = new Date(year, month - 1);
      let startDate: Date;
      let endDate: Date;

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

      // 2. 해당 기간 스케줄 조회
      const { data: allSchedules, error: allSchedulesError } = await supabase
        .from("schedules")
        .select("member_id, plan_date, start_time, end_time, break_minutes")
        .eq("store_id", storeId)
        .gte("plan_date", startDateStr)
        .lte("plan_date", endDateStr);

      if (allSchedulesError) throw allSchedulesError;

      // 스케줄 통계 헬퍼
      const calculateStats = (memberIds: string[]) => {
        const stats = memberIds.reduce((acc, memberId) => {
          acc[memberId] = { workDays: 0, workHours: 0 };
          return acc;
        }, {} as Record<string, { workDays: number, workHours: number }>);

        allSchedules?.forEach(sched => {
          if (!memberIds.includes(sched.member_id)) return;
          if (!sched.start_time || !sched.end_time) return;
          
          const [startH, startM] = sched.start_time.split(':').map(Number);
          const [endH, endM] = sched.end_time.split(':').map(Number);
          
          const startMinutes = startH * 60 + startM;
          let endMinutes = endH * 60 + endM;
          if (endMinutes < startMinutes) endMinutes += 24 * 60;
          
          const workMinutes = endMinutes - startMinutes - (sched.break_minutes || 0);
          if (workMinutes > 0) {
            stats[sched.member_id].workDays += 1;
            stats[sched.member_id].workHours += workMinutes / 60;
          }
        });
        return stats;
      };

      // 3. 기존 레코드 조회
      const { data: existingRecords, error: fetchRecordsError } = await supabase
        .from("payroll_records")
        .select("*, store_members(*)")
        .eq("store_id", storeId)
        .eq("period_year", year)
        .eq("period_month", month);

      if (fetchRecordsError) throw fetchRecordsError;

      const drafts = existingRecords?.filter(r => r.status === 'draft') || [];
      const draftStaffIds = drafts.map(r => r.staff_id);
      
      // 4. 기존 Draft 레코드 업데이트
      if (draftStaffIds.length > 0) {
        const draftStats = calculateStats(draftStaffIds);

        for (const record of drafts) {
          const stats = draftStats[record.staff_id];
          if (!stats) continue;

          const totalHours = Math.round(stats.workHours * 10) / 10;
          const m = record.store_members;
          
          let basePay = 0;
          if (m.wage_type === "hourly") basePay = Math.floor(totalHours * (m.base_hourly_wage || 0));
          else if (m.wage_type === "daily") basePay = Math.floor(stats.workDays * (m.base_daily_wage || 0));
          else if (m.wage_type === "monthly") basePay = m.base_monthly_wage || 0;
          else if (m.wage_type === "yearly") basePay = Math.floor((m.base_yearly_wage || 0) / 12);

          const grossPay = basePay; // 임시: 추가수당 등 제외 (MVP)

          const deductions = calculateDeductions({
            wageType: m.wage_type || 'hourly',
            grossPay: grossPay,
            monthlyHours: totalHours,
          });

          if (
            record.work_days !== stats.workDays ||
            record.work_hours !== totalHours ||
            record.base_pay !== basePay ||
            record.gross_pay !== grossPay ||
            record.wage_type !== m.wage_type ||
            record.total_deduction !== deductions.totalDeduction
          ) {
            await supabase
              .from("payroll_records")
              .update({
                work_days: stats.workDays,
                work_hours: totalHours,
                base_pay: basePay,
                gross_pay: grossPay,
                national_pension: deductions.nationalPension,
                health_insurance: deductions.healthInsurance,
                long_term_care: deductions.longTermCare,
                employment_insurance: deductions.employmentInsurance,
                income_tax: deductions.incomeTax,
                local_income_tax: deductions.localIncomeTax,
                total_deduction: deductions.totalDeduction,
                net_pay: deductions.netPay,
                wage_type: m.wage_type,
              })
              .eq("id", record.id);
          }
        }
      }

      // 5. 누락된 활성 직원 데이터 Insert 로직
      const { data: activeMembers, error: membersError } = await supabase
        .from("store_members")
        .select("id, wage_type, base_hourly_wage, base_daily_wage, base_monthly_wage, base_yearly_wage, store_roles!inner(hierarchy_level)")
        .eq("store_id", storeId)
        .eq("status", "active")
        .lt("store_roles.hierarchy_level", 100);

      if (membersError) throw membersError;

      const existingStaffIds = new Set(existingRecords?.map(r => r.staff_id) || []);
      const missingMembers = activeMembers?.filter(m => !existingStaffIds.has(m.id)) || [];

      if (missingMembers.length > 0) {
        const missingMemberIds = missingMembers.map(m => m.id);
        const scheduleStats = calculateStats(missingMemberIds);

        const recordsToInsert = missingMembers.map((m) => {
          const stats = scheduleStats[m.id];
          const totalHours = Math.round(stats.workHours * 10) / 10;
          
          let basePay = 0;
          if (m.wage_type === "hourly") basePay = Math.floor(totalHours * (m.base_hourly_wage || 0));
          else if (m.wage_type === "daily") basePay = Math.floor(stats.workDays * (m.base_daily_wage || 0));
          else if (m.wage_type === "monthly") basePay = m.base_monthly_wage || 0;
          else if (m.wage_type === "yearly") basePay = Math.floor((m.base_yearly_wage || 0) / 12);

          const grossPay = basePay;

          const deductions = calculateDeductions({
            wageType: m.wage_type || 'hourly',
            grossPay: grossPay,
            monthlyHours: totalHours,
          });

          return {
            store_id: storeId,
            staff_id: m.id,
            period_year: year,
            period_month: month,
            wage_type: m.wage_type || 'hourly',
            work_days: stats.workDays,
            work_hours: totalHours,
            base_pay: basePay,
            gross_pay: grossPay,
            national_pension: deductions.nationalPension,
            health_insurance: deductions.healthInsurance,
            long_term_care: deductions.longTermCare,
            employment_insurance: deductions.employmentInsurance,
            income_tax: deductions.incomeTax,
            local_income_tax: deductions.localIncomeTax,
            total_deduction: deductions.totalDeduction,
            net_pay: deductions.netPay,
            status: 'draft',
          };
        });

        const { error: insertError } = await supabase
          .from("payroll_records")
          .insert(recordsToInsert);

        if (insertError) throw insertError;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["payroll", variables.storeId, variables.year, variables.month]
      });
    }
  });
}

export interface UpdatePayrollRecordPayload {
  id: string; // payroll_record.id
  override: Omit<DeductionOverride, 'overriddenBy' | 'overriddenAt'>;
  updatedFields: Partial<PayrollRecord>;
}

export function useUpdatePayrollRecord(storeId: string, year: number, month: number) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const queryKey = ["payroll", storeId, year, month];

  return useMutation({
    mutationFn: async ({ id, override, updatedFields }: UpdatePayrollRecordPayload) => {
      // 1. 현재 사용자 정보 조회
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // 2. profiles에서 id 조회 (혹은 user.id 자체를 overridden_by로 사용, 스키마에 따라 다름)
      // 프로필 테이블을 참조한다고 가정하고 user.id를 넘깁니다. (Supabase 기본 세팅상 profiles.id = auth.users.id)

      // 3. payroll_records 업데이트
      const { error: updateError } = await supabase
        .from("payroll_records")
        .update({
          ...updatedFields,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (updateError) throw updateError;

      // 4. deduction_overrides 추가 (수당 변경도 이 테이블을 함께 사용)
      const { error: overrideError } = await supabase
        .from("deduction_overrides")
        .insert({
          payroll_entry_id: id,
          field: override.field,
          original_value: override.originalValue,
          overridden_value: override.overriddenValue,
          reason: override.reason,
          overridden_by: user.id,
        });

      if (overrideError) throw overrideError;

      return { id };
    },
    onMutate: async ({ id, updatedFields }) => {
      await queryClient.cancelQueries({ queryKey });
      const previousData = queryClient.getQueryData<{ records: any[] }>(queryKey);

      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old || !old.records) return old;
        return {
          ...old,
          records: old.records.map((record: any) =>
            record.id === id
              ? {
                  ...record,
                  ...updatedFields,
                  // 여기서 overrides 배열에도 임시로 추가해주는 것이 이상적이나,
                  // 서버에서 다시 fetch해오므로 여기선 기본 항목들만 우선 반영
                }
              : record
          ),
        };
      });

      return { previousData };
    },
    onError: (err, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
}

export function useConfirmPayroll(storeId: string, year: number, month: number) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const queryKey = ["payroll", storeId, year, month];

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // 1. 상태 업데이트
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

      // 2. 확정 시 스냅샷 저장
      if (data && data.length > 0) {
        const snapshots = data.map((record) => ({
          payroll_entry_id: record.id,
          snapshot_data: record, // 현재 record 상태 전체를 jsonb로 저장
          created_by: user.id,
        }));

        const { error: snapshotError } = await supabase
          .from("payroll_snapshots")
          .insert(snapshots);

        if (snapshotError) throw snapshotError;
      }

      return data;
    },
    onMutate: async (ids) => {
      await queryClient.cancelQueries({ queryKey });
      const previousData = queryClient.getQueryData(queryKey);

      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old || !old.records) return old;
        return {
          ...old,
          records: old.records.map((record: any) =>
            ids.includes(record.id)
              ? { ...record, status: "confirmed", confirmed_at: new Date().toISOString() }
              : record
          ),
        };
      });

      return { previousData };
    },
    onError: (err, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
}

export function useMarkPayrollPaid(storeId: string, year: number, month: number) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const queryKey = ["payroll", storeId, year, month];

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
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey });
      const previousData = queryClient.getQueryData(queryKey);

      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old || !old.records) return old;
        return {
          ...old,
          records: old.records.map((record: any) =>
            record.id === id
              ? { ...record, status: "paid", paid_at: new Date().toISOString() }
              : record
          ),
        };
      });

      return { previousData };
    },
    onError: (err, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
}