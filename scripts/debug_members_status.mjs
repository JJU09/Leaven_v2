import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMembers() {
  const { data, error } = await supabase
    .from('store_members')
    .select('id, user_id, status, store_roles(name, permissions, hierarchy_level)')
    .limit(10);
    
  console.log(JSON.stringify(data, null, 2));
}

checkMembers();