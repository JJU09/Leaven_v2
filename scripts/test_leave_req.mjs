import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function test() {
  const { data, error } = await supabase.from('leave_requests').select('*, member:store_members(profile:profiles(full_name))').limit(1)
  console.log('Req Data:', JSON.stringify(data, null, 2))
  console.log('Req Error:', error)

  const { data: bData, error: bErr } = await supabase.from('leave_balances').select('*, member:store_members(profile:profiles(full_name))').limit(1)
  console.log('Bal Data:', JSON.stringify(bData, null, 2))
}
test()
