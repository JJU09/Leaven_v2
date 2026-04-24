import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TodayTaskList } from './TodayTaskList';
import { OngoingTaskList } from './OngoingTaskList';
import { useTodayTasks, useOngoingTasks } from '../_hooks/useTasks';
import { Task } from '../_types/task.types';

interface TaskTabsProps {
  storeId: string;
  currentStaffId: string;
  canManageTasks: boolean;
  onTaskClick: (task: Task) => void;
}

export function TaskTabs({ storeId, currentStaffId, canManageTasks, onTaskClick }: TaskTabsProps) {
  const [activeTab, setActiveTab] = useState('today');
  
  const { data: todayTasks = [], isLoading: isLoadingToday } = useTodayTasks(storeId);
  const { data: ongoingTasks = [], isLoading: isLoadingOngoing } = useOngoingTasks(storeId);

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-2 mb-6">
        <TabsTrigger value="today">오늘 할 일</TabsTrigger>
        <TabsTrigger value="ongoing">진행 중인 업무</TabsTrigger>
      </TabsList>
      
      <TabsContent value="today" className="mt-0 outline-none">
        {isLoadingToday ? (
          <div className="flex justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-primary"></div>
          </div>
        ) : (
          <TodayTaskList
            tasks={todayTasks}
            storeId={storeId}
            currentStaffId={currentStaffId}
            canManageTasks={canManageTasks}
            onTaskClick={onTaskClick}
          />
        )}
      </TabsContent>
      
      <TabsContent value="ongoing" className="mt-0 outline-none">
        {isLoadingOngoing ? (
          <div className="flex justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-primary"></div>
          </div>
        ) : (
          <OngoingTaskList
            tasks={ongoingTasks}
            storeId={storeId}
            currentStaffId={currentStaffId}
            canManageTasks={canManageTasks}
            onTaskClick={onTaskClick}
          />
        )}
      </TabsContent>
    </Tabs>
  );
}