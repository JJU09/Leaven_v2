import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function debugPermission() {
  const storeId = '77637828-6fde-485a-830a-cafc059ca405';
  
  // 1. Get any member's user_id from this store
  const { data: members, error: mError } = await supabase
    .from('store_members')
    .select('user_id, status, role_info:store_roles(name, permissions, hierarchy_level)')
    .eq('store_id', storeId)
    .limit(1);
    
  console.log("Members:", members, mError);

  if (members && members.length > 0) {
      // 2. Call the function
      const { data, error } = await supabase.rpc('has_store_permission', {
        store_id_param: storeId,
        permission_param: 'manage_schedule'
      });
      console.log("RPC Result (Might fail if not authenticated as that user, but testing signature):", data, error);
  }
}

debugPermission();