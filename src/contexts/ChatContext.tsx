import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { sendChatMessage } from '../utils/chatApi'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
}

interface ChatContextType {
  messages: ChatMessage[]
  isOpen: boolean
  isLoading: boolean
  error: string | null
  openChat: () => void
  closeChat: () => void
  toggleChat: () => void
  sendMessage: (content: string) => Promise<void>
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void
  clearMessages: () => void
}

const ChatContext = createContext<ChatContextType | undefined>(undefined)

function generateId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

export function ChatProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const openChat = useCallback(() => setIsOpen(true), [])
  const closeChat = useCallback(() => setIsOpen(false), [])
  const toggleChat = useCallback(() => setIsOpen((prev) => !prev), [])

  const clearMessages = useCallback(() => {
    setMessages([])
    setError(null)
  }, [])

  const addMessage = useCallback((message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const newMessage: ChatMessage = {
      id: generateId(),
      timestamp: Date.now(),
      ...message,
    }
    setMessages((prev) => [...prev, newMessage])
  }, [])

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return

    const userMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: content.trim(),
      timestamp: Date.now(),
    }

    setMessages((prev) => [...prev, userMessage])
    setIsLoading(true)
    setError(null)

    try {
      const response = await sendChatMessage(content.trim())

      const assistantMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: response,
        timestamp: Date.now(),
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '发送消息失败'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [isLoading])

  return (
    <ChatContext.Provider
      value={{
        messages,
        isOpen,
        isLoading,
        error,
        openChat,
        closeChat,
        toggleChat,
        sendMessage,
        addMessage,
        clearMessages,
      }}
    >
      {children}
    </ChatContext.Provider>
  )
}

export function useChat() {
  const context = useContext(ChatContext)
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider')
  }
  return context
}
