import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  const storeId = '9a530c97-15cc-4b05-af58-f1cf9c831afd';

  const { data: rawTasks, error } = await supabase
    .from('tasks')
    .select('id, title, status, is_done, due_date, due_time')
    .eq('store_id', storeId)
    .is('deleted_at', null);

  console.log('All Tasks Count:', rawTasks?.length || 0);
  console.log(rawTasks);
}
check();
