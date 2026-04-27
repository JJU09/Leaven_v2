'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Task, TaskPriority } from '../../_types/task.types';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { cn, getMemberDisplayName } from '@/lib/utils';
import { useTaskMutations } from '../../_hooks/useTaskMutations';
import { TaskFormDialog } from '../../_components/TaskFormDialog';
import { ArrowLeft, CheckCircle2, Clock, Calendar, User, Trash2, Edit } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';

interface TaskDetailPageClientProps {
  initialTask: any;
  storeId: string;
  currentStaffId: string;
  canManageTasks: boolean;
  staffList: any[];
}

export function TaskDetailPageClient({
  initialTask,
  storeId,
  currentStaffId,
  canManageTasks,
  staffList,
}: TaskDetailPageClientProps) {
  const router = useRouter();
  const [task, setTask] = useState<Task>(initialTask);
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);
  const { toggleTaskStatus, deleteTask } = useTaskMutations(storeId);

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

  const formattedStaffList = staffList.map(m => ({
    id: m.id,
    name: getMemberDisplayName(m),
  }));

  const handleToggleStatus = async () => {
    if (!canToggle) return;
    
    // Optimistic update
    const newStatus = !task.is_done;
    setTask({ ...task, is_done: newStatus });
    
    toggleTaskStatus.mutate({ id: task.id, is_done: newStatus }, {
      onError: () => {
        // Revert on error
        setTask({ ...task, is_done: !newStatus });
      }
    });
  };

  const handleDelete = () => {
    if (confirm('정말로 이 업무를 삭제하시겠습니까?')) {
      deleteTask.mutate(task.id, {
        onSuccess: () => {
          router.push('/dashboard/tasks');
        }
      });
    }
  };

  // When edit succeeds, we update the local task state to reflect the new info immediately
  // and close the dialog
  const handleEditSuccess = (updatedData: Partial<Task>) => {
    // If the updater provides an assignee ID, we try to match it with staffList to show the correct name immediately
    let newAssignee = task.assignee;
    if (updatedData.assignee_id) {
      const matchedStaff = staffList.find(s => s.id === updatedData.assignee_id);
      if (matchedStaff) {
        newAssignee = matchedStaff;
      }
    }

    setTask(prev => ({
      ...prev,
      ...updatedData,
      assignee: updatedData.assignee_id ? newAssignee : prev.assignee
    }));
    setIsEditFormOpen(false);
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto w-full space-y-6">
        <div className="flex items-center gap-4 mb-2">
          <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/tasks')} className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className={cn('w-3 h-3 rounded-full', priorityColors[task.priority])} />
            <span className="text-sm font-medium text-muted-foreground">{priorityLabels[task.priority]} 우선순위</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <h1 className={cn('text-3xl font-bold tracking-tight', task.is_done && 'line-through text-muted-foreground')}>
            {task.title}
          </h1>
          
          <div className="flex gap-2 shrink-0">
            {canEdit && (
              <>
                <Button variant="outline" size="sm" onClick={() => setIsEditFormOpen(true)}>
                  <Edit className="h-4 w-4 mr-2" />
                  편집
                </Button>
                <Button variant="destructive" size="sm" onClick={handleDelete}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  삭제
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          <div className="md:col-span-2 flex">
            <Card className="flex flex-col w-full h-full">
              <CardHeader>
                <CardTitle className="text-lg">업무 설명</CardTitle>
              </CardHeader>
              <CardContent className="flex-1">
                {task.description ? (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{task.description}</p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">설명이 없습니다.</p>
                )}
              </CardContent>
              <CardFooter className="pt-4 border-t">
                <Button
                  className="w-full"
                  variant={task.is_done ? 'outline' : 'default'}
                  disabled={!canToggle}
                  onClick={handleToggleStatus}
                >
                  {task.is_done ? (
                    <>완료 취소</>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      완료 처리
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </div>

          <div className="flex">
            <Card className="w-full h-full">
              <CardHeader>
                <CardTitle className="text-lg">상세 정보</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <User className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground font-medium mb-1">담당자</p>
                    <p className="text-sm font-medium">{getMemberDisplayName(task.assignee) || '미배정'}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <User className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground font-medium mb-1">배정자</p>
                    <p className="text-sm">{getMemberDisplayName(task.assigner) || '시스템'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground font-medium mb-1">마감일</p>
                    <p className="text-sm">
                      {task.due_date ? format(new Date(task.due_date), 'yyyy년 MM월 dd일') : '없음'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground font-medium mb-1">상태</p>
                    <div className="text-sm font-medium">
                      {task.is_done ? (
                        <span className="text-primary flex items-center gap-1">
                          완료됨
                          <span className="text-xs font-normal text-muted-foreground ml-1">
                            ({task.done_at && format(new Date(task.done_at), 'MM/dd HH:mm')})
                          </span>
                        </span>
                      ) : (
                        <span className="text-amber-600">진행 중</span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {isEditFormOpen && (
        <TaskFormDialog
          open={isEditFormOpen}
          onOpenChange={(open) => setIsEditFormOpen(open)}
          storeId={storeId}
          assignerId={currentStaffId}
          staffList={formattedStaffList}
          taskToEdit={task}
          onSuccess={handleEditSuccess}
        />
      )}
    </div>
  );
}