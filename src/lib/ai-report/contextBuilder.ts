import { SupabaseClient } from '@supabase/supabase-js'
import { getMemberDisplayName } from '@/lib/utils'

export async function fetchDailyContext(supabase: SupabaseClient, storeId: string, targetDate: string) {
  // 오늘 기준 데이터 (타겟 날짜)
  const today = new Date(targetDate)
  today.setHours(0, 0, 0, 0)
  
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const thirtyDaysLater = new Date(today)
  thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30)

  // 1. 출퇴근 현황 (UTC 시간을 KST로 보정해서 가져오기 + 스케줄 조인)
  const { data: rawAttendance } = await supabase
    .from('store_attendance')
    .select(`
      *, 
      member:store_members!inner(name, profile:profiles(full_name)),
      schedule:schedules(start_time, end_time)
    `)
    .eq('store_id', storeId)
    .eq('target_date', targetDate)

  const formatToKSTFull = (utcString: string | null) => {
    if (!utcString) return null;
    const date = new Date(utcString);
    date.setHours(date.getHours() + 9);
    return date.toISOString().replace('T', ' ').substring(0, 19) + ' (KST)';
  }

  const attendance = rawAttendance?.map(a => {
    const scheduleStartTime = Array.isArray(a.schedule) ? a.schedule[0]?.start_time : a.schedule?.start_time;
    const memberData = Array.isArray(a.member) ? a.member[0] : a.member;

    return {
      target_date: a.target_date,
      status: a.status,
      staff_name: memberData ? getMemberDisplayName(memberData as any) : '성명 미상',
      scheduled_start_time: scheduleStartTime,
      clock_in_time_kst: formatToKSTFull(a.clock_in_time),
      clock_out_time_kst: formatToKSTFull(a.clock_out_time),
      is_late: a.is_late || false
    }
  })

  // 2. 해당일 연차
  const { data: leaves } = await supabase
    .from('leave_requests')
    .select('*, profiles:user_id(full_name)')
    .eq('store_id', storeId)
    .eq('status', 'approved')
    .lte('start_date', targetDate)
    .gte('end_date', targetDate)

  // 3. 오늘 업무 현황
  const { data: rawTasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('store_id', storeId)
    .eq('due_date', targetDate)
    .is('deleted_at', null)

  const { data: storeMembers } = await supabase
    .from('store_members')
    .select('id, name, profile:profiles(full_name)')
    .eq('store_id', storeId)

  const memberMap = new Map(storeMembers?.map(m => [m.id, getMemberDisplayName(m)]) || [])

  const tasks = rawTasks?.map(t => {
    const assignees = t.assignee_ids as string[] || [];
    const staffNames = assignees.map(id => memberMap.get(id) || '성명 미상');

    return {
      title: t.title,
      is_done: t.is_done,
      due_time: t.due_time,
      assignees: staffNames
    }
  })

  // 4. 자산 점검 임박 (30일 이내)
  const { data: assets } = await supabase
    .from('store_assets')
    .select('name, next_inspection_date, warranty_expiry_date, status')
    .eq('store_id', storeId)
    .is('deleted_at', null)
    .or(`next_inspection_date.lte.${thirtyDaysLater.toISOString()},warranty_expiry_date.lte.${thirtyDaysLater.toISOString()}`)

  // 5. 미결제 거래
  const { data: vendorTransactions } = await supabase
    .from('vendor_transactions')
    .select('amount, transaction_date, vendors(name), payment_status')
    .eq('store_id', storeId)
    .in('payment_status', ['unpaid', 'partial'])
    .is('deleted_at', null)

  return {
    date: targetDate,
    attendance: {
      total: attendance?.length || 0,
      present: attendance?.filter(a => ['working', 'completed'].includes(a.status)).length || 0,
      late: attendance?.filter(a => a.is_late).length || 0,
      absent: attendance?.filter(a => a.status === 'absent').length || 0,
      onLeave: leaves?.length || 0,
      records: attendance || []
    },
    tasks: {
      total: tasks?.length || 0,
      done: tasks?.filter(t => t.is_done).length || 0,
      overdue: tasks?.filter(t => !t.is_done && t.due_time && new Date(`${targetDate}T${t.due_time}`) < new Date()).length || 0,
      records: tasks || []
    },
    assets: {
      urgent: assets || []
    },
    unpaidTransactions: {
      count: vendorTransactions?.length || 0,
      totalAmount: vendorTransactions?.reduce((sum, t) => sum + (Number(t.amount) || 0), 0) || 0,
      items: vendorTransactions || []
    }
  }
}