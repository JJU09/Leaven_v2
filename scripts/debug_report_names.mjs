import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkNames() {
  // 1. 김지태 직원이 포함된 store_id 하나를 가져옵니다.
  const { data: memberData } = await supabase
    .from('store_members')
    .select('*, profile:profiles(full_name)')
    .or('name.ilike.%김지태%,name.ilike.%정재의%');

  console.log('--- Store Members Query Result ---');
  console.log(JSON.stringify(memberData, null, 2));

  if (memberData && memberData.length > 0) {
    const storeId = memberData[0].store_id;
    const targetDate = new Date().toISOString().split('T')[0];

    // 2. 해당 스토어의 오늘 attendance 데이터를 가져오면서 외래키 조인을 확인합니다.
    const { data: attendanceData, error } = await supabase
      .from('store_attendance')
      .select(`
        *, 
        member:store_members!store_attendance_member_id_fkey!inner(id, name, profile:profiles(full_name))
      `)
      .eq('store_id', storeId)
      .eq('target_date', targetDate);

    console.log('--- Store Attendance Query Result ---');
    if (error) {
       console.error(error);
    } else {
       console.log(JSON.stringify(attendanceData, null, 2));
    }
    
    // 3. tasks 관련 데이터 확인
    const { data: taskData } = await supabase
      .from('tasks')
      .select('title, assignee_ids')
      .eq('store_id', storeId);
      
    console.log('--- Tasks ---');
    console.log(JSON.stringify(taskData, null, 2));
  }
}

checkNames();