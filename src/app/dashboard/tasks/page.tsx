'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { TaskTabs } from './_components/TaskTabs';
import { TaskFormDialog } from './_components/TaskFormDialog';
import { TaskAnnouncementBanner } from './_components/TaskAnnouncementBanner';
import { useRouter } from 'next/navigation';
import { useDashboard } from '../_hooks/useDashboard';
import { useTodayTasks } from './_hooks/useTasks';
import { Task } from './_types/task.types';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getMemberDisplayName } from '@/lib/utils';

export default function TasksPage() {
  const router = useRouter();
  const [storeId, setStoreId] = useState<string | null>(null);
  const [currentMember, setCurrentMember] = useState<any>(null);
  const [storeMembers, setStoreMembers] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function loadUserContext() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: members } = await supabase
        .from('store_members')
        .select(`
          store_id,
          id,
          role_id,
          role:store_roles(name, hierarchy_level, permissions),
          profiles(full_name)
        `)
        .eq('user_id', user.id);

      if (members && members.length > 0) {
        // Find the active store. Without a cookie reader here, we just use the first.
        // A robust app would have a dedicated context. We'll approximate.
        const activeMember = members[0];
        setStoreId(activeMember.store_id);
        
        const roleInfo = Array.isArray(activeMember.role) ? activeMember.role[0] : activeMember.role;
        setCurrentMember({
          id: activeMember.id,
          role: roleInfo,
        });
        
        // Load permissions from the database.
        const rolePerms = Array.isArray(roleInfo?.permissions) ? roleInfo.permissions : [];
        setPermissions({
          view_tasks: rolePerms.includes('view_tasks'),
          manage_tasks: rolePerms.includes('manage_tasks')
        });

        // Load all store members
        const { data: allMembers } = await supabase
          .from('store_members')
          .select(`
            id,
            name,
            profiles(full_name)
          `)
          .eq('store_id', activeMember.store_id)
          .neq('status', 'invited');
        
        if (allMembers) {
          setStoreMembers(allMembers);
        }
      }
    }
    loadUserContext();
  }, []);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);

  // Use a query hook here just to get the incomplete tasks count, or re-use useTodayTasks
  const { data: todayTasks = [] } = useTodayTasks(storeId || '');
  const incompleteCount = todayTasks.filter(t => !t.is_done).length;

  const canViewTasks = permissions?.view_tasks !== false; // Default true while loading to prevent flash
  const canManageTasks = !!permissions?.manage_tasks;

  if (!storeId || !currentMember) return null;

  if (Object.keys(permissions).length > 0 && !permissions.view_tasks) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-100 p-6 text-center">
        <h2 className="text-2xl font-bold mb-2">접근 권한이 없습니다</h2>
        <p className="text-muted-foreground">이 페이지를 볼 수 있는 권한이 없습니다.</p>
      </div>
    );
  }

  const staffList = storeMembers.map((m: any) => ({
    id: m.id,
    name: getMemberDisplayName(m),
  }));

  const handleTaskClick = (task: Task) => {
    router.push(`/dashboard/tasks/${task.id}`);
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">업무 관리</h1>
            <p className="text-muted-foreground text-sm mt-1">매장의 업무와 일정을 관리합니다.</p>
          </div>
          <Badge variant="secondary" className="mt-1 self-start">
            오늘 미완료 {incompleteCount}건
          </Badge>
        </div>
        
        {canManageTasks && (
          <Button onClick={() => {
            setTaskToEdit(null);
            setIsFormOpen(true);
          }}>
            <Plus className="mr-2 h-4 w-4" />
            업무 추가
          </Button>
        )}
      </div>

      <TaskAnnouncementBanner storeId={storeId} />

      <TaskTabs
        storeId={storeId}
        currentStaffId={currentMember.id}
        canManageTasks={canManageTasks}
        onTaskClick={handleTaskClick}
      />

      {isFormOpen && (
        <TaskFormDialog
          open={isFormOpen}
          onOpenChange={(open) => {
            setIsFormOpen(open);
            if (!open) setTaskToEdit(null);
          }}
          storeId={storeId}
          assignerId={currentMember.id}
          staffList={staffList}
          taskToEdit={taskToEdit}
        />
      )}

    </div>
  );
}
