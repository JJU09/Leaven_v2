import { useMemo } from 'react';
import { Task } from '../_types/task.types';
import { TaskCard } from './TaskCard';
import { isBefore, endOfWeek, startOfWeek, addWeeks, startOfDay } from 'date-fns';

interface OngoingTaskListProps {
  tasks: Task[];
  storeId: string;
  currentStaffId: string;
  canManageTasks: boolean;
  onTaskClick: (task: Task) => void;
}

export function OngoingTaskList({ tasks, storeId, currentStaffId, canManageTasks, onTaskClick }: OngoingTaskListProps) {
  const sections = useMemo(() => {
    const today = startOfDay(new Date());
    const currentWeekEnd = endOfWeek(today, { weekStartsOn: 1 }); // Monday as start of week, Sunday as end
    const nextWeekEnd = endOfWeek(addWeeks(today, 1), { weekStartsOn: 1 });

    const thisWeek: Task[] = [];
    const nextWeek: Task[] = [];
    const later: Task[] = [];

    tasks.forEach(task => {
      if (!task.due_date) {
        later.push(task);
        return;
      }
      const dueDate = startOfDay(new Date(task.due_date));
      if (isBefore(dueDate, currentWeekEnd) || dueDate.getTime() === currentWeekEnd.getTime()) {
        thisWeek.push(task);
      } else if (isBefore(dueDate, nextWeekEnd) || dueDate.getTime() === nextWeekEnd.getTime()) {
        nextWeek.push(task);
      } else {
        later.push(task);
      }
    });

    return [
      { id: 'thisWeek', label: '이번 주', tasks: thisWeek },
      { id: 'nextWeek', label: '다음 주', tasks: nextWeek },
      { id: 'later', label: '이후', tasks: later },
    ];
  }, [tasks]);

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
        <p>진행 중인 업무가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {sections.map(section => {
        if (section.tasks.length === 0) return null;
        
        return (
          <section key={section.id} className="space-y-4">
            <div className="flex items-center gap-2 border-b pb-2">
              <h3 className="font-medium text-sm">{section.label}</h3>
              <span className="text-xs text-muted-foreground">{section.tasks.length}건</span>
            </div>
            
            <div className="grid gap-3">
              {section.tasks.map(task => (
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