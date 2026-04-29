import { UseFormReturn } from 'react-hook-form';
import { TaskFormValues } from '../_schema/task.schema';
import { FormField, FormItem, FormLabel, FormControl } from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { Bell } from 'lucide-react';

interface NotificationSettingsProps {
  form: UseFormReturn<TaskFormValues>;
}

export function NotificationSettings({ form }: NotificationSettingsProps) {
  return (
    <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Bell className="w-4 h-4 text-slate-500" />
        <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wider">알림 설정</h2>
      </div>
      
      <div className="flex flex-col gap-4">
        <FormField
          control={form.control}
          name="notifications.beforeDeadline"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between">
              <div className="space-y-0.5">
                <FormLabel className="text-sm text-slate-700">마감 1시간 전 알림</FormLabel>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notifications.notifyAssignees"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between">
              <div className="space-y-0.5">
                <FormLabel className="text-sm text-slate-700">담당자에게 알림 전송</FormLabel>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notifications.notifyManagerOnComplete"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between">
              <div className="space-y-0.5">
                <FormLabel className="text-sm text-slate-700">완료 시 관리자 알림</FormLabel>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}