import { cn } from '@/lib/utils'
import { Sparkles, User } from 'lucide-react'
import { format } from 'date-fns'

interface ChatMessageProps {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export function ChatMessage({ role, content, timestamp }: ChatMessageProps) {
  const isAssistant = role === 'assistant'

  return (
    <div className={cn("flex gap-3 max-w-3xl", isAssistant ? "mr-auto" : "ml-auto flex-row-reverse")}>
      <div className={cn(
        "flex items-center justify-center w-8 h-8 rounded-full shrink-0",
        isAssistant ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
      )}>
        {isAssistant ? <Sparkles className="w-4 h-4" /> : <User className="w-4 h-4" />}
      </div>
      
      <div className={cn("flex flex-col gap-1", isAssistant ? "items-start" : "items-end")}>
        <div className={cn(
          "px-4 py-2.5 rounded-2xl max-w-[85%] sm:max-w-md md:max-w-xl text-sm leading-relaxed whitespace-pre-wrap",
          isAssistant 
            ? "bg-muted/50 text-foreground rounded-tl-sm border" 
            : "bg-primary text-primary-foreground rounded-tr-sm"
        )}>
          {content || (isAssistant ? <span className="animate-pulse">입력 중...</span> : '')}
        </div>
        <span className="text-[10px] text-muted-foreground px-1">
          {format(timestamp, 'HH:mm')}
        </span>
      </div>
    </div>
  )
}