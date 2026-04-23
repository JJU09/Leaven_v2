import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function test() {
  const { data, error } = await supabase.from('store_members').select('id, user_id, profiles(full_name), user:profiles(full_name), profile:profiles(full_name)').limit(1)
  console.log('Data:', JSON.stringify(data, null, 2))
  console.log('Error:', error)
}
test()
