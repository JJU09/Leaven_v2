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

  // user.id에 의존하는 쿼리들과 독립적인 쿠키 조회를 병렬 실행
  const [
    { data: members, error },
    { data: profile },
    cookieStore
  ] = await Promise.all([
    supabase
      .from('store_members')
      .select('role_id, status, store:stores(id, name)')
      .eq('user_id', user.id),
    supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single(),
    cookies()
  ])

  if (error || !members || members.length === 0) {
    redirect('/onboarding')
  }

  const selectedStoreId = cookieStore.get('leaven_current_store_id')?.value

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

  const userName = profile?.full_name || '관리자'

  const canManage = await hasPermission(user.id, store.id, 'manage_dashboard')

  return (
    <DashboardClient 
      storeId={store.id} 
      storeName={store.name} 
      userName={userName}
      canManage={canManage}
    />
  )
}
