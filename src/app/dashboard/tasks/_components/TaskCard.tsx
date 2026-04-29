import { Checkbox } from '@/components/ui/checkbox';
import { Task, TaskPriority } from '../_types/task.types';
import { format, isToday } from 'date-fns';
import { cn } from '@/lib/utils';
import { useTaskMutations } from '../_hooks/useTaskMutations';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Clock, Calendar, CheckCircle2, User, Paperclip } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const AVATAR_COLORS = [
  'bg-blue-100 text-blue-700',
  'bg-teal-100 text-teal-700',
  'bg-amber-100 text-amber-700'
];

function getInitials(name: string) {
  return name.substring(0, 2);
}

function getColorForId(id: string | number) {
  const hash = String(id).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

interface TaskCardProps {
  task: Task & { checklist?: any[]; attachments?: any[] };
  storeId: string;
  currentStaffId: string;
  canManageTasks: boolean;
  onClick?: () => void;
}

export function TaskCard({ task, storeId, currentStaffId, canManageTasks, onClick }: TaskCardProps) {
  const { toggleTaskStatus, updateTask } = useTaskMutations(storeId);

  const isAssignedToCurrent = task.assignees?.some(a => a.id === currentStaffId) ?? false;
  const canToggle = canManageTasks || isAssignedToCurrent;

  const priorityConfig: Record<TaskPriority, { label: string; color: string }> = {
    high: { label: '높음', color: 'bg-red-500 hover:bg-red-600 text-white' },
    normal: { label: '보통', color: 'bg-blue-500 hover:bg-blue-600 text-white' },
    low: { label: '낮음', color: 'bg-slate-500 hover:bg-slate-600 text-white' },
  };

  const isOverdue = !task.is_done && task.due_date && new Date(task.due_date) < new Date(new Date().setHours(0,0,0,0));

  const handleChecklistToggle = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canToggle || !task.checklist) return;

    const newChecklist = [...task.checklist];
    const currentItem = newChecklist[index];
    const isDone = currentItem.is_done || currentItem.isDone;
    
    newChecklist[index] = { ...currentItem, is_done: !isDone, isDone: !isDone };
    
    updateTask.mutate({ 
      id: task.id, 
      data: { checklist: newChecklist } as any 
    });
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        'group flex flex-col gap-3 p-4 rounded-xl border bg-card text-card-foreground shadow-sm cursor-pointer hover:border-primary/50 hover:shadow-md transition-all',
        task.is_done && 'opacity-60 bg-muted/30 hover:border-border hover:shadow-sm'
      )}
    >
      {/* Header: Priority Badge, Title, Checkbox */}
      <div className="flex items-start justify-between gap-3 w-full">
        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={cn('px-1.5 py-0 text-[10px] h-5 rounded-md border-transparent font-medium', priorityConfig[task.priority].color)}>
              {priorityConfig[task.priority].label}
            </Badge>
            {task.attachments && task.attachments.length > 0 && (
              <Badge variant="secondary" className="px-1.5 py-0 text-[10px] h-5 rounded-md text-slate-600 bg-slate-100 hover:bg-slate-200 border-transparent flex items-center gap-0.5">
                <Paperclip className="w-3 h-3" />
                <span>{task.attachments.length}</span>
              </Badge>
            )}
            {isOverdue && (
              <Badge variant="destructive" className="px-1.5 py-0 text-[10px] h-5 rounded-md bg-red-100 text-red-600 border-transparent hover:bg-red-100">
                기한 초과
              </Badge>
            )}
            {task.is_done && task.done_at && (
              <Badge variant="outline" className="px-1.5 py-0 text-[10px] h-5 rounded-md text-emerald-600 border-emerald-200 bg-emerald-50">
                {format(new Date(task.done_at), 'MM.dd HH:mm')} 완료
              </Badge>
            )}
          </div>
          
          <h4 className={cn(
            'font-semibold text-base leading-tight break-words',
            task.is_done && 'line-through text-muted-foreground'
          )}>
            {task.title}
          </h4>
        </div>

        <div className="flex items-start shrink-0 pt-1" onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={task.is_done}
            onCheckedChange={(checked) => {
              if (canToggle) {
                toggleTaskStatus.mutate({ id: task.id, is_done: checked as boolean });
              }
            }}
            disabled={!canToggle}
            className="h-6 w-6 rounded-md border-slate-300 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
          />
        </div>
      </div>

      {/* Description */}
      {task.description && (
        <p className={cn(
          "text-sm text-muted-foreground line-clamp-2 break-all",
          task.is_done && "text-muted-foreground/60"
        )}>
          {task.description}
        </p>
      )}

      {/* Checklist */}
      {task.checklist && task.checklist.length > 0 && (
        <div className="flex flex-col gap-1.5 mt-1 bg-slate-50/50 p-2.5 rounded-lg border border-slate-100">
          {task.checklist.map((item, i) => {
            const isItemDone = item.is_done || item.isDone;
            return (
              <div 
                key={item.id || i}
                onClick={(e) => handleChecklistToggle(i, e)}
                className="flex items-start gap-2 group/item"
              >
                <div className={cn(
                  "mt-0.5 shrink-0 flex items-center justify-center w-4 h-4 rounded border transition-colors",
                  isItemDone 
                    ? "bg-primary border-primary text-primary-foreground" 
                    : "border-slate-300 text-transparent group-hover/item:border-primary/50"
                )}>
                  {isItemDone && <CheckCircle2 className="w-3 h-3" />}
                </div>
                <span className={cn(
                  "text-xs leading-tight select-none pt-[1px]",
                  isItemDone ? "text-muted-foreground line-through" : "text-slate-700"
                )}>
                  {item.title || item.content || item.text}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer: Assignees, Dates, Assigner */}
      <div className="flex flex-wrap items-center justify-between gap-y-2 gap-x-4 mt-1 pt-3 border-t border-slate-100">
        {/* Assignees Avatars with Names */}
        <div className="flex items-center gap-1.5 flex-wrap flex-1">
          {task.assignees && task.assignees.length > 0 ? (
            <>
              {task.assignees.slice(0, 2).map((assignee) => (
                <div 
                  key={assignee.id}
                  className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 pr-2 pl-0.5 py-0.5 rounded-full"
                >
                  <div 
                    className={cn(
                      "w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-medium",
                      getColorForId(assignee.id)
                    )}
                  >
                    {getInitials(assignee.name)}
                  </div>
                  <span className="text-xs text-slate-700 font-medium whitespace-nowrap">
                    {assignee.name}
                  </span>
                </div>
              ))}
              {task.assignees.length > 2 && (
                <div className="flex items-center justify-center px-2 py-1 h-[26px] rounded-full bg-slate-100 border border-slate-200 text-xs font-medium text-slate-600">
                  +{task.assignees.length - 2}
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground/70 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-100">
              <User className="w-3.5 h-3.5" />
              <span className="font-medium">미배정</span>
            </div>
          )}
        </div>

        {/* Date & Assigner Info */}
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-medium">
            {task.start_time && (
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{format(new Date(task.start_time), 'HH:mm')}</span>
              </div>
            )}
            {task.start_time && task.due_date && <span className="opacity-40">-</span>}
            {task.due_date && (
              <div className={cn(
                "flex items-center gap-1",
                isOverdue && !task.is_done && "text-red-500 font-semibold"
              )}>
                <Calendar className="w-3 h-3" />
                <span>
                  {isToday(new Date(task.due_date)) ? '오늘 마감' : format(new Date(task.due_date), 'MM.dd')}
                </span>
              </div>
            )}
          </div>
          
          {task.assigner && (
            <div className="text-[10px] text-muted-foreground/70">
              요청: {task.assigner.name}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
