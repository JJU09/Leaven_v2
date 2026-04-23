import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function test() {
  const { data: store, error: storeError } = await supabase.from('stores').select('id').limit(1).single()
  if (storeError) {
    console.error("Store fetch error:", storeError)
    return
  }
  
  const storeId = store.id
  console.log("Testing with storeId:", storeId)
  
  // Try simple query first
  const { data: simpleData, error: simpleError } = await supabase
    .from('store_members')
    .select('id, name, user_id, status')
    .eq('store_id', storeId)
    
  if (simpleError) {
    console.error("Simple fetch error:", simpleError)
    return
  }
  
  console.log("Found members with simple query:", simpleData?.length)
  console.log("Members data:", JSON.stringify(simpleData, null, 2))
}

test()
