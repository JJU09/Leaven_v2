'use client'

import { useAiChat, ChatMessage as ChatMessageType } from './use-ai-chat'
import { ChatMessage } from './chat-message'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Send, Sparkles } from 'lucide-react'

const QUICK_QUESTIONS = [
  "가장 자주 고장난 자산이 뭐야?",
  "이번 달 지각이 많은 직원은?",
  "미결제 거래처 현황 알려줘",
  "업무 완료율이 낮은 이유가 뭐야?"
]

interface AiChatProps {
  storeId: string
  messages: any[]
  input: string
  setInput: (value: string) => void
  isLoading: boolean
  sendMessage: (content: string) => void
  messagesEndRef: React.RefObject<HTMLDivElement | null>
}

export function AiChat({ storeId, messages, input, setInput, isLoading, sendMessage, messagesEndRef }: AiChatProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }

  return (
    <div className="flex flex-col h-full border-none overflow-hidden bg-background">
      {/* Context Bar */}
      <div className="bg-muted/30 border-b px-4 py-2.5 flex flex-col items-start gap-2">
        <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" />
          참조 데이터 (날짜별 동적 조회):
        </span>
        <div className="flex flex-wrap gap-1.5 w-full">
          {['출퇴근 현황', '자산 상태', '미결제 거래처', '업무 완료율'].map((tag, i) => (
            <span key={i} className="text-[10px] bg-background border px-2 py-0.5 rounded-full text-muted-foreground whitespace-nowrap">
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4 bg-muted/5">
        <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full pb-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center space-y-6">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <div className="space-y-2 max-w-sm">
                <h3 className="font-medium text-lg">AI 매장 매니저에게 물어보세요</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  이번 달 매장 운영 데이터에 대해 궁금한 점을 질문하시면, AI가 데이터를 분석하여 답변해 드립니다.
                </p>
              </div>
              
              <div className="flex flex-wrap justify-center gap-2 max-w-md pt-4">
                {QUICK_QUESTIONS.map((q, i) => (
                  <Button 
                    key={i} 
                    variant="outline" 
                    size="sm" 
                    className="text-xs rounded-full h-8"
                    onClick={() => sendMessage(q)}
                    disabled={isLoading}
                  >
                    {q}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg: ChatMessageType) => (
                <ChatMessage key={msg.id} {...msg} />
              ))}
              <div ref={messagesEndRef} className="h-1" />
            </>
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="p-4 bg-background border-t">
        <form 
          onSubmit={handleSubmit}
          className="flex gap-2 max-w-4xl mx-auto w-full relative"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="예: 이번 달 지출이 가장 큰 거래처는 어디야?"
            disabled={isLoading}
            className="pr-12 rounded-xl"
          />
          <Button 
            type="submit" 
            size="icon"
            disabled={!input.trim() || isLoading}
            className="absolute right-1 top-1 bottom-1 h-auto w-8 rounded-lg"
          >
            <Send className="w-4 h-4" />
            <span className="sr-only">전송</span>
          </Button>
        </form>
      </div>
    </div>
  )
}