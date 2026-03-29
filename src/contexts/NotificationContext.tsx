import { createContext, useContext, useState, useCallback } from 'react'

export type NotificationType = 'info' | 'success' | 'error' | 'warning'

export interface Notification {
  id: string
  type: NotificationType
  message: string
  duration?: number
}

interface NotificationContextType {
  notifications: Notification[]
  addNotification: (type: NotificationType, message: string, duration?: number) => void
  removeNotification: (id: string) => void
  error: (message: string, duration?: number) => void
  success: (message: string, duration?: number) => void
  info: (message: string, duration?: number) => void
  warning: (message: string, duration?: number) => void
}

const NotificationContext = createContext<NotificationContextType | null>(null)

function generateId(): string {
  return `notification-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])

  const addNotification = useCallback((type: NotificationType, message: string, duration = 4000) => {
    const id = generateId()
    setNotifications(prev => [...prev, { id, type, message, duration }])

    if (duration > 0) {
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== id))
      }, duration)
    }
  }, [])

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  const error = useCallback((message: string, duration?: number) => {
    addNotification('error', message, duration)
  }, [addNotification])

  const success = useCallback((message: string, duration?: number) => {
    addNotification('success', message, duration)
  }, [addNotification])

  const info = useCallback((message: string, duration?: number) => {
    addNotification('info', message, duration)
  }, [addNotification])

  const warning = useCallback((message: string, duration?: number) => {
    addNotification('warning', message, duration)
  }, [addNotification])

  return (
    <NotificationContext.Provider value={{ notifications, addNotification, removeNotification, error, success, info, warning }}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotification(): NotificationContextType {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider')
  }
  return context
}
