import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const url = request.nextUrl.clone()

  // 1. 비로그인 사용자: 보호된 경로 접근 시 로그인 페이지로 리다이렉트
  if (!user && (
    request.nextUrl.pathname.startsWith('/dashboard') || 
    request.nextUrl.pathname.startsWith('/onboarding') ||
    request.nextUrl.pathname.startsWith('/home') ||
    request.nextUrl.pathname.startsWith('/account')
  )) {
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // 2. 로그인 사용자 처리
  if (user) {
    // 2.1 로그인/회원가입/루트 접근 시 홈으로 리다이렉트
    if (
      request.nextUrl.pathname.startsWith('/login') ||
      request.nextUrl.pathname.startsWith('/signup') ||
      request.nextUrl.pathname === '/'
    ) {
      url.pathname = '/home'
      return NextResponse.redirect(url)
    }

    // 2.2 프로필(이름, 전화번호) 필수 입력 체크
    // /account 경로가 아닐 때만 체크하여 무한 루프 방지
    if (!request.nextUrl.pathname.startsWith('/account')) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, phone')
        .eq('id', user.id)
        .single()

      if (!profile || !profile.full_name || !profile.phone) {
        // 이미 next 파라미터가 있다면 그걸 유지하고, 없다면 현재 접근하려던 경로를 next로 전달
        // 단, 현재 경로가 /login, /signup, / 인 경우는 제외
        const currentPath = request.nextUrl.pathname
        const currentSearch = request.nextUrl.search
        let nextParam = url.searchParams.get('next')

        if (!nextParam && !['/login', '/signup', '/', '/account'].includes(currentPath)) {
          nextParam = `${currentPath}${currentSearch}`
        }

        url.pathname = '/account'
        if (nextParam) {
          url.searchParams.set('next', nextParam)
        }
        return NextResponse.redirect(url)
      }
    }
  }

  return response
}
