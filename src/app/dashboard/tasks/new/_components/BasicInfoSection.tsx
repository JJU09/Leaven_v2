import { UseFormReturn } from 'react-hook-form';
import { TaskFormValues } from '../_schema/task.schema';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface BasicInfoSectionProps {
  form: UseFormReturn<TaskFormValues>;
}

export function BasicInfoSection({ form }: BasicInfoSectionProps) {
  return (
    <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm flex flex-col gap-6">
      <h2 className="text-lg font-medium">기본 정보</h2>
      
      <FormField
        control={form.control}
        name="title"
        render={({ field }) => (
          <FormItem>
            <FormLabel>업무 제목 <span className="text-red-500">*</span></FormLabel>
            <FormControl>
              <Input placeholder="업무 제목을 입력하세요" className="text-base" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>설명</FormLabel>
            <FormControl>
              <Textarea 
                placeholder="업무에 대한 상세 설명을 입력하세요" 
                className="min-h-[80px] resize-y" 
                {...field} 
                value={field.value || ''}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="priority"
        render={({ field }) => (
          <FormItem>
            <FormLabel>우선순위</FormLabel>
            <FormControl>
              <div className="flex gap-2 p-1 bg-slate-100 rounded-lg w-fit">
                <button
                  type="button"
                  onClick={() => field.onChange('low')}
                  className={cn(
                    "px-4 py-1.5 rounded-md text-sm font-medium transition-colors",
                    field.value === 'low' 
                      ? "bg-[#EAF3DE] text-[#3B6D11] border border-[#3B6D11]" 
                      : "text-slate-600 hover:bg-slate-200 border border-transparent"
                  )}
                >
                  낮음
                </button>
                <button
                  type="button"
                  onClick={() => field.onChange('medium')}
                  className={cn(
                    "px-4 py-1.5 rounded-md text-sm font-medium transition-colors",
                    field.value === 'medium' 
                      ? "bg-[#FAEEDA] text-[#633806] border border-[#BA7517]" 
                      : "text-slate-600 hover:bg-slate-200 border border-transparent"
                  )}
                >
                  보통
                </button>
                <button
                  type="button"
                  onClick={() => field.onChange('high')}
                  className={cn(
                    "px-4 py-1.5 rounded-md text-sm font-medium transition-colors",
                    field.value === 'high' 
                      ? "bg-[#FCEBEB] text-[#A32D2D] border border-[#A32D2D]" 
                      : "text-slate-600 hover:bg-slate-200 border border-transparent"
                  )}
                >
                  높음
                </button>
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}