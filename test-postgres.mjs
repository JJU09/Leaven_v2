import postgres from 'postgres';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: '.env.local' });

async function run() {
  const connUrl = process.env.SUPABASE_CONNECTION_STRING || process.env.DATABASE_URL;
  if (!connUrl) {
    console.error("No database URL found");
    return;
  }
  const sql = postgres(connUrl, { ssl: 'require' });
  try {
    const migration = fs.readFileSync('supabase/migrations/20260427000001_update_payroll_rls.sql', 'utf8');
    await sql.unsafe(migration);
    console.log("SQL executed successfully!");
  } catch (err) {
    console.error(err);
  } finally {
    await sql.end();
  }
}
run();
