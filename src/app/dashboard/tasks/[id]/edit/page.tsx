import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { TaskEditForm } from './_components/TaskEditForm';

export const metadata: Metadata = {
  title: '업무 수정 | Leaven',
};

interface EditTaskPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditTaskPage({ params }: EditTaskPageProps) {
  const resolvedParams = await params;
  const taskId = resolvedParams.id;
  
  const supabase = await createClient();
  const { data: task, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', taskId)
    .single();

  if (error || !task) {
    notFound();
  }

  return <TaskEditForm initialTask={task} />;
}