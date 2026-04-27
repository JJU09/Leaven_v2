import { Checkbox } from '@/components/ui/checkbox';
import { Task, TaskPriority } from '../_types/task.types';
import { format, isToday } from 'date-fns';
import { cn } from '@/lib/utils';
import { useTaskMutations } from '../_hooks/useTaskMutations';

interface TaskCardProps {
  task: Task;
  storeId: string;
  currentStaffId: string;
  canManageTasks: boolean;
  onClick?: () => void;
}

export function TaskCard({ task, storeId, currentStaffId, canManageTasks, onClick }: TaskCardProps) {
  const { toggleTaskStatus } = useTaskMutations(storeId);

  const canToggle = canManageTasks || task.assignee_id === currentStaffId;

  const priorityColors: Record<TaskPriority, string> = {
    high: 'bg-red-500',
    normal: 'bg-blue-500',
    low: 'bg-gray-400',
  };

  const isOverdue = !task.is_done && task.due_date && new Date(task.due_date) < new Date(new Date().setHours(0,0,0,0));

  return (
    <div
      onClick={onClick}
      className={cn(
        'group flex items-start justify-between gap-3 p-3 sm:p-4 rounded-lg border bg-card text-card-foreground shadow-sm cursor-pointer hover:bg-accent/50 transition-colors',
        task.is_done && 'opacity-60 bg-muted/50'
      )}
    >
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <div className="mt-1 flex-shrink-0">
          <div className={cn('w-2.5 h-2.5 rounded-full', priorityColors[task.priority])} />
        </div>
        
        <div className="flex flex-col gap-1 min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className={cn(
              'font-medium text-sm sm:text-base truncate',
              task.is_done && 'line-through text-muted-foreground'
            )}>
              {task.title}
            </h4>
            {isOverdue && (
              <span className="text-[10px] sm:text-xs font-semibold text-red-500 bg-red-100 dark:bg-red-900/30 px-1.5 py-0.5 rounded flex-shrink-0">
                기한 초과
              </span>
            )}
          </div>
          
          <div className="flex items-center text-xs text-muted-foreground gap-1.5 truncate">
            {task.assignee ? (
              <span className="truncate max-w-[100px]">{task.assignee.name}</span>
            ) : (
              <span className="italic text-muted-foreground/70">미배정</span>
            )}
            
            {task.due_date && (
              <>
                <span className="opacity-50">·</span>
                <span className={cn(isOverdue && !task.is_done && 'text-red-500 font-medium')}>
                  {isToday(new Date(task.due_date)) ? '오늘 마감' : format(new Date(task.due_date), 'MM.dd')}
                </span>
              </>
            )}
          </div>
          
          {task.description && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {task.description}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={task.is_done}
          onCheckedChange={(checked) => {
            if (canToggle) {
              toggleTaskStatus.mutate({ id: task.id, is_done: checked as boolean });
            }
          }}
          disabled={!canToggle}
          className="h-5 w-5"
        />
      </div>
    </div>
  );
}