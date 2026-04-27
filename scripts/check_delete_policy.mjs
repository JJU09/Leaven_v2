import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

async function main() {
  const { data, error } = await supabase.rpc('get_policies_raw').catch(() => ({ data: null, error: 'No RPC' }));
  if (error) {
     console.log('Cant use RPC, trying postgres connection directly is better.')
  }
}
main()
