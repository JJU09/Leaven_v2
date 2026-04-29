'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { taskSchema, TaskFormValues } from '../../../new/_schema/task.schema';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Form } from '@/components/ui/form';

import { BasicInfoSection } from '../../../new/_components/BasicInfoSection';
import { AssigneeSection } from '../../../new/_components/AssigneeSection';
import { ScheduleSection } from '../../../new/_components/ScheduleSection';
import { ChecklistSection } from '../../../new/_components/ChecklistSection';
import { AttachmentSection } from '../../../new/_components/AttachmentSection';
import { PreviewCard } from '../../../new/_components/PreviewCard';
import { NotificationSettings } from '../../../new/_components/NotificationSettings';
import { updateTaskData } from '@/features/tasks/actions';

interface TaskEditFormProps {
  initialTask: any;
}

export function TaskEditForm({ initialTask }: TaskEditFormProps) {
  const router = useRouter();
  const [storeId, setStoreId] = useState<string | null>(initialTask.store_id || null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    if (!storeId) {
      const match = document.cookie.match(/(^| )leaven_current_store_id=([^;]+)/);
      if (match) {
        setStoreId(match[2]);
      }
    }
  }, [storeId]);

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: initialTask.title || '',
      description: initialTask.description || '',
      priority: initialTask.priority === 'normal' ? 'medium' : (initialTask.priority || 'medium'),
      assigneeIds: initialTask.assignee_ids || [],
      isAllDay: initialTask.is_all_day || false,
      startAt: initialTask.start_time || new Date().toISOString(),
      endAt: initialTask.end_time || new Date(Date.now() + 3600000).toISOString(),
      checklist: initialTask.checklist || [],
      attachmentIds: initialTask.attachments || [],
      notifications: initialTask.notification_settings || {
        beforeDeadline: true,
        notifyAssignees: true,
        notifyManagerOnComplete: false,
      }
    }
  });

  if (!isMounted) return null;

  const onSubmit = async (data: TaskFormValues) => {
    if (!storeId) {
      toast.error('매장 정보를 찾을 수 없습니다.');
      return;
    }
    try {
      await updateTaskData(initialTask.id, storeId, data);
      toast.success('업무가 수정되었습니다.');
      router.push(`/dashboard/tasks/${initialTask.id}`);
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || '업무 수정에 실패했습니다.');
    }
  };

  return (
    <Form {...form}>
      <div className="flex flex-col h-full bg-slate-50 min-h-screen">
        <header className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-semibold">업무 수정</h1>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={form.handleSubmit(onSubmit)} disabled={!form.watch('title')}>
              수정 완료
            </Button>
          </div>
        </header>

        <main className="flex-1 p-6">
          <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row gap-6">
            <div className="flex-1 flex flex-col gap-6">
              <BasicInfoSection form={form} />
              <AssigneeSection form={form} storeId={storeId} />
              <ScheduleSection form={form} />
              <ChecklistSection form={form} />
              <AttachmentSection form={form} storeId={storeId} />
            </div>

            <div className="hidden md:flex flex-col gap-6 w-[272px] shrink-0">
              <PreviewCard form={form} storeId={storeId} />
              <NotificationSettings form={form} />
            </div>
          </div>
        </main>
      </div>
    </Form>
  );
}