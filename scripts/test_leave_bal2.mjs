import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function test() {
  const { data, error } = await supabase.from('leave_balances').select('*, member:store_members!inner(id, status, profile:profiles(full_name))').eq('member.status', 'active').limit(1)
  console.log('Bal Data:', JSON.stringify(data, null, 2))
  console.log('Error:', error)
}
test()
