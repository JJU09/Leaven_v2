import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function test() {
  const { data, error } = await supabase.from('tasks').select('*')
  console.log("All Tasks count:", data?.length)
  if (data) {
    console.log("Deleted count:", data.filter(t => t.deleted_at !== null).length)
    console.log("Undeleted count:", data.filter(t => t.deleted_at === null).length)
    console.log("Undeleted tasks due dates:", data.filter(t => t.deleted_at === null).map(t => t.due_date))
  }
}
test()
