import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { BillingClient } from './BillingClient';
import { hasPermission } from '@/features/auth/permissions';

export const dynamic = 'force-dynamic';

export default async function BillingPage() {
  const cookieStore = await cookies();
  const storeId = cookieStore.get('leaven_current_store_id')?.value;

  if (!storeId) {
    redirect('/dashboard');
  }

  const supabase = await createClient();

  // 사용자 로그인 상태 확인
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // 사용자 권한 확인 (manage_store 권한이 있어야 접근 가능)
  const canManageStore = await hasPermission(user.id, storeId, 'manage_store');
  
  if (!canManageStore) {
    redirect('/dashboard/settings');
  }

  // 구독 정보 서버 사이드 패칭
  const { data: subscription } = await supabase
    .from('store_subscriptions')
    .select('*')
    .eq('store_id', storeId)
    .single();

  return <BillingClient storeId={storeId} initialSubscription={subscription} />;
}
