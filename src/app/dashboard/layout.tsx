import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardClientLayout } from '@/shared/components/layout/dashboard-layout'
import { cookies } from 'next/headers'
import { getUserStores } from '@/features/store/actions'
import { hasPermission } from '@/features/auth/permissions'
import { getMemberDisplayName } from '@/lib/utils'
import { getCachedProfile, getCachedMyMember, getCachedStaffList } from '@/lib/cache/dashboard'

export const dynamic = 'force-dynamic'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: { session } } = await supabase.auth.getSession()

  if (!user || !session?.access_token) {
    redirect('/login')
  }

  const accessToken = session.access_token

  // 1. 프로필 조회 (캐시)
  const profile = await getCachedProfile(user.id, accessToken)

  if (!profile || !profile.full_name || !profile.phone) {
    // dashboard 레이아웃에서 프로필이 미완성인 경우 /account로 리다이렉트
    redirect('/account?next=/dashboard')
  }

  // 사용자의 모든 매장 멤버 정보 조회 (매장 리스트용) - getUserStores 재사용
  const members = await getUserStores()

  if (!members || members.length === 0) {
    redirect('/onboarding')
  }

  // 쿠키에서 선택된 매장 ID 가져오기
  const cookieStore = await cookies()
  const selectedStoreId = cookieStore.get('leaven_current_store_id')?.value

  // 선택된 매장 찾기
  let currentMember = members.find(m => {
    const store = m.store as any
    return store?.id === selectedStoreId
  })

  // 없으면 첫 번째 활성 매장, 그것도 없으면 그냥 첫 번째
  if (!currentMember) {
    currentMember = members.find(m => m.status === 'active') || members[0]
  }

  const currentStore = currentMember.store as any // 타입 단언 필요할 수 있음
  const currentStoreId = currentStore?.id

  // 2. 내 상세 정보와 전체 직원 목록을 병렬로 캐시에서 조회
  const [memberDetail, rawStaffList] = await Promise.all([
    getCachedMyMember(user.id, currentStoreId, accessToken),
    getCachedStaffList(currentStoreId, accessToken)
  ])

  const finalMember = (memberDetail || currentMember) as any
  const storeName = currentStore?.name || 'ShopWork AI'
  
  const finalRoleString = finalMember.role_info?.name 
    || (Array.isArray(finalMember.role) ? finalMember.role[0]?.name : (typeof finalMember.role === 'object' ? finalMember.role?.name : finalMember.role))
    || 'staff';
  
  // 매장 리스트 데이터 가공
  const storeList = members.map(m => {
    const store = m.store as any
    // role이 string이거나 객체 배열일 수 있으므로 처리
    const roleName = Array.isArray(m.role) ? m.role[0]?.name : (typeof m.role === 'object' ? (m.role as any)?.name : m.role)
    return {
      id: store?.id as string,
      name: store?.name as string,
      role: roleName as string
    }
  }).filter(s => s.id)

  // 데이터 가공 (타입 맞춤)
  const staffList = rawStaffList?.map((staff: any) => ({
    ...staff,
    profile: Array.isArray(staff.profile) ? staff.profile[0] : staff.profile,
    role_info: Array.isArray(staff.role_info) ? staff.role_info[0] : staff.role_info
  }))

  // 권한 확인
  const permissions = {
    view_staff: await hasPermission(user.id, currentStoreId, 'view_staff'),
    view_schedule: await hasPermission(user.id, currentStoreId, 'view_schedule'),
    manage_store: await hasPermission(user.id, currentStoreId, 'manage_store'),
    manage_roles: await hasPermission(user.id, currentStoreId, 'manage_roles'),
    view_attendance: await hasPermission(user.id, currentStoreId, 'view_attendance'),
    view_leave: await hasPermission(user.id, currentStoreId, 'view_leave'),
    view_tasks: await hasPermission(user.id, currentStoreId, 'view_tasks'),
    manage_tasks: await hasPermission(user.id, currentStoreId, 'manage_tasks'),
    view_salary: await hasPermission(user.id, currentStoreId, 'view_salary'),
    view_dashboard: await hasPermission(user.id, currentStoreId, 'view_dashboard'),
    view_ai_reports: await hasPermission(user.id, currentStoreId, 'view_ai_reports'),
    view_announcements: await hasPermission(user.id, currentStoreId, 'view_announcements'),
    view_asset: await hasPermission(user.id, currentStoreId, 'view_asset'),
    view_vendor: await hasPermission(user.id, currentStoreId, 'view_vendor'),
  }

  return (
    <DashboardClientLayout
      user={{
        email: user.email!,
        full_name: finalMember ? getMemberDisplayName(finalMember) : user.user_metadata.full_name,
        avatar_url: user.user_metadata.avatar_url,
      }}
      memberId={finalMember.id}
      storeId={currentStoreId}
      role={finalRoleString}
      roleName={finalMember.role_info?.name || finalRoleString}
      roleColor={finalMember.role_info?.color}
      storeName={storeName}
      storeList={storeList}
      staffList={staffList || []}
      permissions={permissions}
    >
      {currentMember.status === 'pending_approval' && (
        <div className="mb-6 rounded-lg bg-orange-50/80 border border-orange-200 p-4 text-orange-800 flex items-start gap-3 shadow-sm dark:bg-orange-950/20 dark:border-orange-900/50 dark:text-orange-300">
          <div className="mt-0.5 shrink-0 text-orange-600 dark:text-orange-400">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
          </div>
          <div>
            <h4 className="font-semibold mb-1">매장 합류 진행 중입니다</h4>
            <p className="text-sm text-orange-700/90 dark:text-orange-300/80">현재 점주님의 최종 승인을 기다리고 있거나, 전자 근로계약서 서명이 필요할 수 있습니다. 최종 승인 전까지는 일부 기능 접근이 제한됩니다.</p>
          </div>
        </div>
      )}
      {children}
    </DashboardClientLayout>
  )
}
