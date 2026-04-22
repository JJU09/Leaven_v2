import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { hasPermission } from '@/features/auth/permissions'
import { getStoreRoles } from '@/features/store/actions'
import { cookies } from 'next/headers'
import { UnifiedCalendar } from '@/features/schedule/components/calendar/unified-calendar'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function UnifiedSchedulePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Get user's store
  const { data: members } = await supabase
    .from('store_members')
    .select('id, store_id, status, store:stores(operating_hours)')
    .eq('user_id', user.id)

  const cookieStore = await cookies()
  const selectedStoreId = cookieStore.get('leaven_current_store_id')?.value

  let member = members?.find(m => m.store_id === selectedStoreId)

  if (!member) {
    member = members?.find(m => m.status === 'active') || members?.[0]
  }

  if (!member) redirect('/onboarding')

  console.log(`[Schedule Page] User: ${user.id}, Store: ${member.store_id}, Status: ${member.status}`)

  // Check permissions (reusing schedule viewing permission for now)
  const canViewSchedule = await hasPermission(user.id, member.store_id, 'view_schedule')
  if (!canViewSchedule) {
    console.error(`[Schedule Page] Permission check failed`)
    return <div>접근 권한이 없습니다.</div>
  }
  console.log(`[Schedule Page] Permission check passed for view_schedule`)

  // 관리자 권한 확인 (manage_schedule)
  const canManageSchedule = await hasPermission(user.id, member.store_id, 'manage_schedule')

  const roles = await getStoreRoles(member.store_id)

  // 직원 목록 조회
  const { data: rawStaffList } = await supabase
    .from('store_members')
    .select(`
      id,
      user_id,
      name,
      profiles (full_name),
      role_info:store_roles(id, name, color, hierarchy_level)
    `)
    .eq('store_id', member.store_id)
    .neq('status', 'invited')

  const staffList = rawStaffList?.map((staff: any) => ({
    ...staff,
    name: staff.name || staff.profiles?.full_name || '이름 없음',
    role_info: Array.isArray(staff.role_info) ? staff.role_info[0] : staff.role_info,
  })) || []

  // 스케줄 데이터 및 연관 업무(체크리스트) 조회
  const { data: rawSchedules } = await supabase
    .from('schedules')
    .select(`
      id,
      start_time,
      end_time,
      memo,
      title,
      color,
      schedule_type,
      plan_date,
      member_id,
      schedule_members (
        member_id,
        member:store_members (name, user_id)
      ),
      task_assignments (
        id,
        status,
        assigned_date,
        start_time,
        end_time,
        task:tasks (
          id,
          title,
          description,
          category,
          is_routine
        )
      )
    `)
    .eq('store_id', member.store_id)

  const schedules = rawSchedules?.map((sch: any) => {
    let startIso = sch.start_time;
    if (startIso && !startIso.includes('T') && sch.plan_date) {
      startIso = `${sch.plan_date}T${startIso}`;
    }

    let endIso = sch.end_time;
    if (endIso && !endIso.includes('T') && sch.plan_date) {
      if (endIso < sch.start_time) {
        const nextDate = new Date(sch.plan_date);
        nextDate.setDate(nextDate.getDate() + 1);
        const y = nextDate.getFullYear();
        const m = String(nextDate.getMonth() + 1).padStart(2, '0');
        const d = String(nextDate.getDate()).padStart(2, '0');
        endIso = `${y}-${m}-${d}T${endIso}`;
      } else {
        endIso = `${sch.plan_date}T${endIso}`;
      }
    }

    return {
      ...sch,
      start_time: startIso,
      end_time: endIso,
      tasks: sch.task_assignments?.map((ta: any) => {
        const taskObj = Array.isArray(ta.task) ? ta.task[0] : ta.task;
        return {
          id: ta.id,
          status: ta.status,
          assigned_date: ta.assigned_date,
          start_time: ta.start_time,
          end_time: ta.end_time,
          title: taskObj?.title,
          description: taskObj?.description,
          task_type: taskObj?.category,
          is_routine: taskObj?.is_routine
        }
      }) || []
    }
  }) || []

  // 승인된 휴가 데이터 조회
  const { data: approvedLeaves } = await supabase
    .from('leave_requests')
    .select('id, member_id, start_date, end_date, leave_type, reason')
    .eq('store_id', member.store_id)
    .eq('status', 'approved')

  return (
    <div className="flex flex-col h-full flex-1 overflow-hidden">
      {/* Header Area */}
      <div className="pt-4 pb-4 px-4 border-b flex flex-col justify-center items-center bg-white md:bg-transparent md:items-start md:flex-row md:justify-between md:p-0 md:border-none md:mb-6 shrink-0">
        <div className="text-center md:text-left w-full">
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">스케줄 관리</h1>
          <p className="hidden md:block text-sm text-muted-foreground mt-1">
            근무와 업무를 통합하여 한눈에 관리합니다.
          </p>
        </div>
      </div>

      {/* Main 2-Column Layout Component */}
      <UnifiedCalendar
        storeId={member.store_id}
        roles={roles || []}
        staffList={staffList}
        schedules={schedules || []}
        storeOpeningHours={Array.isArray(member.store) ? member.store[0]?.operating_hours : (member.store as any)?.operating_hours}
        approvedLeaves={approvedLeaves || []}
        canManage={canManageSchedule}
        currentUserId={user.id}
      />
    </div>
  )
}