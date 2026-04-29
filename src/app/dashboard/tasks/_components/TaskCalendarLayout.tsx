import { useState, useMemo } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { format, isSameDay } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useMonthlyTaskSummary } from '../_hooks/useTasks';
import { DaySummary } from '../_hooks/useTasks';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

interface TaskCalendarLayoutProps {
  storeId: string;
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  children: React.ReactNode;
}

export function TaskCalendarLayout({
  storeId,
  selectedDate,
  onDateSelect,
  children,
}: TaskCalendarLayoutProps) {
  const [currentMonth, setCurrentMonth] = useState(selectedDate);
  
  const { data: monthlySummary = {} } = useMonthlyTaskSummary(
    storeId,
    currentMonth.getFullYear(),
    currentMonth.getMonth() + 1
  );

  const modifiers = useMemo(() => {
    const allDone: Date[] = [];
    const hasOverdue: Date[] = [];
    const hasPending: Date[] = [];

    Object.values(monthlySummary).forEach((summary: DaySummary) => {
      const date = new Date(summary.date);
      if (summary.hasOverdue) {
        hasOverdue.push(date);
      } else if (summary.total > 0 && summary.completed === summary.total) {
        allDone.push(date);
      } else if (summary.total > summary.completed) {
        hasPending.push(date);
      }
    });

    return { allDone, hasOverdue, hasPending };
  }, [monthlySummary]);

  const stats = useMemo(() => {
    let totalTasks = 0;
    let completedTasks = 0;
    let overdueCount = 0;
    let pendingCount = 0;
    let daysCompleted = 0;

    Object.values(monthlySummary).forEach((summary: DaySummary) => {
      totalTasks += summary.total;
      completedTasks += summary.completed;
      
      if (summary.hasOverdue) overdueCount += (summary.total - summary.completed);
      else if (summary.total > summary.completed) pendingCount += (summary.total - summary.completed);

      if (summary.total > 0 && summary.total === summary.completed) {
        daysCompleted += 1;
      }
    });

    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return {
      completionRate,
      overdueCount,
      pendingCount,
      daysCompleted
    };
  }, [monthlySummary]);

  const CalendarPanel = () => (
    <div className="flex flex-col gap-4">
      <Card className="border-none shadow-none md:border md:shadow-sm">
        <CardContent className="p-0 md:p-3">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => date && onDateSelect(date)}
            month={currentMonth}
            onMonthChange={setCurrentMonth}
            locale={ko}
            modifiers={modifiers}
            className="w-full"
            classNames={{
              months: "w-full",
              month: "w-full",
              table: "w-full",
              head_row: "flex justify-between w-full mt-2",
              head_cell: "text-muted-foreground w-9 font-normal text-[0.8rem] text-center",
              row: "flex w-full mt-2 justify-between",
              cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
              day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100 mx-auto",
            }}
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-muted/40">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <span className="text-xs text-muted-foreground mb-1">완료율</span>
            <span className="text-xl font-bold">{stats.completionRate}%</span>
          </CardContent>
        </Card>
        <Card className="bg-red-50/50 dark:bg-red-950/20 border-red-100 dark:border-red-900/50">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <span className="text-xs text-red-600/80 dark:text-red-400/80 mb-1">지연된 업무</span>
            <span className="text-xl font-bold text-red-600 dark:text-red-400">{stats.overdueCount}건</span>
          </CardContent>
        </Card>
        <Card className="bg-muted/40">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <span className="text-xs text-muted-foreground mb-1">남은 업무</span>
            <span className="text-xl font-bold">{stats.pendingCount}건</span>
          </CardContent>
        </Card>
        <Card className="bg-[#3B6D11]/5 border-[#3B6D11]/20">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <span className="text-xs text-[#3B6D11]/80 mb-1">완벽한 날</span>
            <span className="text-xl font-bold text-[#3B6D11]">{stats.daysCompleted}일</span>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col md:flex-row gap-6 w-full">
      {/* Mobile Calendar Toggle */}
      <div className="md:hidden flex items-center justify-between mb-2">
        <div className="text-lg font-semibold">
          {format(selectedDate, 'M월 d일', { locale: ko })} 업무
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Menu className="h-4 w-4" />
              달력 보기
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[320px] sm:w-[350px] pt-12">
            <CalendarPanel />
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Calendar Panel */}
      <div className="hidden md:block w-[300px] shrink-0">
        <CalendarPanel />
      </div>

      {/* Main Task List Panel */}
      <div className="flex-1 min-w-0">
        {children}
      </div>
    </div>
  );
}