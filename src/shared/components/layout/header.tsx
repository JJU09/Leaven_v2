'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { MessageSquarePlus, Sparkles } from 'lucide-react'
import { FeedbackModal } from '@/shared/components/feedback/feedback-modal'

interface HeaderProps {
  storeName: string
  storeId?: string
  onOpenAiChat?: () => void
}

export function Header({ storeName, storeId, onOpenAiChat }: HeaderProps) {
  const [isFeedbackOpen, setIsFeedbackOpen] = React.useState(false)

  return (
    <header className="relative flex h-14 items-center justify-between border-b bg-background px-4 lg:h-15">
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-max max-w-[calc(100%-8rem)] text-center">
        <h1 className="text-xl font-bold truncate">{storeName}</h1>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground"
          onClick={() => setIsFeedbackOpen(true)}
          title="버그 제보 / 건의"
        >
          <MessageSquarePlus className="w-4 h-4" />
        </Button>
        {onOpenAiChat && (
          <Button
            variant="ghost"
            size="icon"
            className="text-primary hover:text-primary/80 hover:bg-primary/10"
            onClick={onOpenAiChat}
            title="AI에게 묻기"
          >
            <Sparkles className="w-4 h-4" />
          </Button>
        )}
      </div>

      <FeedbackModal 
        open={isFeedbackOpen} 
        onOpenChange={setIsFeedbackOpen} 
        storeId={storeId}
      />
    </header>
  )
}
