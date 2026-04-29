import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.rpc('exec_sql', { query: `
    SELECT pg_get_expr(polqual, polrelid) as USING,
           pg_get_expr(polwithcheck, polrelid) as WITH_CHECK
    FROM pg_policy 
    WHERE polrelid = 'public.tasks'::regclass AND polname = 'Update tasks';
  ` });
  console.log(data, error);
}
check();
