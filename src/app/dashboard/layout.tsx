import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardClientLayout } from '@/shared/components/layout/dashboard-layout'
import { cookies } from 'next/headers'
import { getUserStores } from '@/features/store/actions'
import { hasPermission } from '@/features/auth/permissions'

export const dynamic = 'force-dynamic'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
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

  // Set the fallback current store to the cookie if it wasn't matched
  if (currentMember && (!selectedStoreId || (currentMember.store as any)?.id !== selectedStoreId)) {
    // Next.js Server Components cannot set cookies directly via cookies().set in a layout.
    // However, we rely on the sub-pages using the same fallback logic, or we let the client
    // set the cookie when navigating. For now, just rely on consistent fallback logic.
  }

  // 상세 정보 조회를 위해 currentMember를 다시 한 번 정확하게 가져옴 (role_info 등 포함)
  // getUserStores에서 가져온 currentMember는 name과 role_info가 없으므로 다시 조회함
  const { data: memberDetail } = await supabase
    .from('store_members')
    .select(`
      id,
      user_id,
      store_id,
      status,
      name,
      role_info:store_roles(id, name, color, hierarchy_level, is_system)
    `)
    .eq('user_id', user.id)
    .eq('store_id', (currentMember.store as any).id)
    .single()

  const finalMember = (memberDetail || currentMember) as any
  const currentStore = currentMember.store as any // 타입 단언 필요할 수 있음
  const storeName = currentStore?.name || 'Leaven'
  
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

  // 현재 매장의 전체 직원 목록 조회 (우측 사이드바용)
  // currentStore가 없을 수도 있으므로 체크 필요하지만, getUserStores에서 필터링된 데이터라면 있을 것임
  // 하지만 store_id는 store 객체 안에 있는 게 아니라 member 객체 안에 있어야 하는데, getUserStores는 store_id를 반환하지 않음 (select에 없음)
  // 따라서 store.id를 사용해야 함
  const currentStoreId = currentStore?.id

  // 현재 매장의 전체 직원 목록 조회 (우측 사이드바용)
  const { data: rawStaffList } = await supabase
    .from('store_members')
    .select(`
      id,
      status,
      name,
      profile:profiles(full_name, email, avatar_url),
      role_info:store_roles(id, name, color, hierarchy_level, is_system)
    `)
    .eq('store_id', currentStoreId)
    
  // 데이터 가공 (타입 맞춤)
  const staffList = rawStaffList?.map((staff: any) => ({
    ...staff,
    profile: Array.isArray(staff.profile) ? staff.profile[0] : staff.profile,
    role_info: Array.isArray(staff.role_info) ? staff.role_info[0] : staff.role_info
  }))

  // 쿠키에서 레이아웃 설정 읽기 (키 이름 변경으로 초기화 효과)
  const layout = cookieStore.get('react-resizable-panels:layout-v10')
  
  // 캐시된 레이아웃이 있더라도 사이드바 영역(인덱스 0)이 35 미만이라면 35 이상이 되도록 보장
  let defaultLayout = layout ? JSON.parse(layout.value) : undefined
  if (defaultLayout && Array.isArray(defaultLayout) && defaultLayout.length >= 2) {
    if (defaultLayout[0] < 35) {
      defaultLayout = [35, 65];
    }
  }

  // 권한 확인
  const permissions = {
    view_staff: await hasPermission(user.id, currentStoreId, 'view_staff'),
    view_schedule: await hasPermission(user.id, currentStoreId, 'view_schedule'),
    manage_store: await hasPermission(user.id, currentStoreId, 'manage_store'),
    manage_roles: await hasPermission(user.id, currentStoreId, 'manage_roles'),
    view_attendance: await hasPermission(user.id, currentStoreId, 'view_attendance'),
    view_leave: await hasPermission(user.id, currentStoreId, 'view_leave'),
    view_tasks: await hasPermission(user.id, currentStoreId, 'view_tasks'),
    view_salary: await hasPermission(user.id, currentStoreId, 'view_salary'),
    view_dashboard: await hasPermission(user.id, currentStoreId, 'view_dashboard'),
  }

  return (
    <DashboardClientLayout
      user={{
        email: user.email!,
        full_name: finalMember.name || user.user_metadata.full_name,
        avatar_url: user.user_metadata.avatar_url,
      }}
      memberId={finalMember.id}
      role={finalRoleString}
      roleName={finalMember.role_info?.name || finalRoleString}
      roleColor={finalMember.role_info?.color}
      storeName={storeName}
      storeList={storeList}
      staffList={staffList || []}
      defaultLayout={defaultLayout}
      navCollapsedSize={4}
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
