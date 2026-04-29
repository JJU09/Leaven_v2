import { UseFormReturn } from 'react-hook-form';
import { TaskFormValues } from '../_schema/task.schema';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface ScheduleSectionProps {
  form: UseFormReturn<TaskFormValues>;
}

export function ScheduleSection({ form }: ScheduleSectionProps) {
  const isAllDay = form.watch('isAllDay');

  return (
    <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm flex flex-col gap-6">
      <h2 className="text-lg font-medium">일정</h2>
      
      <div className="flex flex-col gap-6">
        {/* 종일 업무 토글 */}
        <FormField
          control={form.control}
          name="isAllDay"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">종일 업무</FormLabel>
                <div className="text-sm text-slate-500">시간을 지정하지 않고 날짜만 설정합니다.</div>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={(checked) => {
                    field.onChange(checked);
                    // 종일 모드 변경 시 날짜 포맷 맞추기 (시간 제거/추가)
                    const startAt = form.getValues('startAt');
                    const endAt = form.getValues('endAt');
                    if (checked) {
                      form.setValue('startAt', startAt.split('T')[0] + 'T00:00:00.000Z');
                      form.setValue('endAt', endAt.split('T')[0] + 'T23:59:59.999Z');
                    }
                  }}
                />
              </FormControl>
            </FormItem>
          )}
        />

        {/* 날짜 선택 (시작 ~ 종료) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="startAt"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>시작 시간</FormLabel>
                <FormControl>
                  {isAllDay ? (
                    <Input 
                      type="date" 
                      value={field.value ? field.value.split('T')[0] : ''}
                      onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value).toISOString() : '')}
                    />
                  ) : (
                    <Input 
                      type="datetime-local" 
                      value={field.value ? field.value.substring(0, 16) : ''}
                      onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value).toISOString() : '')}
                    />
                  )}
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="endAt"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>마감 시간</FormLabel>
                <FormControl>
                  {isAllDay ? (
                    <Input 
                      type="date" 
                      value={field.value ? field.value.split('T')[0] : ''}
                      onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value).toISOString() : '')}
                    />
                  ) : (
                    <Input 
                      type="datetime-local" 
                      value={field.value ? field.value.substring(0, 16) : ''}
                      onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value).toISOString() : '')}
                    />
                  )}
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* 반복 업무 설정 */}
        <FormField
          control={form.control}
          name="repeat.type"
          render={({ field }) => (
            <FormItem className="flex flex-col space-y-3 mt-2 pt-4 border-t">
              <FormLabel>반복 설정</FormLabel>
              <FormControl>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: undefined, label: '반복 안함' },
                    { value: 'daily', label: '매일' },
                    { value: 'weekly', label: '매주' },
                    { value: 'biweekly', label: '격주' },
                    { value: 'monthly', label: '매월' },
                    { value: 'custom', label: '직접 설정' },
                  ].map((option) => (
                    <button
                      key={option.value || 'none'}
                      type="button"
                      onClick={() => field.onChange(option.value)}
                      className={cn(
                        "px-4 py-1.5 rounded-full text-sm font-medium transition-colors border",
                        field.value === option.value 
                          ? "bg-slate-900 text-white border-slate-900" 
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {form.watch('repeat.type') === 'custom' && (
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 flex flex-col gap-4 animate-in fade-in slide-in-from-top-2">
            <FormField
              control={form.control}
              name="repeat.days"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-slate-500">반복 요일</FormLabel>
                  <FormControl>
                    <div className="flex gap-2">
                      {['일', '월', '화', '수', '목', '금', '토'].map((day, idx) => {
                        const days = field.value || [];
                        const isSelected = days.includes(idx);
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                field.onChange(days.filter(d => d !== idx));
                              } else {
                                field.onChange([...days, idx].sort());
                              }
                            }}
                            className={cn(
                              "w-8 h-8 rounded-full text-sm font-medium transition-colors",
                              isSelected
                                ? "bg-blue-100 text-blue-700"
                                : "bg-white border text-slate-600 hover:bg-slate-50"
                            )}
                          >
                            {day}
                          </button>
                        );
                      })}
                    </div>
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="repeat.endDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel className="text-xs text-slate-500">종료일</FormLabel>
                  <FormControl>
                    <Input 
                      type="date" 
                      className="w-[200px]"
                      value={field.value ? field.value.split('T')[0] : ''}
                      onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value).toISOString() : '')}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        )}

      </div>
    </div>
  );
}