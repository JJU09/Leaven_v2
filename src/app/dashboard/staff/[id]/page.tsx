import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { hasPermission } from '@/features/auth/permissions'
import { getStaffList } from '@/features/staff/actions'
import { EditStaffForm } from '@/features/staff/components/edit-staff-form'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Save } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function StaffDetailPage({ params }: PageProps) {
  const { id: staffId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // 직원 정보 조회 (getStaffList를 재사용하여 전체 목록에서 해당 직원 탐색)
  // TODO: 단일 직원 조회를 위한 별도 action이 있다면 그것을 사용하는 것이 좋음
  // 일단 현재는 getStaffList에서 필터링하거나 직접 조회
  
  // 매장 ID를 알기 위해 staffId로 store_members 조회
  const { data: staffMember, error } = await supabase
    .from('store_members')
    .select('store_id, user_id')
    .eq('id', staffId)
    .single()

  if (error || !staffMember) {
    return notFound()
  }

  const storeId = staffMember.store_id

  // 권한 체크: 상세 페이지는 manage_staff 권한이 필수
  const canManage = await hasPermission(user.id, storeId, 'manage_staff')
  if (!canManage) {
    redirect('/dashboard/staff')
  }

  // 직원 상세 데이터 가져오기
  const staffList = await getStaffList(storeId)
  const staff = staffList?.find((s: any) => s.id === staffId)

  if (!staff) {
    return notFound()
  }

  return (
    <div className="flex flex-col h-full max-w-6xl mx-auto">
      <div className="flex-1 px-4 pb-6 min-h-0">
        <EditStaffForm 
          staff={staff} 
          storeId={storeId} 
          canManage={canManage}
          isReadOnly={false}
          isPageMode={true}
        />
      </div>
    </div>
  )
}