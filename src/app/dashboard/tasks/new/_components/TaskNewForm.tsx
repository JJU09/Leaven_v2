'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { taskSchema, TaskFormValues } from '../_schema/task.schema';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Form } from '@/components/ui/form';
import { BasicInfoSection } from './BasicInfoSection';
import { AssigneeSection } from './AssigneeSection';
import { ScheduleSection } from './ScheduleSection';
import { ChecklistSection } from './ChecklistSection';
import { AttachmentSection } from './AttachmentSection';
import { PreviewCard } from './PreviewCard';
import { NotificationSettings } from './NotificationSettings';
import { createNewTask } from '@/features/tasks/actions';

export function TaskNewForm() {
  const router = useRouter();
  // simple way to get storeId, ideally use an existing context hook if available
  const [storeId, setStoreId] = useState<string | null>(null);

  useEffect(() => {
    // Get store id from cookies where it's stored globally for the app
    const match = document.cookie.match(/(^| )leaven_current_store_id=([^;]+)/);
    if (match) {
      setStoreId(match[2]);
    }
  }, []);
  const [isMounted, setIsMounted] = useState(false);

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: '',
      description: '',
      priority: 'medium',
      assigneeIds: [],
      isAllDay: false,
      startAt: new Date().toISOString(),
      endAt: new Date(Date.now() + 3600000).toISOString(),
      checklist: [],
      attachmentIds: [],
      notifications: {
        beforeDeadline: true,
        notifyAssignees: true,
        notifyManagerOnComplete: false,
      }
    }
  });

  // Auto-save & Restore logic
  const DRAFT_KEY = `task_draft_${storeId}`;
  const toastShownRef = useRef(false);

  useEffect(() => {
    setIsMounted(true);
    if (!storeId) return;

    const savedDraft = sessionStorage.getItem(DRAFT_KEY);
    if (savedDraft && !toastShownRef.current) {
      try {
        const parsed = JSON.parse(savedDraft);
        // Only show toast if there's actually some content
        if (parsed.title || parsed.description) {
          toastShownRef.current = true;
          toast('이전에 작성하던 내용이 있습니다.', {
            id: 'task-draft-toast',
            description: '이어서 작성하시겠습니까?',
            action: {
              label: '불러오기',
              onClick: () => {
                form.reset(parsed);
                toast.dismiss('task-draft-toast');
              },
            },
            cancel: {
              label: '무시',
              onClick: () => {
                sessionStorage.removeItem(DRAFT_KEY);
                toast.dismiss('task-draft-toast');
              },
            }
          });
        }
      } catch (e) {
        console.error('Failed to parse draft', e);
      }
    }
  }, [storeId, form, DRAFT_KEY]);

  useEffect(() => {
    if (!isMounted || !storeId) return;

    const subscription = form.watch((value) => {
      const handler = setTimeout(() => {
        sessionStorage.setItem(DRAFT_KEY, JSON.stringify(value));
      }, 1000);
      return () => clearTimeout(handler);
    });
    return () => subscription.unsubscribe();
  }, [form, isMounted, storeId, DRAFT_KEY]);

  const handleManualSave = () => {
    const data = form.getValues();
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(data));
    toast.success('임시저장 되었습니다.');
  };

  if (!isMounted) return null;

  const onSubmit = async (data: TaskFormValues) => {
    if (!storeId) {
      toast.error('매장 정보를 찾을 수 없습니다.');
      return;
    }
    try {
      await createNewTask(storeId, data);
      toast.success('새 업무가 추가되었습니다.');
      sessionStorage.removeItem(DRAFT_KEY);
      router.push('/dashboard/tasks');
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || '업무 추가에 실패했습니다.');
    }
  };

  return (
    <Form {...form}>
      <div className="flex flex-col h-full bg-slate-50 min-h-screen">
        {/* Topbar */}
      <header className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-semibold">새 업무 추가</h1>
        </div>
          <div className="flex items-center gap-3">
            <Button type="button" variant="ghost" onClick={handleManualSave}>임시저장</Button>
            <Button onClick={form.handleSubmit(onSubmit)} disabled={!form.watch('title')}>
              업무 추가
            </Button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-6">
          <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row gap-6">
            {/* Main Column */}
            <div className="flex-1 flex flex-col gap-6">
              <BasicInfoSection form={form} />
              <AssigneeSection form={form} storeId={storeId} />
              <ScheduleSection form={form} />
              <ChecklistSection form={form} />
              <AttachmentSection form={form} storeId={storeId} />
            </div>

          {/* Side Column */}
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
