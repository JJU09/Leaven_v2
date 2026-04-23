import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { hasPermission } from '@/features/auth/permissions'
import DashboardClient from './_components/DashboardClient'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  // 사용자의 매장 정보 조회
  const { data: members, error } = await supabase
    .from('store_members')
    .select('role_id, status, store:stores(*)')
    .eq('user_id', user.id)

  if (error || !members || members.length === 0) {
    redirect('/onboarding')
  }

  // 쿠키에서 선택된 매장 ID 가져오기
  const cookieStore = await cookies()
  const selectedStoreId = cookieStore.get('leaven_current_store_id')?.value

  // 선택된 매장 찾기
  let activeMember = members.find(m => {
    const storeData = m.store
    const store = Array.isArray(storeData) ? storeData[0] : storeData
    return store?.id === selectedStoreId
  })

  if (!activeMember) {
    activeMember = members.find(m => m.status === 'active') || members[0]
  }

  if (!activeMember) {
    redirect('/onboarding')
  }

  const storeData = activeMember.store
  const store = Array.isArray(storeData) ? storeData[0] : storeData
  
  if (!store) {
     redirect('/onboarding')
  }

  // 대시보드 조회 권한 확인
  const canViewDashboard = await hasPermission(user.id, store.id, 'view_dashboard')

  if (!canViewDashboard) {
    redirect('/dashboard/my-tasks')
  }

  // 유저 프로필 가져오기 (이름용)
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  const userName = profile?.full_name || '관리자'

  return (
    <DashboardClient 
      storeId={store.id} 
      storeName={store.name} 
      userName={userName} 
    />
  )
}