'use client'

import { useState } from 'react'
import { joinStoreByCode } from '@/features/onboarding/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { UserPlus, CheckCircle2 } from 'lucide-react'
import { formatPhoneNumber } from '@/lib/formatters'
import { useRouter } from 'next/navigation'

interface JoinStoreClientFormProps {
  code: string
  defaultName: string
  defaultPhone: string
}

export function JoinStoreClientForm({ code, defaultName, defaultPhone }: JoinStoreClientFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [phoneValue, setPhoneValue] = useState(formatPhoneNumber(defaultPhone))
  const router = useRouter()

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhoneValue(formatPhoneNumber(e.target.value))
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const formData = new FormData(e.currentTarget)
      const name = formData.get('name') as string
      const phone = formData.get('phone') as string
      
      const result = await joinStoreByCode(code, name, phone)
      
      if (result?.error) {
        alert(`가입 실패: ${result.error}`)
      } else {
        // 액션이 성공적일 때 수동으로 클라이언트 라우팅
        router.push('/home')
      }
    } catch (error: any) {
      alert(`오류 발생: ${error.message || "매장 합류 처리 중 문제가 발생했습니다."}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-xl space-y-4">
        <div className="flex items-center gap-2 text-blue-800 font-semibold text-sm mb-1">
          <UserPlus className="w-4 h-4" /> 내 프로필 확인
        </div>
        
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-xs font-bold text-slate-600">이름 (본명)</Label>
            <Input 
              id="name" 
              name="name" 
              placeholder="홍길동" 
              required 
              defaultValue={defaultName} 
              className="bg-white border-blue-100 focus-visible:ring-blue-500" 
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone" className="text-xs font-bold text-slate-600">전화번호</Label>
            <Input 
              id="phone" 
              name="phone" 
              value={phoneValue}
              onChange={handlePhoneChange}
              placeholder="010-1234-5678" 
              required 
              className="bg-white border-blue-100 focus-visible:ring-blue-500 font-mono" 
              maxLength={13}
            />
            <p className="text-[10px] text-muted-foreground mt-1 px-1">
              * 점장님이 입력한 번호와 일치하면 즉시 합류 승인됩니다.
            </p>
          </div>
        </div>
      </div>

      <Button 
        type="submit" 
        disabled={isLoading}
        className="w-full h-12 text-base font-bold bg-[#1D9E75] hover:bg-[#1D9E75]/90 shadow-md"
      >
        <CheckCircle2 className="w-5 h-5 mr-2" /> 
        {isLoading ? "처리 중..." : "매장 합류하기"}
      </Button>
    </form>
  )
}