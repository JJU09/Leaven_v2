import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PayrollDetailPageClient } from "./_components/PayrollDetailPageClient";

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
    .eq("id", id)
    .single();

  if (error || !record) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <p className="text-muted-foreground text-lg">급여 내역을 찾을 수 없습니다.</p>
      </div>
    );
  }

  return <PayrollDetailPageClient initialRecord={record as any} />;
}