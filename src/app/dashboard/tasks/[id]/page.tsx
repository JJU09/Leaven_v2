import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { TaskDetailPageClient } from './_components/TaskDetailPageClient';
import { hasPermission } from '@/features/auth/permissions';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const taskId = resolvedParams.id;
  
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // Fetch the task and associated member
  const { data: task, error } = await supabase
    .from('tasks')
    .select(`
      *,
      assignee:store_members!tasks_assignee_id_fkey(id, name, user_id, profiles(full_name)),
      assigner:store_members!tasks_assigner_id_fkey(id, name, profiles(full_name))
    `)
    .eq('id', taskId)
    .single();

  if (error || !task) {
    redirect('/dashboard/tasks');
  }

  // Get user's active store
  const { data: members } = await supabase
    .from('store_members')
    .select('id, store_id, status')
    .eq('user_id', user.id)
    .eq('store_id', task.store_id)
    .single();

  if (!members) {
    redirect('/dashboard/tasks');
  }

  const canViewTasks = await hasPermission(user.id, task.store_id, 'view_tasks');
  if (!canViewTasks) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-100 p-6 text-center">
        <h2 className="text-2xl font-bold mb-2">접근 권한이 없습니다</h2>
        <p className="text-muted-foreground">이 페이지를 볼 수 있는 권한이 없습니다.</p>
      </div>
    );
  }

  const canManageTasks = await hasPermission(user.id, task.store_id, 'manage_tasks');

  // Load staff list for edit form
  const { data: staffList } = await supabase
    .from('store_members')
    .select('id, name, profiles(full_name)')
    .eq('store_id', task.store_id)
    .neq('status', 'invited');

  return (
    <TaskDetailPageClient
      initialTask={task}
      storeId={task.store_id}
      currentStaffId={members.id}
      canManageTasks={canManageTasks}
      staffList={staffList || []}
    />
  );
}