import { Suspense } from 'react';
import { getAssetSummary, getUniqueLocations } from '@/features/asset/actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Box, Wrench, AlertTriangle, Trash2 } from 'lucide-react';
import { AssetList } from '@/features/asset/components/asset-list';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

export default async function AssetsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: members } = await supabase
    .from('store_members')
    .select('store_id, status')
    .eq('user_id', user.id);

  const cookieStore = await cookies();
  const selectedStoreId = cookieStore.get('leaven_current_store_id')?.value;

  let member = members?.find(m => m.store_id === selectedStoreId);

  if (!member) {
    member = members?.find(m => m.status === 'active') || members?.[0];
  }

  if (!member) redirect('/onboarding');

  const storeId = member.store_id;

  const [summary, locations] = await Promise.all([
    getAssetSummary(storeId),
    getUniqueLocations(storeId),
  ]);

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">비품/자산관리</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">전체 자산 수</CardTitle>
            <Box className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">정상 운용 수</CardTitle>
            <Box className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">점검·수리중 수</CardTitle>
            <Wrench className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.issue}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">폐기 예정 수</CardTitle>
            <Trash2 className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.disposed}</div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4">
        <AssetList storeId={storeId} userId={user.id} locations={locations} />
      </div>
    </div>
  );
}