'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { TaskTabs } from './TaskTabs';
import { TaskAnnouncementBanner } from './TaskAnnouncementBanner';
import { useRouter } from 'next/navigation';
import { useTodayTasks } from '../_hooks/useTasks';
import { Task } from '../_types/task.types';

interface TasksPageClientProps {
  storeId: string;
  currentStaffId: string;
  canManageTasks: boolean;
}

export function TasksPageClient({ 
  storeId, 
  currentStaffId, 
  canManageTasks 
}: TasksPageClientProps) {
  const router = useRouter();

  // 업무 현황 조회를 위한 훅
  const { data: todayTasks = [] } = useTodayTasks(storeId);
  const incompleteCount = todayTasks.filter(t => !t.is_done).length;

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
          <Button onClick={() => router.push('/dashboard/tasks/new')}>
            <Plus className="mr-2 h-4 w-4" />
            업무 추가
          </Button>
        )}
      </div>

      <TaskAnnouncementBanner storeId={storeId} />

      <TaskTabs
        storeId={storeId}
        currentStaffId={currentStaffId}
        canManageTasks={canManageTasks}
        onTaskClick={handleTaskClick}
      />
    </div>
  );
}