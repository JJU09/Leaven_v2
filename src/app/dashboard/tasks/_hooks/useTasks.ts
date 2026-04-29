import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { formatInTimeZone } from 'date-fns-tz';
import { Task } from '../_types/task.types';
import { getMemberDisplayName } from '@/lib/utils';

export type DaySummary = {
  date: string;
  total: number;
  completed: number;
  hasOverdue: boolean;
};

export function useMonthlyTaskSummary(storeId: string, year: number, month: number) {
  return useQuery({
    queryKey: ['tasks', storeId, 'monthly-summary', year, month],
    queryFn: async () => {
      if (!storeId) return {};
      
      const supabase = createClient();
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      
      const { data, error } = await supabase
        .from('tasks')
        .select('id, due_date, is_done')
        .eq('store_id', storeId)
        .gte('due_date', startDate)
        .lte('due_date', endDate)
        .is('deleted_at', null);

      if (error) throw error;

      const summary: Record<string, DaySummary> = {};
      
      data.forEach(task => {
        const date = task.due_date;
        if (!summary[date]) {
          summary[date] = { date, total: 0, completed: 0, hasOverdue: false };
        }
        summary[date].total += 1;
        if (task.is_done) {
          summary[date].completed += 1;
        }
      });

      const todayStr = formatInTimeZone(new Date(), 'Asia/Seoul', 'yyyy-MM-dd');
      Object.keys(summary).forEach(date => {
        if (date < todayStr && summary[date].completed < summary[date].total) {
          summary[date].hasOverdue = true;
        }
      });

      return summary;
    },
    enabled: !!storeId,
  });
}

export function useTasksByDate(storeId: string, dateStr: string) {
  return useQuery({
    queryKey: ['tasks', storeId, 'by-date', dateStr],
    queryFn: async () => {
      if (!storeId || !dateStr) return [];
      
      const supabase = createClient();
      
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
        .eq('due_date', dateStr)
        .is('deleted_at', null)
        .order('is_done', { ascending: true })
        .order('priority', { ascending: true });

      if (error) throw error;
      
      return (data as any[]).map(task => ({
        ...task,
        assignee: task.assignee ? { id: task.assignee.id, name: getMemberDisplayName(task.assignee) } : null,
        assigner: task.assigner ? { id: task.assigner.id, name: getMemberDisplayName(task.assigner) } : null,
      })) as Task[];
    },
    enabled: !!storeId && !!dateStr,
  });
}

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
        assignee: task.assignee ? { id: task.assignee.id, name: getMemberDisplayName(task.assignee) } : null,
        assigner: task.assigner ? { id: task.assigner.id, name: getMemberDisplayName(task.assigner) } : null,
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
        assignee: task.assignee ? { id: task.assignee.id, name: getMemberDisplayName(task.assignee) } : null,
        assigner: task.assigner ? { id: task.assigner.id, name: getMemberDisplayName(task.assigner) } : null,
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
        assignee: task.assignee ? { id: task.assignee.id, name: getMemberDisplayName(task.assignee) } : null,
        assigner: task.assigner ? { id: task.assigner.id, name: getMemberDisplayName(task.assigner) } : null,
      })) as Task[];
    },
    enabled: !!storeId,
  });
}