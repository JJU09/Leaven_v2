'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Link2, Mail, Copy, Check, Loader2, AlertCircle } from 'lucide-react'
import { inviteRegisteredStaff } from '../actions'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface LinkStaffDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  staff: {
    id: string
    name?: string
    email?: string
  }
  storeId: string
  inviteCode?: string
}

export function LinkStaffDialog({ open, onOpenChange, staff, storeId, inviteCode }: LinkStaffDialogProps) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  const [notRegistered, setNotRegistered] = useState(false)

  useEffect(() => {
    if (open) {
      setEmail(staff.email || '')
      setNotRegistered(false)
    }
  }, [open, staff.email])

  const handleLink = async () => {
    if (!email) {
      toast.error('이메일을 입력해주세요.')
      return
    }

    setLoading(true)
    try {
      const result = await inviteRegisteredStaff(storeId, staff.id, email)
      
      if (result.error) {
        toast.error('연동 실패', { description: result.error })
      } else if (result.notRegistered) {
        setNotRegistered(true)
        toast.info('미가입 사용자', { description: '해당 이메일로 가입된 사용자가 없습니다. 초대 링크를 전달해주세요.' })
      } else {
        toast.success('초대장 발송 완료', { description: '직원에게 앱 연동 초대장을 보냈습니다. 직원이 수락하면 연동이 완료됩니다.' })
        onOpenChange(false)
      }
    } catch (err) {
      toast.error('오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const inviteUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/join/${inviteCode}?m=${staff.id}`
    : ''

  const copyToClipboard = () => {
    navigator.clipboard.writeText(inviteUrl)
    setIsCopied(true)
    toast.success('초대 링크가 복사되었습니다.')
    setTimeout(() => setIsCopied(false), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="w-5 h-5 text-primary" />
            앱 계정 연동 및 초대
          </DialogTitle>
          <DialogDescription>
            수기 등록된 직원을 실제 앱 사용자 계정과 연결합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="link-email">직원의 앱 가입 이메일</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="link-email"
                placeholder="example@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-9"
                disabled={loading || notRegistered}
              />
            </div>
          </div>

          {notRegistered && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-2 text-amber-800 text-sm">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <p>
                  해당 이메일로 가입된 사용자가 없습니다. 
                  아래 <strong>직원 전용 초대 링크</strong>를 복사해서 전달해주세요.
                  직원이 이 링크로 가입하면 자동으로 이 정보와 연동됩니다.
                </p>
              </div>
              <div className="flex gap-2">
                <Input 
                  readOnly 
                  value={inviteUrl} 
                  className="h-8 text-xs bg-white border-amber-200 focus-visible:ring-amber-500"
                />
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="h-8 border-amber-300 text-amber-700 hover:bg-amber-100 shrink-0"
                  onClick={copyToClipboard}
                >
                  {isCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span className="ml-1.5">{isCopied ? '복사됨' : '복사'}</span>
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          {!notRegistered ? (
            <Button onClick={handleLink} disabled={loading} className="w-full">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              계정 찾기 및 연동
            </Button>
          ) : (
            <Button variant="secondary" onClick={() => onOpenChange(false)} className="w-full">
              닫기
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}