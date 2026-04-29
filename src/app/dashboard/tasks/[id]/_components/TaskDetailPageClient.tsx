'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Task, TaskPriority } from '../../_types/task.types';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { cn, getMemberDisplayName } from '@/lib/utils';
import { useTaskMutations } from '../../_hooks/useTaskMutations';
import { deleteTask as deleteTaskAction } from '@/features/tasks/actions';
import { ArrowLeft, CheckCircle2, Clock, Calendar, User, Trash2, Edit, AlertCircle, FileText, CheckSquare, Paperclip, RepeatIcon, Image as ImageIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import Image from 'next/image';

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
  const { toggleTaskStatus } = useTaskMutations(storeId);

  const canEdit = canManageTasks;
  const canToggle = canManageTasks || ((task as any).assignee_ids && (task as any).assignee_ids.includes(currentStaffId));

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

  const handleDelete = async () => {
    if (confirm('정말로 이 업무를 삭제하시겠습니까?')) {
      try {
        const result = await deleteTaskAction(task.id);
        if (result.error) {
          console.error('Failed to delete task:', result.error);
          alert(result.error);
        } else {
          router.push('/dashboard/tasks');
        }
      } catch (error) {
        console.error('Failed to delete task:', error);
        alert('업무 삭제 중 오류가 발생했습니다.');
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 min-h-screen">
      {/* Topbar */}
      <header className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/tasks')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-semibold">업무 상세</h1>
        </div>
        <div className="flex items-center gap-3">
          {canEdit && (
            <>
              <Button variant="outline" onClick={() => router.push(`/dashboard/tasks/${task.id}/edit`)}>
                <Edit className="w-4 h-4 mr-2" />
                수정
              </Button>
              <Button variant="outline" className="text-destructive hover:bg-destructive/10" onClick={handleDelete}>
                <Trash2 className="w-4 h-4 mr-2" />
                삭제
              </Button>
            </>
          )}
          <Button 
            variant={task.is_done ? 'outline' : 'default'}
            disabled={!canToggle}
            onClick={handleToggleStatus}
          >
            {task.is_done ? (
              <>완료 취소</>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                완료 처리
              </>
            )}
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6">
        <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row gap-6">
          {/* Main Column */}
          <div className="flex-1 flex flex-col gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  기본 정보
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h2 className={cn('text-2xl font-bold tracking-tight', task.is_done && 'line-through text-muted-foreground')}>
                    {task.title}
                  </h2>
                </div>
                <div>
                  {task.description ? (
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{task.description}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">설명이 없습니다.</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Checklist Section */}
            {(task as any).checklist && (task as any).checklist.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CheckSquare className="w-5 h-5" />
                    체크리스트
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {(task as any).checklist.map((item: any, i: number) => {
                      const isItemDone = item.is_done || item.isDone;
                      return (
                        <li 
                          key={item.id || i} 
                          className="flex items-start gap-3 p-2 rounded-md hover:bg-slate-50 transition-colors cursor-pointer"
                          onClick={() => {
                            // Optimistic update for checklist item
                            const newChecklist = [...(task as any).checklist];
                            newChecklist[i] = { ...item, is_done: !isItemDone, isDone: !isItemDone };
                            setTask({ ...task, checklist: newChecklist } as any);
                            
                            // NOTE: You would need a backend mutation to save this change
                            // updateChecklistItem.mutate({ taskId: task.id, itemId: item.id, isDone: !isItemDone })
                          }}
                        >
                          <button className={cn(
                            "flex-shrink-0 mt-0.5 w-5 h-5 rounded-full border flex items-center justify-center transition-colors",
                            isItemDone ? "bg-primary border-primary text-white" : "border-slate-300 text-transparent hover:border-primary"
                          )}>
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                          <span className={cn(
                            "text-sm leading-tight pt-0.5 select-none",
                            isItemDone && "line-through text-muted-foreground"
                          )}>
                            {item.title || item.content || item.text}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Attachments Section */}
            {(task as any).attachments && (task as any).attachments.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ImageIcon className="w-5 h-5" />
                    첨부 이미지
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {(task as any).attachments.map((attachment: any, i: number) => {
                      // Get URL string whether it's directly a string or an object with url property
                      // Support various structures like { fileUrl: '...' }, { url: '...' }, { path: '...' } 
                      const url = typeof attachment === 'string' 
                        ? attachment 
                        : (attachment.fileUrl || attachment.url || attachment.path || attachment.preview);
                        
                      if (!url) return null;

                      // UUID 같은 유효하지 않은 URL 형태 방어
                      const isValidUrl = url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/');
                      
                      return (
                        <div key={attachment.id || i} className="group relative aspect-square rounded-lg border bg-slate-100 overflow-hidden">
                          {isValidUrl ? (
                            <>
                              <Image 
                                src={url} 
                                alt={`첨부 이미지 ${i + 1}`} 
                                fill 
                                className="object-cover" 
                                sizes="(max-width: 768px) 50vw, 33vw"
                              />
                              <a 
                                href={url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center"
                              >
                                <span className="sr-only">크게 보기</span>
                              </a>
                            </>
                          ) : (
                            <div className="flex items-center justify-center h-full w-full bg-slate-200">
                              <ImageIcon className="w-8 h-8 text-slate-400" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Side Column */}
          <div className="hidden md:flex flex-col gap-6 w-[272px] shrink-0">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">상태 및 일정</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">상태</span>
                  <div className="flex items-center gap-2 text-sm font-medium">
                    {task.is_done ? (
                      <span className="text-primary flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" />
                        완료됨
                      </span>
                    ) : (
                      <span className="text-amber-600 flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        진행 중
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">우선순위</span>
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <div className={cn('w-3 h-3 rounded-full', priorityColors[task.priority])} />
                    {priorityLabels[task.priority]}
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">일정</span>
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <div className="flex flex-col">
                      {task.start_time && (
                        <span className="text-xs text-muted-foreground">{format(new Date(task.start_time), 'yyyy.MM.dd HH:mm')} 부터</span>
                      )}
                      <span>{task.due_date ? format(new Date(task.due_date), 'yyyy.MM.dd HH:mm') : '없음'} 까지</span>
                    </div>
                  </div>
                </div>

                {(task as any).repeat_settings && (
                  <div className="flex flex-col gap-1 mt-2">
                    <span className="text-xs text-muted-foreground">반복 주기</span>
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <RepeatIcon className="w-4 h-4 text-primary" />
                      <span className="text-primary">
                        {(task as any).repeat_settings.type === 'daily' && '매일 반복'}
                        {(task as any).repeat_settings.type === 'weekly' && '매주 반복'}
                        {(task as any).repeat_settings.type === 'biweekly' && '격주 반복'}
                        {(task as any).repeat_settings.type === 'monthly' && '매월 반복'}
                        {(task as any).repeat_settings.type === 'custom' && '사용자 지정 반복'}
                        {!(task as any).repeat_settings.type && '반복 설정됨'}
                      </span>
                    </div>
                  </div>
                )}
                
                {task.is_done && task.done_at && (
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-muted-foreground">완료 일시</span>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {format(new Date(task.done_at), 'yyyy년 MM월 dd일 HH:mm')}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">담당자 정보</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">담당자</span>
                  <div className="flex flex-col gap-2 text-sm font-medium">
                    {((task as any).assignee_ids && (task as any).assignee_ids.length > 0) ? (
                      (task as any).assignee_ids.map((id: string) => {
                        const member = staffList.find(s => s.id === id);
                        return (
                          <div key={id} className="flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            {member ? getMemberDisplayName(member) : '알 수 없는 사용자'}
                          </div>
                        );
                      })
                    ) : (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <User className="w-4 h-4" />
                        미배정
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-col gap-1 mt-4">
                  <span className="text-xs text-muted-foreground">생성자</span>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="w-4 h-4" />
                    {getMemberDisplayName((task as any).assigner) || '시스템'}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}