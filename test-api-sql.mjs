import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: '.env.local' });

async function run() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const sqlStr = fs.readFileSync('supabase/migrations/20260427000001_update_payroll_rls.sql', 'utf8');

  // Supabase REST API를 통해 SQL 실행하는 백도어 확인용 (대부분 환경에선 rpc 호출이 막혀있을 수 있음)
  const res = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'POST',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: sqlStr })
  });
  console.log(res.status, await res.text());
}
run();
