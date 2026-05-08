import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AccountSettingsForm } from '@/features/auth/components/account-settings-form'

interface ProfileOnboardingPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function ProfileOnboardingPage({ searchParams }: ProfileOnboardingPageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('full_name, phone, user_type')
    .eq('id', user.id)
    .maybeSingle() // single() 대신 maybeSingle()을 사용하여 결과가 없을 때 에러 방지

  if (profileError) {
    console.error('[ProfileOnboardingPage] Error fetching profile:', profileError)
  }

  // 이미 프로필이 완성되어 있다면 다음 단계로 이동
  if (profile?.full_name && profile?.phone && profile?.user_type) {
    const { next: nextParam } = await searchParams
    const next = typeof nextParam === 'string' ? nextParam : '/onboarding'
    redirect(next)
  }

  return (
    <Card className="shadow-lg border bg-white dark:bg-gray-800">
      <CardHeader className="space-y-1 p-6 pb-2">
        <CardTitle className="text-2xl font-bold">환영합니다! 🎉</CardTitle>
        <CardDescription>
          서비스 이용을 위해 기본 프로필 정보를 입력해주세요.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6 pt-2">
        <AccountSettingsForm 
          user={user} 
          profile={profile} 
          isOnboarding={true} 
        />
      </CardContent>
    </Card>
  )
}