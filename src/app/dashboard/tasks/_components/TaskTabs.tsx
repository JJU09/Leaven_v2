import { useState, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TodayTaskList } from './TodayTaskList';
import { OngoingTaskList } from './OngoingTaskList';
import { useTodayTasks, useOngoingTasks, useTasksByDate } from '../_hooks/useTasks';
import { Task } from '../_types/task.types';
import { TaskCalendarLayout } from './TaskCalendarLayout';
import { format, isSameDay } from 'date-fns';
import { ko } from 'date-fns/locale';

interface TaskTabsProps {
  storeId: string;
  currentStaffId: string;
  canManageTasks: boolean;
  onTaskClick: (task: Task) => void;
}

export function TaskTabs({ storeId, currentStaffId, canManageTasks, onTaskClick }: TaskTabsProps) {
  const [activeTab, setActiveTab] = useState('today');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  const isTodaySelected = isSameDay(selectedDate, new Date());
  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  
  const { data: todayTasks = [], isLoading: isLoadingToday } = useTodayTasks(storeId);
  const { data: ongoingTasks = [], isLoading: isLoadingOngoing } = useOngoingTasks(storeId);
  const { data: selectedDateTasks = [], isLoading: isLoadingSelectedDate } = useTasksByDate(storeId, selectedDateStr);

  const displayTasks = isTodaySelected ? todayTasks : selectedDateTasks;
  const isLoadingDisplay = isTodaySelected ? isLoadingToday : isLoadingSelectedDate;

  const completedCount = displayTasks.filter(t => t.is_done).length;
  const totalCount = displayTasks.length;
  const completionPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <TaskCalendarLayout 
      storeId={storeId} 
      selectedDate={selectedDate} 
      onDateSelect={setSelectedDate}
    >
      <div className="flex flex-col gap-4">
        {/* Date Header for List Panel */}
        <div className="hidden md:flex flex-col mb-2">
          <div className="flex items-end justify-between mb-2">
            <h2 className="text-xl font-bold flex items-center gap-2">
              {format(selectedDate, 'M월 d일', { locale: ko })}
              {isTodaySelected && <span className="text-sm font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">오늘</span>}
            </h2>
            <div className="text-sm font-medium text-muted-foreground">
              {completedCount} / {totalCount} 완료
            </div>
          </div>
          {totalCount > 0 && (
            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-500 ease-in-out" 
                style={{ width: `${completionPercent}%` }}
              />
            </div>
          )}
        </div>

        {isTodaySelected ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="today">오늘 할 일</TabsTrigger>
              <TabsTrigger value="ongoing">진행 중인 업무</TabsTrigger>
            </TabsList>
            
            <TabsContent value="today" className="mt-0 outline-none">
              {isLoadingDisplay ? (
                <div className="flex justify-center py-12">
                  <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-primary"></div>
                </div>
              ) : (
                <TodayTaskList
                  tasks={displayTasks}
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
        ) : (
          <div className="mt-4">
            {isLoadingDisplay ? (
              <div className="flex justify-center py-12">
                <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-primary"></div>
              </div>
            ) : (
              <TodayTaskList
                tasks={displayTasks}
                storeId={storeId}
                currentStaffId={currentStaffId}
                canManageTasks={canManageTasks}
                onTaskClick={onTaskClick}
              />
            )}
          </div>
        )}
      </div>
    </TaskCalendarLayout>
  );
}
