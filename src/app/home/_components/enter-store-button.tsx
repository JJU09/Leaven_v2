'use client'

import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface EnterStoreButtonProps {
  storeId: string
}

export function EnterStoreButton({ storeId }: EnterStoreButtonProps) {
  const router = useRouter()

  const handleEnter = () => {
    // 클라이언트 사이드에서 직접 쿠키 설정 (보안상 민감한 정보가 아닌 단순 ID)
    document.cookie = `leaven_current_store_id=${storeId}; path=/; max-age=${60 * 60 * 24 * 30}` // 30일 유지
    
    // 대시보드로 이동
    router.push('/dashboard')
    router.refresh() // 변경된 쿠키를 바탕으로 서버 컴포넌트 데이터 갱신
  }

  return (
    <Button 
      onClick={handleEnter} 
      className="w-full group font-bold tracking-tight bg-slate-900 hover:bg-primary transition-all duration-300 h-9 sm:h-10 rounded-lg shadow-sm text-xs sm:text-sm" 
      variant="default" 
    >
      입장하기 
      <ArrowRight className="ml-1.5 h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 opacity-70 group-hover:opacity-100" />
    </Button>
  )
}