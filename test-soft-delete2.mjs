import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.rpc('exec_sql', { query: `
    -- Switch to the assignee user and try soft delete
    SET SESSION AUTHORIZATION default;
    SET ROLE authenticated;
    SET request.jwt.claim.sub = '25882583-d553-4999-92b1-884b12efe2c4';
    SET request.jwt.claim.role = 'authenticated';
    
    -- Let's try to update the task
    UPDATE public.tasks 
    SET deleted_at = NOW() 
    WHERE id = '654eb464-aa83-45c4-bf82-534923e6dcd9'
    RETURNING id;
  ` });
  console.log(data, error);
}
check();
