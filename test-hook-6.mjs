import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function test() {
  const storeId = "0f08f1d7-6409-4d92-b777-7c37c7fc333f"
  
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
  
  console.log("Query with profiles join:")
  console.log("Found members:", memberData?.length)
  console.log("Members data:", JSON.stringify(memberData, null, 2))
}

test()
