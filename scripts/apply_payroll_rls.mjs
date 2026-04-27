import { Client } from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: '.env.local' });

async function run() {
  const connectionString = process.env.SUPABASE_DB_URL; // SUPABASE_DB_URL이 env에 있는지 확인 필요, 없으면 SUPABASE_URL 활용
  
  if (!connectionString) {
      console.log('SUPABASE_DB_URL is missing. Please set it to connect via pg.');
      process.exit(1);
  }

  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    const sql = fs.readFileSync('supabase/migrations/20260427000001_update_payroll_rls.sql', 'utf8');
    await client.query(sql);
    console.log('RLS policies updated successfully via pg!');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

run();
