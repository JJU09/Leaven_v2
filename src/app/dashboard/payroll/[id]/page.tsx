import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PayrollDetailPageClient } from "./_components/PayrollDetailPageClient";
import { hasPermission } from "@/features/auth/permissions";

export default async function PayrollDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 급여 명세 상세 정보 조회
  const { data: record, error } = await supabase
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
    .eq("id", id)
    .single();

  if (error) {
    console.error("Failed to fetch payroll record:", error);
  }

  // deduction_overrides는 관계 매핑 이름 이슈 방지를 위해 안전하게 별도로 조회 후 병합
  if (record) {
    const { data: overrides, error: overridesError } = await supabase
      .from("deduction_overrides")
      .select("*")
      .eq("payroll_entry_id", id);
      
    if (overridesError) {
      console.error("Failed to fetch overrides:", overridesError);
    }

    record.overrides = (overrides || []).map((o: any) => ({
      field: o.field,
      originalValue: o.original_value,
      overriddenValue: o.overridden_value,
      reason: o.reason,
      overriddenBy: o.overridden_by,
      overriddenAt: o.created_at,
    }));
  }

  if (error || !record) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <p className="text-muted-foreground text-lg">급여 내역을 찾을 수 없습니다.</p>
      </div>
    );
  }

  // 관리 권한이 있는지 체크 (자신의 급여라도 상세 페이지가 아닌 기본 목록에서만 볼 수 있도록 함)
  // (만약 본인 급여는 상세 조회를 허용하려면 record.store_members.user_id === user.id 체크 추가)
  const canManageSalary = await hasPermission(user.id, record.store_id, 'manage_salary');
  
  if (!canManageSalary) {
    redirect("/dashboard/payroll");
  }

  return <PayrollDetailPageClient initialRecord={record as any} />;
}
