import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkData() {
  const { data, error } = await supabase
    .from('store_members')
    .select('id, store_id, name, email, phone, role_id, employment_type, wage_type, base_hourly_wage, address, birth_date, insurance_status, custom_wage_settings, updated_at')
    .order('updated_at', { ascending: false })
    .limit(3)

  if (error) {
    console.error('Error fetching data:', error)
    return
  }
  
  console.log('--- Latest Updated Staff Members ---')
  console.dir(data, { depth: null })
}

checkData()
