import { Task, TaskPriority } from '../_types/task.types';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useTaskMutations } from '../_hooks/useTaskMutations';

interface TaskDetailSheetProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storeId: string;
  currentStaffId: string;
  canManageTasks: boolean;
  onEdit: (task: Task) => void;
}

export function TaskDetailSheet({
  task,
  open,
  onOpenChange,
  storeId,
  currentStaffId,
  canManageTasks,
  onEdit,
}: TaskDetailSheetProps) {
  const { toggleTaskStatus, deleteTask } = useTaskMutations(storeId);

  if (!task) return null;

  const canEdit = canManageTasks;
  const canToggle = canManageTasks || task.assignee_id === currentStaffId;

  const priorityLabels: Record<TaskPriority, string> = {
    high: '높음',
    normal: '보통',
    low: '낮음',
  };

  const priorityColors: Record<TaskPriority, string> = {
    high: 'bg-red-500',
    normal: 'bg-blue-500',
    low: 'bg-gray-400',
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md flex flex-col h-full">
        <SheetHeader className="pb-6 border-b">
          <div className="flex items-center gap-2 mb-2">
            <div className={cn('w-2.5 h-2.5 rounded-full', priorityColors[task.priority])} />
            <span className="text-xs font-medium text-muted-foreground">{priorityLabels[task.priority]} 우선순위</span>
          </div>
          <SheetTitle className={cn('text-xl', task.is_done && 'line-through text-muted-foreground')}>
            {task.title}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-6 space-y-6">
          {task.description && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">설명</h4>
              <p className="text-sm whitespace-pre-wrap">{task.description}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1">담당자</h4>
              <p className="text-sm">{task.assignee?.name || '미배정'}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1">배정자</h4>
              <p className="text-sm">{task.assigner?.name || '시스템'}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1">마감일</h4>
              <p className="text-sm">
                {task.due_date ? format(new Date(task.due_date), 'yyyy년 MM월 dd일') : '없음'}
              </p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1">상태</h4>
              <p className="text-sm font-medium">
                {task.is_done ? (
                  <span className="text-primary">완료됨 ({task.done_at && format(new Date(task.done_at), 'MM/dd HH:mm')})</span>
                ) : (
                  <span className="text-amber-600">진행 중</span>
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t mt-auto space-y-3">
          <Button
            className="w-full"
            variant={task.is_done ? 'outline' : 'default'}
            disabled={!canToggle}
            onClick={() => {
              toggleTaskStatus.mutate({ id: task.id, is_done: !task.is_done });
              onOpenChange(false);
            }}
          >
            {task.is_done ? '완료 취소' : '완료 처리'}
          </Button>

          {canEdit && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  onOpenChange(false);
                  onEdit(task);
                }}
              >
                편집
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => {
                  if (confirm('정말로 이 업무를 삭제하시겠습니까?')) {
                    deleteTask.mutate(task.id);
                    onOpenChange(false);
                  }
                }}
              >
                삭제
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}