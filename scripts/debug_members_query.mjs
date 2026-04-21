import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function run() {
  const { data: users, error: usersError } = await supabase.auth.admin.listUsers()
  if (usersError || !users.users.length) {
    console.log('Error fetching users:', usersError)
    return
  }
  const user = users.users[0]
  console.log('Testing for user:', user.email)

  // Query 1: staff/page.tsx
  const { data: m1, error: e1 } = await supabase
    .from('store_members')
    .select('store_id, status, store:stores(invite_code)')
    .eq('user_id', user.id)
  
  console.log('Query 1 (staff/page.tsx) Error:', e1?.message || 'Success')

  // Query 2: schedule/page.tsx
  const { data: m2, error: e2 } = await supabase
    .from('store_members')
    .select('id, store_id, status, store:stores(opening_hours)')
    .eq('user_id', user.id)

  console.log('Query 2 (schedule/page.tsx) Error:', e2?.message || 'Success')

  // Query 3: leave/page.tsx
  const { data: m3, error: e3 } = await supabase
    .from('store_members')
    .select('store_id, status, store:stores(leave_calc_type)')
    .eq('user_id', user.id)

  console.log('Query 3 (leave/page.tsx) Error:', e3?.message || 'Success')

  // Query 4: attendance/page.tsx
  const { data: m4, error: e4 } = await supabase
    .from('store_members')
    .select('store_id, status')
    .eq('user_id', user.id)

  console.log('Query 4 (attendance/page.tsx) Error:', e4?.message || 'Success')
}

run()