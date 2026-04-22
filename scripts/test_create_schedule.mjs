import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// We need an auth user for RLS. We can't easily impersonate without signing in.
// Alternatively, we can use service_role to bypass RLS and see if schema is the issue.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
  const storeId = '77637828-6fde-485a-830a-cafc059ca405'; // replace with actual store if needed
  
  // get a member
  const { data: members } = await supabase.from('store_members').select('id, store_id').limit(1);
  if (!members || members.length === 0) return console.log("No members found");
  
  const member = members[0];
  
  const { data, error } = await supabase
    .from('schedules')
    .insert({
      store_id: member.store_id,
      member_id: member.id,
      plan_date: '2026-04-22',
      start_time: '09:00:00',
      end_time: '18:00:00',
      schedule_type: 'regular'
    })
    .select()
    .single();
    
  console.log("Insert result:", data, error);
}

testInsert();