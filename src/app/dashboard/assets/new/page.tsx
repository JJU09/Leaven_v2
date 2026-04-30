import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AssetForm } from '@/features/asset/components/asset-form';
import { getUniqueLocations } from '@/features/asset/actions';

export default async function NewAssetPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

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

  // 등록 페이지에 필요한 데이터 병렬 로드 (예: 설치 위치 목록)
  const [locations] = await Promise.all([
    getUniqueLocations(storeId)
  ]);

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">자산 등록</h2>
          <p className="text-muted-foreground mt-1">새로운 비품/자산 정보를 등록합니다.</p>
        </div>
      </div>
      <div className="mx-auto max-w-4xl pt-4">
        <AssetForm 
          storeId={storeId} 
          userId={user.id} 
          locations={locations} 
        />
      </div>
    </div>
  );
}