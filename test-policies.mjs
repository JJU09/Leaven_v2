import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  const { rows } = await pool.query(`SELECT polname, polcmd, polqual, polwithcheck FROM pg_policy WHERE polrelid = 'public.tasks'::regclass;`);
  console.log(rows);
  pool.end();
}
run();
