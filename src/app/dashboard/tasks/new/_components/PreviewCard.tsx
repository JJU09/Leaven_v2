import { UseFormReturn } from 'react-hook-form';
import { TaskFormValues } from '../_schema/task.schema';
import { useTaskStaff } from '../_hooks/useTaskStaff';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { CalendarIcon, Users, CheckSquare, RepeatIcon } from 'lucide-react';

interface PreviewCardProps {
  form: UseFormReturn<TaskFormValues>;
  storeId: string | null;
}

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

export function PreviewCard({ form, storeId }: PreviewCardProps) {
  const { data: staffList = [] } = useTaskStaff(storeId);
  
  const title = form.watch('title');
  const priority = form.watch('priority');
  const assigneeIds = form.watch('assigneeIds') || [];
  const isAllDay = form.watch('isAllDay');
  const startAt = form.watch('startAt');
  const endAt = form.watch('endAt');
  const repeat = form.watch('repeat');
  const checklist = form.watch('checklist') || [];

  const selectedStaff = staffList.filter(staff => assigneeIds.includes(Number(staff.id)));

  const priorityColor = {
    low: 'bg-[#EAF3DE]',
    medium: 'bg-[#FAEEDA]',
    high: 'bg-[#FCEBEB]'
  };

  const repeatLabels = {
    daily: '매일',
    weekly: '매주',
    biweekly: '격주',
    monthly: '매월',
    custom: '직접 설정'
  };

  return (
    <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm flex flex-col gap-4">
      <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wider">실시간 미리보기</h2>
      
      <div className="flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <div className={cn("w-3 h-3 rounded-full mt-1.5 shrink-0", priorityColor[priority])} />
          <h3 className="text-base font-semibold text-slate-900 break-words leading-snug">
            {title || '업무 제목이 표시됩니다'}
          </h3>
        </div>

        <div className="flex flex-col gap-2 mt-2">
          {/* 일정 */}
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <CalendarIcon className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="truncate">
              {startAt ? (
                isAllDay 
                  ? `${format(new Date(startAt), 'MM.dd')} ~ ${format(new Date(endAt), 'MM.dd')}`
                  : `${format(new Date(startAt), 'MM.dd HH:mm')} ~ ${format(new Date(endAt), 'MM.dd HH:mm')}`
              ) : '일정 미지정'}
            </span>
          </div>

          {/* 반복 */}
          {repeat?.type && (
            <div className="flex items-center gap-2 text-sm text-blue-600">
              <RepeatIcon className="w-4 h-4 shrink-0" />
              <span>{repeatLabels[repeat.type]} 반복</span>
            </div>
          )}

          {/* 담당자 */}
          {selectedStaff.length > 0 && (
            <div className="flex items-center gap-2 mt-1">
              <Users className="w-4 h-4 text-slate-400 shrink-0" />
              <div className="flex -space-x-2">
                {selectedStaff.slice(0, 3).map(staff => (
                  <div 
                    key={staff.id}
                    className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium border-2 border-white",
                      getColorForId(staff.id)
                    )}
                    title={staff.name}
                  >
                    {getInitials(staff.name)}
                  </div>
                ))}
                {selectedStaff.length > 3 && (
                  <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-medium border-2 border-white text-slate-600">
                    +{selectedStaff.length - 3}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 체크리스트 */}
          {checklist.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-slate-600 mt-1">
              <CheckSquare className="w-4 h-4 text-slate-400 shrink-0" />
              <span>0/{checklist.length} 완료</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}