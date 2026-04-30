import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function test() {
  const storeId = '9a530c97-15cc-4b05-af58-f1cf9c831afd' // default dev store?
  const startStr = '2026-04-27'
  const endStr = '2026-05-03'

  const { data: rawTasks, error } = await supabase
    .from('tasks')
    .select('id, title, status, is_done, due_date, due_time, assignee_ids')
    .eq('store_id', storeId)
    .gte('due_date', startStr)
    .lte('due_date', endStr)
    .is('deleted_at', null)

  console.log("Tasks found:", rawTasks?.length, error)
  console.log(rawTasks)
}
test()
