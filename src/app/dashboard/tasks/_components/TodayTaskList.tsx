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
  // Group tasks by assignee
  const groupedTasks = useMemo(() => {
    const grouped = new Map<string, {
      staff: { id: string; name: string } | null;
      tasks: Task[];
    }>();

    tasks.forEach(task => {
      // 다중 담당자인 경우, 각각의 담당자에 대해 업무를 복제하여 그룹핑
      // 담당자가 없는 경우 'unassigned'로 처리
      const assignees = task.assignees && task.assignees.length > 0 
        ? task.assignees 
        : [{ id: 'unassigned', name: '미배정' }];

      assignees.forEach(assignee => {
        if (!grouped.has(assignee.id)) {
          grouped.set(assignee.id, {
            staff: assignee.id === 'unassigned' ? null : assignee,
            tasks: [],
          });
        }
        // 중복 추가 방지 (혹시 같은 담당자가 두 번 들어간 경우 대비)
        const staffGroup = grouped.get(assignee.id)!;
        if (!staffGroup.tasks.find(t => t.id === task.id)) {
          staffGroup.tasks.push(task);
        }
      });
    });

    return Array.from(grouped.values());
  }, [tasks]);

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
        <p>선택된 날짜의 할 일이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
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