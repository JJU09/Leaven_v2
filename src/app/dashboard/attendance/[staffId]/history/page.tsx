import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { HistoryClientPage } from './history-client'

interface PageProps {
  params: Promise<{ staffId: string }>
}

export default async function StaffHistoryPage({ params }: PageProps) {
  const { staffId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const cookieStore = await cookies()
  const selectedStoreId = cookieStore.get('leaven_current_store_id')?.value

  if (!selectedStoreId) redirect('/dashboard')

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <HistoryClientPage storeId={selectedStoreId} staffId={staffId} />
    </div>
  )
}