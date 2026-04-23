import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function test() {
  const { data: store, error: storeError } = await supabase.from('stores').select('id').limit(1).single()
  if (storeError) {
    console.error("Store fetch error:", storeError)
    return
  }
  
  const storeId = store.id
  console.log("Testing with storeId:", storeId)
  
  const { data: memberData, error: memberError } = await supabase
    .from('store_members')
    .select(`
      id, name, status, role_info:store_roles(name, color), profile:profiles(full_name)
    `)
    .eq('store_id', storeId)
    .neq('status', 'invited')
    
  if (memberError) {
    console.error("Member fetch error:", memberError)
    return
  }
  
  console.log("Found members:", memberData?.length)
  console.log("Sample member:", JSON.stringify(memberData?.[0], null, 2))
}

test()
