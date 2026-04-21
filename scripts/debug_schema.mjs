import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function run() {
  const { data, error } = await supabase.rpc('get_store_columns')
  if (error) {
    // Alternatively just select one row from stores and print keys
    const { data: stores, error: sErr } = await supabase.from('stores').select('*').limit(1)
    if (stores && stores.length > 0) {
      console.log('Columns:', Object.keys(stores[0]))
    } else {
      console.log('Error or no stores:', sErr)
    }
  }
}

run()