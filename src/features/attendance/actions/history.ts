'use server'

import { createClient } from '@/lib/supabase/server'
import { format, startOfMonth, endOfMonth } from 'date-fns'

export async function getMonthlyAttendance(storeId: string, memberId: string, monthDate: string) {
  const supabase = await createClient()
  
  const date = new Date(monthDate)
  const startDate = format(startOfMonth(date), 'yyyy-MM-dd')
  const endDate = format(endOfMonth(date), 'yyyy-MM-dd')

  const { data: memberData } = await supabase
    .from('store_members')
    .select(`
      id, 
      name, 
      role_info:store_roles(id, name, color, hierarchy_level),
      profile:profiles(full_name)
    `)
    .eq('id', memberId)
    .single()

  const { data: attendanceData } = await supabase
    .from('store_attendance')
    .select('*')
    .eq('store_id', storeId)
    .eq('member_id', memberId)
    .gte('target_date', startDate)
    .lte('target_date', endDate)

  const { data: schedulesData } = await supabase
    .from('schedules')
    .select('*')
    .eq('store_id', storeId)
    .eq('member_id', memberId)
    .gte('plan_date', startDate)
    .lte('plan_date', endDate)

  return {
    member: memberData,
    attendance: attendanceData || [],
    schedules: schedulesData || []
  }
}