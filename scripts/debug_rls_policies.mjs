import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role for raw queries if needed, but let's try RPC or simple select

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
  const { data, error } = await supabase.rpc('get_policies_raw', {}).catch(() => ({ data: null, error: 'No RPC' }));
  
  if (error || !data) {
     // fallback to query
     const { data: res, error: err } = await supabase
        .from('store_roles')
        .select('id, name').limit(1);
     console.log('Test select:', { data: res, error: err });
  } else {
     console.log(data);
  }
}

main()
