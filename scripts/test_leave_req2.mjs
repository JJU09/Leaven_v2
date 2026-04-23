import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function test() {
  const { data, error } = await supabase.from('leave_requests').select('*, member:store_members!leave_requests_member_id_fkey(profile:profiles(full_name), role:store_roles(name))').limit(1)
  console.log('Req Data:', JSON.stringify(data, null, 2))
  console.log('Req Error:', error)
}
test()
