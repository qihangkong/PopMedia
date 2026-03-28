import { useState, useRef, useEffect } from 'react'
import { useChat, ChatMessage } from '../contexts/ChatContext'
import {
  PlusIcon,
  MoreVerticalIcon,
  ShareIcon,
  XIcon,
  SparklesIcon,
  BrainIcon,
  ZapIcon,
  GlobeIcon,
  SettingsIcon,
  PaperclipIcon,
  SendIcon,
  ChevronRightIcon,
} from '../icons'

export default function ChatDrawer() {
  const { messages, isOpen, isLoading, error, closeChat, sendMessage, clearMessages } = useChat()
  const [inputValue, setInputValue] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const [isFast, setIsFast] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus()
    }
  }, [isOpen])

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return
    await sendMessage(inputValue)
    setInputValue('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (!isOpen) return null

  return (
    <div className="chat-float">
      {/* Header - New Design */}
      <div className="chat-header">
        <div className="chat-header-title">
          <span className="chat-header-title-text">新对话</span>
        </div>
        <div className="chat-header-actions">
          <button className="chat-header-btn" onClick={clearMessages} title="新对话">
            <PlusIcon />
          </button>
          <button className="chat-header-btn" disabled title="历史">
            <MoreVerticalIcon />
          </button>
          <button className="chat-header-btn" disabled title="分享">
            <ShareIcon />
          </button>
          <button className="chat-header-btn" onClick={closeChat} title="收起">
            <XIcon />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="chat-float-messages">
        {messages.length === 0 && (
          <div className="chat-empty">
            <div className="chat-empty-avatar">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <p className="chat-empty-title">你好！我是 AI 助手</p>
            <p className="chat-empty-hint">可以帮你创建画布节点、引用画布内容等</p>
            <div className="chat-empty-suggestions">
              <button className="chat-suggestion" onClick={() => sendMessage('帮我创建一个视频脚本节点')}>
                创建一个视频脚本节点
              </button>
              <button className="chat-suggestion" onClick={() => sendMessage('@画布 总结当前画布内容')}>
                总结当前画布内容
              </button>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {isLoading && (
          <div className="chat-message assistant">
            <div className="chat-message-avatar">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <div className="chat-message-content">
              <div className="chat-bubble loading">
                <span className="loading-dot"></span>
                <span className="loading-dot"></span>
                <span className="loading-dot"></span>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="chat-error">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <path d="m15 9-6 6"></path>
              <path d="m9 9 6 6"></path>
            </svg>
            <span>{error}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Enhanced Input */}
      <div className="chat-input-container">
        <div className="chat-input-main">
          <textarea
            ref={inputRef}
            className="chat-input-textarea"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入消息，Enter 发送，@画布 引用内容..."
            rows={1}
            disabled={isLoading}
          />
        </div>
        <div className="chat-input-toolbar">
          <div className="chat-toolbar-left">
            {/* Attachment */}
            <button className="chat-toolbar-btn" title="附件">
              <PaperclipIcon />
            </button>
            {/* Agent selector */}
            <button className="chat-toolbar-btn chat-toolbar-btn-active" title="Agent 模式">
              <SparklesIcon />
              <span className="chat-toolbar-btn-label">Agent</span>
              <ChevronRightIcon />
            </button>
            {/* Thinking mode */}
            <button
              className={`chat-toolbar-btn ${isThinking ? 'chat-toolbar-btn-active' : ''}`}
              onClick={() => setIsThinking(!isThinking)}
              title="思考模式"
            >
              <BrainIcon />
            </button>
            {/* Fast mode */}
            <button
              className={`chat-toolbar-btn ${isFast ? 'chat-toolbar-btn-active' : ''}`}
              onClick={() => setIsFast(!isFast)}
              title="快速模式"
            >
              <ZapIcon />
            </button>
            {/* Network */}
            <button className="chat-toolbar-btn" title="联网搜索">
              <GlobeIcon />
            </button>
            {/* Settings */}
            <button className="chat-toolbar-btn" title="设置">
              <SettingsIcon />
            </button>
          </div>
          <div className="chat-toolbar-right">
            <button
              className="chat-send-btn"
              onClick={handleSend}
              disabled={!inputValue.trim() || isLoading}
            >
              <SendIcon />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user'

  return (
    <div className={`chat-message ${message.role}`}>
      <div className="chat-message-avatar">
        {isUser ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        )}
      </div>
      <div className="chat-message-content">
        <div className="chat-bubble">{message.content}</div>
      </div>
    </div>
  )
}
