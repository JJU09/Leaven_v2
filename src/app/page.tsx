import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  CalendarDays, 
  Store, 
  Users, 
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Package2,
  ClipboardList,
  Calculator,
  ShieldCheck,
  Smartphone
} from "lucide-react"
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function LandingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/home')
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="container flex h-14 items-center justify-between mx-auto">
          <div className="flex items-center gap-2 font-bold text-xl">
            <Store className="h-6 w-6 text-primary" />
            <span>ShopWork AI</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/login">
              <Button size="sm">로그인</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48 bg-linear-to-b from-white to-gray-50 dark:from-gray-950 dark:to-gray-900">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none bg-clip-text text-transparent bg-linear-to-r from-gray-900 to-gray-600 dark:from-gray-100 dark:to-gray-400">
                  매장 운영의 모든 것, <br className="hidden sm:inline" />
                  AI와 함께 더 스마트하게
                </h1>
                <p className="mx-auto max-w-225 text-gray-500 md:text-xl dark:text-gray-400 md:whitespace-nowrap">
                  인사/급여부터 업무 관리, 자산 현황까지. <br className="inline sm:hidden" /> ShopWork AI가 매장 운영의 표준을 제시합니다.
                </p>
              </div>
              <div className="space-x-4">
                <Link href="/login">
                  <Button size="lg" className="h-11 px-8">
                    지금 무료로 시작하기 <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-white dark:bg-gray-950">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <div className="inline-block rounded-lg bg-gray-100 px-3 py-1 text-sm dark:bg-gray-800">
                  Key Modules
                </div>
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">
                  강력한 매장 통합 관리 모듈
                </h2>
                <p className="max-w-225 text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-gray-400">
                  ShopWork AI는 실제 매장 현장에서 필요한 모든 기능을 하나의 플랫폼에 담았습니다.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-2 mt-12">
              <Card className="relative overflow-hidden border-2 transition-all hover:border-primary/50">
                <CardHeader>
                  <Calculator className="h-10 w-10 text-primary mb-2" />
                  <CardTitle>인사 및 급여 관리</CardTitle>
                  <CardDescription>
                    직원 등록부터 출퇴근, 휴가 관리, 그리고 복잡한 급여 정산까지 한 번에 해결하세요.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="grid gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" /> 전자 근로계약서 및 직원 프로필
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" /> 실시간 출퇴근 기록 및 연차 관리
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" /> 시급/주휴수당 자동 급여 계산
                    </li>
                  </ul>
                </CardContent>
              </Card>
              <Card className="relative overflow-hidden border-2 transition-all hover:border-primary/50">
                <CardHeader>
                  <ClipboardList className="h-10 w-10 text-primary mb-2" />
                  <CardTitle>스케줄 및 업무 관리</CardTitle>
                  <CardDescription>
                    효율적인 근무표 작성과 명확한 업무 지시로 매장 운영의 미스를 줄입니다.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="grid gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" /> 드래그 앤 드롭 스마트 스케줄러
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" /> 일일 업무 체크리스트 및 상태 추적
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" /> 실시간 공지 및 업무 인계사항
                    </li>
                  </ul>
                </CardContent>
              </Card>
              <Card className="relative overflow-hidden border-2 transition-all hover:border-primary/50">
                <CardHeader>
                  <Package2 className="h-10 w-10 text-primary mb-2" />
                  <CardTitle>자산 및 거래처 관리</CardTitle>
                  <CardDescription>
                    매장의 소중한 자산과 복잡한 거래처 정보를 체계적으로 기록하고 추적합니다.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="grid gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" /> 비품 및 매장 자산 현황 관리
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" /> 거래처 연락처 및 계약 정보 통합
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" /> 비품 소모 내역 기록
                    </li>
                  </ul>
                </CardContent>
              </Card>
              <Card className="relative overflow-hidden border-2 border-primary/20 bg-primary/5 transition-all hover:border-primary/50">
                <div className="absolute top-0 right-0 p-4">
                  <Sparkles className="h-6 w-6 text-primary animate-pulse" />
                </div>
                <CardHeader>
                  <Sparkles className="h-10 w-10 text-primary mb-2" />
                  <CardTitle>스마트 AI 리포트</CardTitle>
                  <CardDescription>
                    매장 운영 데이터를 분석하여 사장님께 꼭 필요한 인사이트를 제공합니다.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="grid gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" /> 주간/월간 운영 요약 리포트
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" /> 인건비 및 운영 효율 분석
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" /> AI 기반 맞춤형 개선 제안
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Value Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-gray-50 dark:bg-gray-900">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="grid gap-12 lg:grid-cols-2 items-center">
              <div className="space-y-4">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">
                  모두가 만족하는 <br /> 매장 관리 경험
                </h2>
                <p className="text-gray-500 dark:text-gray-400">
                  ShopWork AI는 매장을 운영하는 사장님과 현장에서 일하는 직원 모두를 위해 설계되었습니다.
                </p>
                <div className="grid gap-6 mt-8">
                  <div className="flex items-start gap-4">
                    <div className="mt-1 bg-primary/10 p-2 rounded-lg">
                      <ShieldCheck className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-bold">사장님을 위한 안심 관리</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">법적 기준을 준수하는 급여 정산과 투명한 업무 보고로 매장 관리에 대한 걱정을 덜어드립니다.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="mt-1 bg-primary/10 p-2 rounded-lg">
                      <Smartphone className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-bold">직원을 위한 간편 업무</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">내 스케줄과 급여를 모바일로 언제든 확인하고, 해야 할 업무를 명확하게 파악할 수 있습니다.</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="relative aspect-video rounded-xl overflow-hidden shadow-2xl border-8 border-white dark:border-gray-800">
                <Image 
                  src="/dashboard.png" 
                  alt="ShopWork AI 대시보드 미리보기" 
                  fill
                  className="object-cover"
                  priority
                />
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-gray-100 dark:bg-gray-800">
          <div className="container grid items-center justify-center gap-4 px-4 text-center md:px-6 mx-auto">
            <div className="space-y-3">
              <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight">
                지금 바로 시작하세요
              </h2>
              <p className="mx-auto max-w-150 text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-gray-400">
                복잡한 설치 없이 웹에서 바로 사용할 수 있습니다.
              </p>
            </div>
            <div className="mx-auto w-full max-w-sm space-y-2">
              <Link href="/login">
                <Button size="lg" className="w-full">
                  무료로 시작하기
                </Button>
              </Link>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                신용카드 정보 입력 없이 14일간 무료 체험 가능합니다.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          © 2026 ShopWork AI Inc. All rights reserved.
        </p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <Link className="text-xs hover:underline underline-offset-4" href="#">
            Terms of Service
          </Link>
          <Link className="text-xs hover:underline underline-offset-4" href="#">
            Privacy
          </Link>
        </nav>
      </footer>
    </div>
  )
}