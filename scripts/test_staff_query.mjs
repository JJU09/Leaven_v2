import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function run() {
  const { data, error } = await supabase
    .from('store_members')
    .select(`
      id, user_id, role_id, status, store_id, wage_type,
      base_hourly_wage, base_monthly_wage, joined_at,
      profile:profiles(full_name, email, avatar_url),
      role_info:store_roles(id, name, color, hierarchy_level, is_system)
    `)
    .limit(1)
  
  console.log('Error:', error)
  if (data) console.log('Data fetched successfully')
}

run()
