import { useState, useRef, useEffect } from 'react'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

const getKSTDateString = () => {
  const d = new Date()
  d.setHours(d.getHours() + 9)
  return d.toISOString().split('T')[0]
}

export function useAiChat(storeId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, newMessage])
    setInput('')
    setIsLoading(true)

    // AI 응답용 임시 메시지 추가
    const assistantMessageId = (Date.now() + 1).toString()
    setMessages(prev => [
      ...prev,
      {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date()
      }
    ])

    try {
      // 최근 10개 메시지만 전송
      const chatHistory = messages.slice(-10).map(m => ({
        role: m.role,
        content: m.content
      }))
      
      chatHistory.push({ role: 'user', content })

      const response = await fetch('/api/ai-report/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId, messages: chatHistory, clientDate: getKSTDateString() }),
      })

      if (!response.ok) {
        throw new Error('응답을 받지 못했습니다.')
      }

      if (!response.body) throw new Error('Response body is null')

      const reader = response.body.getReader()
      const decoder = new TextDecoder('utf-8')
      let done = false
      let buffer = ''

      while (!done) {
        const { value, done: doneReading } = await reader.read()
        done = doneReading
        
        if (value) {
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const raw = line.slice(6).trim()
              if (raw === '[DONE]') continue

              setMessages(prev => 
                prev.map(msg => {
                  if (msg.id !== assistantMessageId) return msg

                  if (raw.startsWith('[TOOL:')) {
                    const label = raw.slice(6, -1)
                    return { ...msg, content: `🔍 ${label}...` }
                  } else {
                    return { 
                      ...msg, 
                      content: msg.content.startsWith('🔍') ? raw : msg.content + raw 
                    }
                  }
                })
              )
            }
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error)
      setMessages(prev => 
        prev.map(msg => 
          msg.id === assistantMessageId 
            ? { ...msg, content: '죄송합니다. 오류가 발생하여 답변을 생성하지 못했습니다.' }
            : msg
        )
      )
    } finally {
      setIsLoading(false)
    }
  }

  return {
    messages,
    input,
    setInput,
    isLoading,
    sendMessage,
    messagesEndRef
  }
}