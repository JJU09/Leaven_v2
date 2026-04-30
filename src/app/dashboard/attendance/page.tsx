import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { hasPermission } from '@/features/auth/permissions'
import { getStoreRoles } from '@/features/store/actions'
import { cookies } from 'next/headers'
import { AttendanceClientPage } from '@/features/attendance/components/attendance-client'
import { getTodayDateString } from '@/shared/lib/date-utils'
import { getMemberDisplayName } from '@/lib/utils'

export default async function AttendancePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Get user's store
  const { data: members } = await supabase
    .from('store_members')
    .select('store_id, status')
    .eq('user_id', user.id)

  const cookieStore = await cookies()
  const selectedStoreId = cookieStore.get('leaven_current_store_id')?.value

  let member = members?.find(m => m.store_id === selectedStoreId)

  if (!member) {
    member = members?.find(m => m.status === 'active') || members?.[0]
  }

  if (!member) redirect('/onboarding')

  // Check permissions
  const canViewAttendance = await hasPermission(user.id, member.store_id, 'view_attendance')
  const canManageAttendance = await hasPermission(user.id, member.store_id, 'manage_attendance')

  if (!canViewAttendance && !canManageAttendance) {
    return <div>접근 권한이 없습니다.</div>
  }

  const roles = await getStoreRoles(member.store_id)
  
  // 직원 목록 조회
  const { data: rawStaffList } = await supabase
    .from('store_members')
    .select(`
      id,
      user_id,
      name,
      role_info:store_roles(id, name, color, hierarchy_level),
      profile:profiles(full_name)
    `)
    .eq('store_id', member.store_id)
    .neq('status', 'invited')

  const staffList = rawStaffList?.map((staff: any) => ({
    ...staff,
    name: getMemberDisplayName(staff),
    role_info: Array.isArray(staff.role_info) ? staff.role_info[0] : staff.role_info,
  })) || []

  // 오늘 날짜 출퇴근 기록 조회
  const today = getTodayDateString()

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">출퇴근 관리</h2>
      </div>

      <AttendanceClientPage 
        storeId={member.store_id} 
        roles={roles || []} 
        staffList={staffList} 
        canManageAttendance={canManageAttendance}
        currentUserId={user.id}
        initialDate={today}
      />
    </div>
  )
}