import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { hasPermission } from '@/features/auth/permissions'
import { cookies } from 'next/headers'
import AiReportClient from './_components/ai-report-client'

export const dynamic = 'force-dynamic'

export default async function AiReportPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const cookieStore = await cookies()
  const currentStoreId = cookieStore.get('leaven_current_store_id')?.value

  if (!currentStoreId) {
    redirect('/dashboard')
  }

  const canViewAiReports = await hasPermission(user.id, currentStoreId, 'view_ai_reports')

  if (!canViewAiReports) {
    redirect('/dashboard')
  }

  return (
    <div className="flex flex-col gap-6 h-full max-w-6xl mx-auto w-full">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">AI 리포트</h1>
        <p className="text-muted-foreground">
          매장 운영 데이터를 기반으로 생성된 AI 분석 리포트와 인사이트를 확인하세요.
        </p>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden rounded-xl border bg-background shadow-sm">
        <AiReportClient storeId={currentStoreId} />
      </div>
    </div>
  )
}