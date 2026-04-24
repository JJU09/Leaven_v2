import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { getStoreAnnouncements } from '@/features/announcement/actions'
import { AnnouncementList } from '@/features/announcement/components/announcement-list'
import { hasPermission } from '@/features/auth/permissions'

export const dynamic = 'force-dynamic'

export default async function AnnouncementsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/home')
  }

  const { data: members, error } = await supabase
    .from('store_members')
    .select('role_id, status, store:stores(*)')
    .eq('user_id', user.id)

  if (error || !members || members.length === 0) {
    redirect('/home')
  }

  const cookieStore = await cookies()
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

  const announcements = await getStoreAnnouncements(store.id)

  const { data: storeMembers } = await supabase
    .from('store_members')
    .select('id, name, user:profiles!store_members_user_id_fkey(full_name)')
    .eq('store_id', store.id)
    .eq('status', 'active')

  const formattedMembers = (storeMembers || []).map(m => {
    const userProfile = Array.isArray(m.user) ? m.user[0] : m.user
    return {
      id: m.id,
      name: userProfile?.full_name || m.name || '이름 없음'
    }
  })

  // 권한 확인
  const [canView, canManage] = await Promise.all([
    hasPermission(user.id, store.id, 'view_announcements'),
    hasPermission(user.id, store.id, 'manage_announcements')
  ])

  if (!canView) {
    redirect('/dashboard/my-tasks')
  }

  return (
    <div className="flex flex-col gap-6 h-full p-4 md:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">인계 및 공지</h1>
          <p className="text-sm text-muted-foreground mt-1">
            매장의 중요 소식과 인수인계 사항을 공유합니다.
          </p>
        </div>
      </div>
      
      <div className="flex-1">
        <AnnouncementList
          storeId={store.id}
          announcements={announcements || []}
          canManage={canManage}
          storeMembers={formattedMembers}
        />
      </div>
    </div>
  )
}