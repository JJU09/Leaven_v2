import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function test() {
  const { data, error } = await supabase.from('store_members').select('id, user_id, name, profiles(full_name)').not('user_id', 'is', null).limit(1)
  console.log('Data:', JSON.stringify(data, null, 2))
  console.log('Error:', error)
}
test()
