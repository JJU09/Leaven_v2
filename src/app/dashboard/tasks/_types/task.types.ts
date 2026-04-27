export type TaskPriority = 'high' | 'normal' | 'low';

export interface Staff {
  id: string;
  name: string;
  role?: string;
}

export interface Task {
  id: string;
  store_id: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  start_time: string | null; // ISO string
  due_date: string | null; // YYYY-MM-DD
  assignee_id: string | null;
  assigner_id: string | null;
  is_done: boolean;
  done_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  
  // Joined fields
  assignee?: Staff | null;
  assigner?: Staff | null;
}

export interface TaskFormData {
  title: string;
  description: string;
  assignee_ids: string[]; // for multi-select
  start_time?: string;
  due_date: Date;
  priority: TaskPriority;
}
