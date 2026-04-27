'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { headers, cookies } from 'next/headers'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: (formData.get('email') as string)?.trim().toLowerCase(),
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    return { error: error.message }
  }

  const nextUrl = formData.get('nextUrl') as string || '/home'

  revalidatePath('/', 'layout')
  redirect(nextUrl)
}

export async function updatePasswordSettings(formData: FormData) {
  const supabase = await createClient()
  const password = formData.get('password') as string
  const passwordConfirm = formData.get('passwordConfirm') as string

  if (password !== passwordConfirm) {
    return { error: '비밀번호가 일치하지 않습니다.' }
  }

  const { error } = await supabase.auth.updateUser({
    password: password,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  return { message: '비밀번호가 변경되었습니다.' }
}

export async function updateProfile(formData: FormData) {
  const supabase = await createClient()
  const fullName = formData.get('fullName') as string
  const phone = formData.get('phone') as string

  // 1. auth_users 메타데이터 업데이트 (full_name)
  const { data: { user }, error: authError } = await supabase.auth.updateUser({
    data: { full_name: fullName },
  })

  if (authError) {
    return { error: authError.message }
  }

  if (user) {
    // 2. profiles 테이블 직접 업데이트 (phone, full_name 보장)
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        email: user.email,
        full_name: fullName,
        phone: phone || null,
      }, { onConflict: 'id' })

    if (profileError) {
      return { error: '프로필 정보 업데이트에 실패했습니다.' }
    }
  }

  const nextUrl = formData.get('nextUrl') as string

  revalidatePath('/', 'layout')
  
  if (nextUrl && nextUrl !== '/account') {
    redirect(nextUrl)
  }

  return { message: '프로필이 업데이트되었습니다.' }
}

export async function signup(formData: FormData) {
  const supabase = await createClient()
  const origin = (await headers()).get('origin')

  const email = (formData.get('email') as string)?.trim().toLowerCase()
  const password = formData.get('password') as string
  const fullName = formData.get('fullName') as string
  // const phone = formData.get('phone') as string
  const nextUrl = formData.get('nextUrl') as string || '/home'

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(nextUrl)}`,
      data: {
        full_name: fullName,
        // phone: phone || null,
      },
    },
  })

  if (error) {
    return { error: '회원가입 중 오류가 발생했습니다. 다시 시도해주세요.' }
  }

  // 회원가입 직후 자동 로그인 방지를 위해 명시적 로그아웃 처리
  await supabase.auth.signOut()

  revalidatePath('/', 'layout')
  return { message: '회원가입이 완료되었습니다. 로그인해주세요.' }
}

export async function signInWithGoogle(formData?: FormData) {
  const supabase = await createClient()
  const origin = (await headers()).get('origin')
  
  const nextUrl = formData?.get('nextUrl') as string || '/home'

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(nextUrl)}`,
    },
  })

  if (error) {
    return { error: error.message }
  }

  if (data.url) {
    redirect(data.url)
  }
}

export async function signInWithKakao(formData?: FormData) {
  const supabase = await createClient()
  const origin = (await headers()).get('origin')
  
  const nextUrl = formData?.get('nextUrl') as string || '/home'

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'kakao',
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(nextUrl)}`,
    },
  })

  if (error) {
    return { error: error.message }
  }

  if (data.url) {
    redirect(data.url)
  }
}

export async function logout(formData?: FormData) {
  const supabase = await createClient()
  const { error } = await supabase.auth.signOut()

  if (error) {
    // throw error instead of returning object to match form action signature void
    throw new Error(error.message)
  }

  const cookieStore = await cookies()
  cookieStore.delete('leaven_current_store_id')

  revalidatePath('/', 'layout')
  redirect('/login')
}

export async function resetPassword(formData: FormData) {
  const supabase = await createClient()
  const origin = (await headers()).get('origin')
  const email = (formData.get('email') as string)?.trim().toLowerCase()

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/update-password`,
  })

  if (error) {
    return { error: error.message }
  }

  return { message: 'Check email to continue sign in process' }
}

export async function updatePassword(formData: FormData) {
  const supabase = await createClient()
  const password = formData.get('password') as string
  const passwordConfirm = formData.get('passwordConfirm') as string

  if (password !== passwordConfirm) {
    return { error: '비밀번호가 일치하지 않습니다.' }
  }

  const { error } = await supabase.auth.updateUser({
    password: password,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect('/home')
}
