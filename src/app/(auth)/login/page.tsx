import { LoginForm } from '@/features/auth/components/login-form'

export default async function LoginPage(props: { searchParams?: Promise<{ next?: string; email?: string }> }) {
  const searchParams = await props.searchParams
  const nextUrl = searchParams?.next || '/home'
  const email = searchParams?.email || ''
  
  return <LoginForm nextUrl={nextUrl} defaultEmail={email} />
}
