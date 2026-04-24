import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PayrollPageClient } from "./_components/PayrollPageClient";
import { cookies } from "next/headers";

export default async function PayrollPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const cookieStore = await cookies();
  let storeId = cookieStore.get("leaven_current_store_id")?.value;
  let storeName = "매장";

  if (storeId) {
    // 쿠키에 있는 매장 정보 확인
    const { data: storeDetails } = await supabase
      .from("stores")
      .select("name")
      .eq("id", storeId)
      .single();
    
    if (storeDetails) {
      storeName = storeDetails.name;
    } else {
      // 매장을 찾을 수 없으면 storeId 초기화
      storeId = undefined;
    }
  }

  // 쿠키에 매장이 없거나 유효하지 않은 경우 첫 번째 소속 매장 조회 (Fallback)
  if (!storeId) {
    const { data: storeMembers } = await supabase
      .from("store_members")
      .select("store_id, store_details:store_id(name)")
      .eq("user_id", user.id)
      .eq("status", "active")
      .limit(1);

    storeId = storeMembers?.[0]?.store_id;
    const details = storeMembers?.[0]?.store_details as any;
    storeName = (Array.isArray(details) ? details[0]?.name : details?.name) || "매장";
  }

  if (!storeId) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <p className="text-muted-foreground text-lg">소속된 매장이 없습니다.</p>
      </div>
    );
  }

  return (
    <PayrollPageClient 
      storeId={storeId} 
      storeName={storeName} 
    />
  );
}