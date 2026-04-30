import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://hjjxvjjyowufkkxlpiwk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhqanh2amp5b3d1ZmtreGxwaXdrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzAwOTk4NSwiZXhwIjoyMDkyNTg1OTg1fQ.6jB65GDb2iYkfGfayk0yhHEmqHGGycguWViTnbF2l0w'
);

async function run() {
  const { data, error } = await supabase.from('tasks').select('id, title, due_date, status').limit(20);
  console.log('Error:', error);
  console.log('Tasks:', data);
}
run();
