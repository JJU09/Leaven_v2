import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getVendors, getVendorSummary } from '@/features/vendor/actions';
import { VendorsPageClient } from './_components/VendorsPageClient';

export default async function VendorsPage({
  searchParams,
}: {
  searchParams: { page?: string; search?: string; category?: string; type?: string }
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // 사용자의 첫 번째 매장 조회 (실제로는 context나 전역 상태에서 가져와야 함)
  // 임시로 user의 소속 매장 중 첫번째를 가져옵니다.
  const { data: storeMembers } = await supabase
    .from('store_members')
    .select('store_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .limit(1);

  const storeId = storeMembers?.[0]?.store_id;

  if (!storeId) {
    return <div className="p-8 text-center">소속된 매장이 없습니다.</div>;
  }

  const page = parseInt(searchParams.page || '1');
  const search = searchParams.search || '';
  const category = searchParams.category || 'all';
  const type = searchParams.type || 'all';

  // 1. 요약 데이터 조회
  const summary = await getVendorSummary(storeId);

  // 2. 거래처 목록 조회
  const { data: vendors, count } = await getVendors(storeId, page, 10, search, category, type);

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">거래처 관리</h2>
      </div>

      <VendorsPageClient 
        storeId={storeId}
        initialVendors={vendors || []} 
        totalCount={count || 0}
        summary={summary}
      />
    </div>
  );
}