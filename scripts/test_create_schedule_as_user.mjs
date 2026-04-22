import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testAsUser() {
  // 1. Sign in as demo user
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'admin@leaven.com',
    password: 'password123!'
  });
  
  if (authError) {
    console.log("Auth error:", authError.message);
    return;
  }
  
  // Find a store where this user is a member
  const { data: members, error: memError } = await supabase
    .from('store_members')
    .select('id, store_id')
    .eq('user_id', authData.user.id)
    .limit(1);
    
  if (!members || members.length === 0) {
      console.log("No member found for user");
      return;
  }
  
  const memberId = members[0].id;
  const storeId = members[0].store_id;
  
  console.log("Attempting insert...");
  const { data, error } = await supabase
    .from('schedules')
    .insert({
      store_id: storeId,
      member_id: memberId,
      plan_date: '2026-04-25',
      start_time: '10:00:00',
      end_time: '19:00:00',
      schedule_type: 'regular'
    })
    .select()
    .single();
    
  console.log("Result:", data, error);
}

testAsUser();