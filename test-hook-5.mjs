import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function test() {
  // Just get any members from the DB to see what store they belong to
  const { data: simpleData, error: simpleError } = await supabase
    .from('store_members')
    .select('id, name, user_id, status, store_id')
    .limit(5)
    
  if (simpleError) {
    console.error("Simple fetch error:", simpleError)
    return
  }
  
  console.log("Found any members in DB:", simpleData?.length)
  console.log("Members data:", JSON.stringify(simpleData, null, 2))
}

test()
