import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
// We can use REST API to query pg_policy if we have a view or rpc. But we don't.
// Let's use postgres connection directly.
import pg from 'pg';
const pool = new pg.Pool({
  connectionString: 'postgresql://postgres.hjjxvjjyowufkkxlpiwk:' + process.env.SUPABASE_DB_PASSWORD + '@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres'
});
