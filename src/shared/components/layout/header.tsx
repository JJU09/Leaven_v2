'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { MessageSquarePlus } from 'lucide-react'
import { FeedbackModal } from '@/shared/components/feedback/feedback-modal'

interface HeaderProps {
  storeName: string
  storeId?: string
}

export function Header({ storeName, storeId }: HeaderProps) {
  const [isFeedbackOpen, setIsFeedbackOpen] = React.useState(false)

  return (
    <header className="relative flex h-14 items-center justify-between border-b bg-background px-4 lg:h-15">
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-max max-w-[calc(100%-8rem)] text-center">
        <h1 className="text-xl font-bold truncate">{storeName}</h1>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="hidden sm:flex items-center gap-2 text-muted-foreground hover:text-foreground"
          onClick={() => setIsFeedbackOpen(true)}
        >
          <MessageSquarePlus className="w-4 h-4" />
          <span>의견 보내기</span>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="flex sm:hidden text-muted-foreground hover:text-foreground"
          onClick={() => setIsFeedbackOpen(true)}
          title="의견 보내기"
        >
          <MessageSquarePlus className="w-4 h-4" />
        </Button>
      </div>

      <FeedbackModal 
        open={isFeedbackOpen} 
        onOpenChange={setIsFeedbackOpen} 
        storeId={storeId}
      />
    </header>
  )
}
