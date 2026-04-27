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
      className="w-full group font-bold tracking-wide" 
      variant="default" 
      size="lg"
    >
      입장하기 
      <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
    </Button>
  )
}