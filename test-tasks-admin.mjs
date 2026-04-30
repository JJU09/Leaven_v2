import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function test() {
  const { data, error } = await supabase.from('tasks').select('*')
  console.log("All Tasks count:", data?.length)
  if (data) {
    console.log("Deleted count:", data.filter(t => t.deleted_at !== null).length)
    console.log("Undeleted count:", data.filter(t => t.deleted_at === null).length)
    console.log("Undeleted tasks:", data.filter(t => t.deleted_at === null).map(t => ({id: t.id, due_date: t.due_date, title: t.title})))
  }
}
test()
