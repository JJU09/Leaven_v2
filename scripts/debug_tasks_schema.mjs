import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTasksSchema() {
  const { data, error } = await supabase.rpc('get_tasks_columns_info'); // if exists
  if (error) {
    // Instead, let's query a single task and see its structure
    const { data: cols, error: err } = await supabase
      .from('tasks')
      .select('*')
      .limit(1);
    
    console.log(cols);
    console.error(err);
  }
}

checkTasksSchema();