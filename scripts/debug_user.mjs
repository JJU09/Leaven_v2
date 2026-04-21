import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: members, error } = await supabase
    .from('store_members')
    .select('user_id, status, role_id, role_info:store_roles(name, permissions)')
    
  if (error) {
    console.error('Error fetching members:', error);
  } else {
    console.log('Members:', JSON.stringify(members, null, 2));
  }
}

main();