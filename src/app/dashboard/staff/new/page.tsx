import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { hasPermission } from '@/features/auth/permissions'
import { EditStaffForm } from '@/features/staff/components/edit-staff-form'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

export default async function NewStaffPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // 쿠키에서 선택된 매장 ID 가져오기
  const cookieStore = await cookies()
  const storeId = cookieStore.get('leaven_current_store_id')?.value

  if (!storeId) redirect('/dashboard/staff')

  // 권한 체크: 상세 페이지(수정 포함)는 manage_staff 권한이 필수
  const canManage = await hasPermission(user.id, storeId, 'manage_staff')
  if (!canManage) {
    redirect('/dashboard/staff')
  }

  // 신규 등록을 위한 빈 데이터 객체
  const emptyStaff = {
    id: 'new',
    store_id: storeId,
    role: 'staff',
    status: 'active',
    name: '',
    email: '',
    phone: '',
    profile: null,
    joined_at: new Date().toISOString(),
    employment_type: 'parttime',
    wage_type: 'hourly',
    base_wage: 0,
    insurance_status: {
      employment: false,
      industrial: false,
      national: false,
      health: false
    }
  }

  return (
    <div className="flex flex-col h-full max-w-6xl mx-auto">
      <div className="flex-1 px-4 pb-6 min-h-0">
        <EditStaffForm 
          staff={emptyStaff as any} 
          storeId={storeId} 
          canManage={canManage}
          isReadOnly={false}
          isPageMode={true}
        />
      </div>
    </div>
  )
}