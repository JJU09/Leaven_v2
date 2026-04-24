import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { formatInTimeZone } from 'date-fns-tz';
import { Task } from '../_types/task.types';

export function useTodayTasks(storeId: string) {
  return useQuery({
    queryKey: ['tasks', storeId, 'today'],
    queryFn: async () => {
      if (!storeId) return [];
      
      const supabase = createClient();
      const today = formatInTimeZone(new Date(), 'Asia/Seoul', 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          assignee:store_members!assignee_id(
            id,
            name,
            profile:profiles(full_name)
          ),
          assigner:store_members!assigner_id(
            id,
            name,
            profile:profiles(full_name)
          )
        `)
        .eq('store_id', storeId)
        .eq('due_date', today)
        .is('deleted_at', null)
        .order('is_done', { ascending: true })
        .order('priority', { ascending: true }); // Need a custom order for priority if it's text, but we'll accept db default order or sort in client

      if (error) throw error;
      
      // Transform profile data to match Staff type
      return (data as any[]).map(task => ({
        ...task,
        assignee: task.assignee ? { id: task.assignee.id, name: task.assignee.profile?.full_name || task.assignee.name || '알 수 없음' } : null,
        assigner: task.assigner ? { id: task.assigner.id, name: task.assigner.profile?.full_name || task.assigner.name || '알 수 없음' } : null,
      })) as Task[];
    },
    enabled: !!storeId,
  });
}

export function useOngoingTasks(storeId: string) {
  return useQuery({
    queryKey: ['tasks', storeId, 'ongoing'],
    queryFn: async () => {
      if (!storeId) return [];
      
      const supabase = createClient();
      const today = formatInTimeZone(new Date(), 'Asia/Seoul', 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          assignee:store_members!assignee_id(
            id,
            name,
            profile:profiles(full_name)
          ),
          assigner:store_members!assigner_id(
            id,
            name,
            profile:profiles(full_name)
          )
        `)
        .eq('store_id', storeId)
        .gt('due_date', today)
        .is('deleted_at', null)
        .order('due_date', { ascending: true });

      if (error) throw error;
      
      return (data as any[]).map(task => ({
        ...task,
        assignee: task.assignee ? { id: task.assignee.id, name: task.assignee.profile?.full_name || task.assignee.name || '알 수 없음' } : null,
        assigner: task.assigner ? { id: task.assigner.id, name: task.assigner.profile?.full_name || task.assigner.name || '알 수 없음' } : null,
      })) as Task[];
    },
    enabled: !!storeId,
  });
}

export function useOverdueTasks(storeId: string) {
  return useQuery({
    queryKey: ['tasks', storeId, 'overdue'],
    queryFn: async () => {
      if (!storeId) return [];
      
      const supabase = createClient();
      const today = formatInTimeZone(new Date(), 'Asia/Seoul', 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          assignee:store_members!assignee_id(
            id,
            name,
            profile:profiles(full_name)
          ),
          assigner:store_members!assigner_id(
            id,
            name,
            profile:profiles(full_name)
          )
        `)
        .eq('store_id', storeId)
        .lt('due_date', today)
        .eq('is_done', false)
        .is('deleted_at', null)
        .order('due_date', { ascending: true });

      if (error) throw error;
      
      return (data as any[]).map(task => ({
        ...task,
        assignee: task.assignee ? { id: task.assignee.id, name: task.assignee.profile?.full_name || task.assignee.name || '알 수 없음' } : null,
        assigner: task.assigner ? { id: task.assigner.id, name: task.assigner.profile?.full_name || task.assigner.name || '알 수 없음' } : null,
      })) as Task[];
    },
    enabled: !!storeId,
  });
}