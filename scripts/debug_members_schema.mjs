import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function run() {
  const { data: members, error: sErr } = await supabase.from('store_members').select('*').limit(1)
  if (members && members.length > 0) {
    console.log('store_members Columns:', Object.keys(members[0]))
  } else {
    console.log('Error or no members:', sErr)
  }
}

run()