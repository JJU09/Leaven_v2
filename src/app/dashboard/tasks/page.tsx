import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { hasPermission } from '@/features/auth/permissions';
import { redirect } from 'next/navigation';
import { TasksPageClient } from './_components/TasksPageClient';

export default async function TasksPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const cookieStore = await cookies();
  const storeId = cookieStore.get('leaven_current_store_id')?.value;

  if (!storeId) {
    redirect('/home');
  }

  // 권한 검사
  const [canViewTasks, canManageTasks] = await Promise.all([
    hasPermission(user.id, storeId, 'view_tasks'),
    hasPermission(user.id, storeId, 'manage_tasks'),
  ]);

  if (!canViewTasks) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-100 p-6 text-center">
        <h2 className="text-2xl font-bold mb-2">접근 권한이 없습니다</h2>
        <p className="text-muted-foreground">이 페이지를 볼 수 있는 권한이 없습니다.</p>
      </div>
    );
  }

  // 현재 사용자의 매장 내 멤버 ID 가져오기
  const { data: member } = await supabase
    .from('store_members')
    .select('id')
    .eq('store_id', storeId)
    .eq('user_id', user.id)
    .single();

  if (!member) {
    redirect('/home');
  }

  return (
    <TasksPageClient 
      storeId={storeId} 
      currentStaffId={member.id} 
      canManageTasks={canManageTasks} 
    />
  );
}