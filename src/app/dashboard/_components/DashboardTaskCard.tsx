'use client';

import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronRight, ClipboardList } from 'lucide-react';
import Link from 'next/link';
import { useTodayTasks, useOngoingTasks, useOverdueTasks } from '@/app/dashboard/tasks/_hooks/useTasks';
import { useTaskMutations } from '@/app/dashboard/tasks/_hooks/useTaskMutations';
import { isToday } from 'date-fns';
import { cn } from '@/lib/utils';
import { Task } from '@/app/dashboard/tasks/_types/task.types';

interface DashboardTaskCardProps {
  storeId: string;
  currentStaffId: string;
  canManageTasks: boolean;
}

export function DashboardTaskCard({ storeId, currentStaffId, canManageTasks }: DashboardTaskCardProps) {
  const { data: todayTasks = [], isLoading: isLoadingToday } = useTodayTasks(storeId);
  const { data: ongoingTasks = [] } = useOngoingTasks(storeId);
  const { data: overdueTasks = [] } = useOverdueTasks(storeId);
  const { toggleTaskStatus } = useTaskMutations(storeId);

  const myIncompleteToday = todayTasks.filter(t => !t.is_done && t.assignee_id === currentStaffId).length;
  const myIncompleteOngoing = ongoingTasks.filter(t => !t.is_done && t.assignee_id === currentStaffId).length;
  const myIncompleteOverdue = overdueTasks.filter(t => !t.is_done && t.assignee_id === currentStaffId).length;
  const myIncompleteTotal = myIncompleteToday + myIncompleteOngoing + myIncompleteOverdue;

  const totalIncompleteToday = todayTasks.filter(t => !t.is_done).length;
  const totalIncompleteOngoing = ongoingTasks.filter(t => !t.is_done).length;
  const totalIncompleteOverdue = overdueTasks.filter(t => !t.is_done).length;
  const totalIncomplete = totalIncompleteToday + totalIncompleteOngoing + totalIncompleteOverdue;

  // 마감 임박 태스크 (오늘 마감 + 기한 초과)
  const urgentTasks = [
    ...overdueTasks.filter(t => !t.is_done),
    ...todayTasks.filter(t => !t.is_done),
  ].slice(0, 3); // 최대 3건

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            내 업무
          </CardTitle>
          <Badge variant={myIncompleteTotal > 0 ? "default" : "secondary"}>
            {myIncompleteTotal}건 남음
          </Badge>
        </div>
        {canManageTasks && (
          <p className="text-xs text-muted-foreground mt-1">
            전체 미완료: <span className="font-medium text-foreground">{totalIncomplete}건</span>
          </p>
        )}
      </CardHeader>
      
      <CardContent className="flex-1 overflow-hidden flex flex-col gap-3 py-2">
        {isLoadingToday ? (
          <div className="flex justify-center items-center h-full">
            <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-primary"></div>
          </div>
        ) : urgentTasks.length > 0 ? (
          urgentTasks.map((task) => {
            const isOverdue = task.due_date && new Date(task.due_date) < new Date(new Date().setHours(0,0,0,0));
            const canToggle = canManageTasks || task.assignee_id === currentStaffId;

            return (
              <div key={task.id} className="flex items-start gap-2 bg-muted/50 p-2 rounded-md">
                <Checkbox 
                  className="mt-0.5 w-4 h-4"
                  checked={task.is_done}
                  disabled={!canToggle}
                  onCheckedChange={(checked) => {
                    if (canToggle) {
                      toggleTaskStatus.mutate({ id: task.id, is_done: checked as boolean });
                    }
                  }}
                />
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-sm font-medium truncate">{task.title}</span>
                  <span className={cn(
                    "text-[10px] font-medium",
                    isOverdue ? "text-red-500" : "text-amber-500"
                  )}>
                    {isOverdue ? "기한 초과" : "오늘 마감"}
                  </span>
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <p className="text-sm">마감 임박 업무가 없습니다.</p>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="pt-2 border-t mt-auto">
        <Button variant="ghost" className="w-full text-xs h-8" asChild>
          <Link href="/dashboard/tasks">
            전체 보기 <ChevronRight className="ml-1 h-3 w-3" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}