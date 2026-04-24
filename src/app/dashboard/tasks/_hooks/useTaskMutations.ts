import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { TaskFormData } from '../_types/task.types';
import { format } from 'date-fns';

export function useTaskMutations(storeId: string) {
  const queryClient = useQueryClient();
  const supabase = createClient();

  const invalidateTasks = () => {
    queryClient.invalidateQueries({ queryKey: ['tasks', storeId] });
  };

  const createTask = useMutation({
    mutationFn: async (data: TaskFormData & { assigner_id: string }) => {
      const { assignee_ids, due_date, ...rest } = data;
      const formattedDate = format(due_date, 'yyyy-MM-dd');

      // Create multiple tasks if multiple assignees are selected
      if (assignee_ids && assignee_ids.length > 0) {
        const tasksToInsert = assignee_ids.map(assignee_id => ({
          ...rest,
          store_id: storeId,
          due_date: formattedDate,
          assignee_id,
        }));

        const { error } = await supabase.from('tasks').insert(tasksToInsert);
        if (error) throw error;
      } else {
        // Create unassigned task
        const { error } = await supabase.from('tasks').insert({
          ...rest,
          store_id: storeId,
          due_date: formattedDate,
          assignee_id: null,
        });
        if (error) throw error;
      }
    },
    onSuccess: invalidateTasks,
  });

  const updateTask = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<TaskFormData> }) => {
      const updateData: any = { ...data };
      if (data.due_date) {
        updateData.due_date = format(data.due_date, 'yyyy-MM-dd');
      }
      // If updating from a form, we usually only edit a single assignee, or we don't allow changing assignee array for existing tasks easily.
      // Assuming form sends single assignee or we handle it gracefully.
      if (data.assignee_ids && data.assignee_ids.length > 0) {
        updateData.assignee_id = data.assignee_ids[0];
      }
      delete updateData.assignee_ids;

      const { error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidateTasks,
  });

  const toggleTaskStatus = useMutation({
    mutationFn: async ({ id, is_done }: { id: string; is_done: boolean }) => {
      const { error } = await supabase
        .from('tasks')
        .update({
          is_done,
          done_at: is_done ? new Date().toISOString() : null,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onMutate: async ({ id, is_done }) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['tasks', storeId] });

      const previousToday = queryClient.getQueryData(['tasks', storeId, 'today']);
      const previousOngoing = queryClient.getQueryData(['tasks', storeId, 'ongoing']);
      const previousOverdue = queryClient.getQueryData(['tasks', storeId, 'overdue']);

      const updateTaskInList = (list: any[]) => {
        if (!list) return list;
        return list.map(t => t.id === id ? { ...t, is_done } : t);
      };

      queryClient.setQueryData(['tasks', storeId, 'today'], updateTaskInList);
      queryClient.setQueryData(['tasks', storeId, 'ongoing'], updateTaskInList);
      queryClient.setQueryData(['tasks', storeId, 'overdue'], updateTaskInList);

      return { previousToday, previousOngoing, previousOverdue };
    },
    onError: (err, variables, context) => {
      if (context?.previousToday) queryClient.setQueryData(['tasks', storeId, 'today'], context.previousToday);
      if (context?.previousOngoing) queryClient.setQueryData(['tasks', storeId, 'ongoing'], context.previousOngoing);
      if (context?.previousOverdue) queryClient.setQueryData(['tasks', storeId, 'overdue'], context.previousOverdue);
    },
    onSettled: invalidateTasks,
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('tasks')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidateTasks,
  });

  return {
    createTask,
    updateTask,
    toggleTaskStatus,
    deleteTask,
  };
}