import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { PayrollRecord, PayrollSummary, WageType, PayrollStatus } from "@/features/payroll/types";
import { addMonths, endOfMonth, startOfMonth, format, setDate, subMonths } from "date-fns";

export interface PayrollRecordWithStaff extends PayrollRecord {
  store_members: {
    id: string;
    user_id: string;
    role_id: string;
    name: string | null;
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

      let { data, error } = await fetchRecords();

      if (error) throw error;

      if (data) {
        data = data.filter((record: any) => record.store_members?.store_roles?.hierarchy_level !== 100);
      }

      // 3. 해당 기간의 모든 직원 스케줄 데이터 조회 (기존 데이터 업데이트 + 신규 데이터 생성용)
      const { data: allSchedules, error: allSchedulesError } = await supabase
        .from("schedules")
        .select("member_id, plan_date, start_time, end_time, break_minutes")
        .eq("store_id", storeId)
        .gte("plan_date", startDateStr)
        .lte("plan_date", endDateStr);

      if (allSchedulesError) throw allSchedulesError;

      // 스케줄 기반 근무시간 및 일수 계산 헬퍼
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
          
          let startMinutes = startH * 60 + startM;
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

      // 4. 기존 미확정(draft) 상태인 급여 레코드들의 근무시간 재계산 및 DB 업데이트
      if (data) {
        const drafts = data.filter((r: any) => r.status === 'draft');
        const draftStaffIds = drafts.map((r: any) => r.staff_id);
        
        if (draftStaffIds.length > 0) {
          const draftStats = calculateStats(draftStaffIds);
          let needsRefetch = false;

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

            // 기존 DB 값과 다르면 업데이트
            if (
              record.work_days !== stats.workDays ||
              record.work_hours !== totalHours ||
              record.base_pay !== basePay
            ) {
              await supabase
                .from("payroll_records")
                .update({
                  work_days: stats.workDays,
                  work_hours: totalHours,
                  base_pay: basePay,
                  gross_pay: basePay, // 추가 수당 고려 필요시 보완
                  net_pay: basePay - (record.total_deduction || 0),
                })
                .eq("id", record.id);
              
              needsRefetch = true;
            }
          }

          if (needsRefetch) {
            const refetched = await fetchRecords();
            if (!refetched.error && refetched.data) {
              data = refetched.data.filter((record: any) => record.store_members?.store_roles?.hierarchy_level !== 100);
            }
          }
        }
      }

      // 현재 활성 직원 목록 조회
      const { data: activeMembers, error: membersError } = await supabase
        .from("store_members")
        .select("id, wage_type, base_hourly_wage, base_daily_wage, base_monthly_wage, base_yearly_wage, store_roles!inner(hierarchy_level)")
        .eq("store_id", storeId)
        .eq("status", "active")
        .lt("store_roles.hierarchy_level", 100);

      if (membersError) throw membersError;

      // 이미 생성된 급여 데이터가 있는 직원의 ID 목록
      const existingStaffIds = new Set(data?.map((record: any) => record.staff_id) || []);

      // 급여 데이터가 없는 활성 직원 필터링
      const missingMembers = activeMembers?.filter(m => !existingStaffIds.has(m.id)) || [];

      // 누락된 직원이 있다면 추가로 급여 데이터 생성
      if (missingMembers.length > 0) {
        const missingMemberIds = missingMembers.map(m => m.id);
        const scheduleStats = calculateStats(missingMemberIds);

        // 5. 급여 데이터 초안 생성
        const recordsToInsert = missingMembers.map((m) => {
          const stats = scheduleStats[m.id];
          const totalHours = Math.round(stats.workHours * 10) / 10;
          
          let basePay = 0;
          if (m.wage_type === "hourly") {
             basePay = Math.floor(totalHours * (m.base_hourly_wage || 0));
          } else if (m.wage_type === "daily") {
             basePay = Math.floor(stats.workDays * (m.base_daily_wage || 0));
          } else if (m.wage_type === "monthly") {
             basePay = m.base_monthly_wage || 0;
          } else if (m.wage_type === "yearly") {
             basePay = Math.floor((m.base_yearly_wage || 0) / 12);
          }

          return {
            store_id: storeId,
            staff_id: m.id,
            period_year: year,
            period_month: month,
            wage_type: m.wage_type || 'hourly',
            work_days: stats.workDays,
            work_hours: totalHours,
            base_pay: basePay,
            gross_pay: basePay, // 추가수당 등은 별도 로직 필요
            net_pay: basePay,
            status: 'draft',
          };
        });

        const { error: insertError } = await supabase
          .from("payroll_records")
          .insert(recordsToInsert);

        if (insertError) throw insertError;

        // 생성 후 다시 조회 및 점주 필터링 다시 적용
        const refetched = await fetchRecords();
        if (refetched.error) throw refetched.error;
        data = refetched.data;
        if (data) {
          data = data.filter((record: any) => record.store_members?.store_roles?.hierarchy_level !== 100);
        }
      }

      return {
        records: data as unknown as PayrollRecordWithStaff[],
        period: {
          start: startDateStr,
          end: endDateStr
        }
      };
    },
    enabled: !!storeId && !!year && !!month,
  });
}
