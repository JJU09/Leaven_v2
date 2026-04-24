import { useMemo } from 'react';
import { Task } from '../_types/task.types';
import { TaskCard } from './TaskCard';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { isBefore, startOfDay } from 'date-fns';

interface TodayTaskListProps {
  tasks: Task[];
  storeId: string;
  currentStaffId: string;
  canManageTasks: boolean;
  onTaskClick: (task: Task) => void;
}

export function TodayTaskList({ tasks, storeId, currentStaffId, canManageTasks, onTaskClick }: TodayTaskListProps) {
  // Group tasks by assignee and separate overdue tasks
  const { overdueTasks, groupedTasks } = useMemo(() => {
    const today = startOfDay(new Date());
    const overdue: Task[] = [];
    const grouped = new Map<string, {
      staff: { id: string; name: string } | null;
      tasks: Task[];
    }>();

    tasks.forEach(task => {
      // Overdue logic: not done, and due_date < today
      if (!task.is_done && task.due_date && isBefore(new Date(task.due_date), today)) {
        overdue.push(task);
        return; // Alternatively, we can show overdue tasks BOTH in overdue section AND staff section. We'll separate them here as requested.
      }

      const assigneeId = task.assignee_id || 'unassigned';
      if (!grouped.has(assigneeId)) {
        grouped.set(assigneeId, {
          staff: task.assignee || null,
          tasks: [],
        });
      }
      grouped.get(assigneeId)!.tasks.push(task);
    });

    return { overdueTasks: overdue, groupedTasks: Array.from(grouped.values()) };
  }, [tasks]);

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
        <p>오늘 할 일이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {overdueTasks.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-sm font-bold text-red-500">기한 초과</h3>
            <span className="text-xs font-medium bg-red-100 text-red-600 px-2 py-0.5 rounded-full dark:bg-red-900/30">
              {overdueTasks.length}건
            </span>
          </div>
          <div className="grid gap-3">
            {overdueTasks.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                storeId={storeId}
                currentStaffId={currentStaffId}
                canManageTasks={canManageTasks}
                onClick={() => onTaskClick(task)}
              />
            ))}
          </div>
        </section>
      )}

      {groupedTasks.map(({ staff, tasks: staffTasks }) => {
        const completedCount = staffTasks.filter(t => t.is_done).length;
        
        return (
          <section key={staff?.id || 'unassigned'} className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  {staff ? (
                    <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                      {(staff.name || '알수').substring(0, 2)}
                    </AvatarFallback>
                  ) : (
                    <AvatarFallback className="text-[10px] bg-muted text-muted-foreground">?</AvatarFallback>
                  )}
                </Avatar>
                <h3 className="font-medium text-sm">
                  {staff ? staff.name : '미배정'}
                </h3>
              </div>
              <span className="text-xs font-medium text-muted-foreground">
                {completedCount} / {staffTasks.length} 완료
              </span>
            </div>
            
            <div className="grid gap-3">
              {staffTasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  storeId={storeId}
                  currentStaffId={currentStaffId}
                  canManageTasks={canManageTasks}
                  onClick={() => onTaskClick(task)}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}