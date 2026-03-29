import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useReactFlow } from '@xyflow/react'
import { useChat, type ChatMessage } from '../contexts/ChatContext'
import { AIExecutionEngine, ChatMode } from '../services/AIExecutionEngine'
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
  const { messages, isOpen, isLoading, error, closeChat, sendMessage, addMessage, clearMessages } = useChat()
  const [inputValue, setInputValue] = useState('')
  const [showNodeList, setShowNodeList] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const { getNodes } = useReactFlow()

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus()
    }
  }, [isOpen])

  // 解析消息中的 @节点 引用
  const parseNodeMentions = useCallback((input: string): { cleanInput: string; nodeIds: string[] } => {
    const nodeIds: string[] = []
    let lastIndex = 0
    let cleanParts: string[] = []

    for (const match of input.matchAll(/@(\S+)/g)) {
      nodeIds.push(match[1])
      cleanParts.push(input.slice(lastIndex, match.index))
      lastIndex = match.index! + match[0].length
    }
    cleanParts.push(input.slice(lastIndex))

    return {
      cleanInput: cleanParts.join('').trim(),
      nodeIds,
    }
  }, [])

  // 处理发送消息
  const handleSend = async () => {
    if (!inputValue.trim() || isLoading || aiLoading) return

    const { cleanInput, nodeIds } = parseNodeMentions(inputValue)

    // 如果有节点引用，使用跨节点模式
    if (nodeIds.length > 0) {
      setAiLoading(true)
      try {
        const result = await AIExecutionEngine.execute({
          mode: ChatMode.CROSS_NODE,
          userInput: cleanInput,
          mentionNodeIds: nodeIds,
          nodes: getNodes(),
        })

        // 将结果作为助手消息添加
        addMessage({
          role: 'assistant',
          content: result,
        })
      } catch (err) {
        console.error('Cross-node execution failed:', err)
      } finally {
        setAiLoading(false)
      }
    } else {
      // 普通消息
      await sendMessage(inputValue)
    }

    setInputValue('')
  }

  // 处理命令输入
  const handleCommand = useCallback((input: string) => {
    const trimmed = input.trim()

    // /nodes - 列出所有节点
    if (trimmed === '/nodes') {
      setShowNodeList(true)
      return true
    }

    return false
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // 命令处理
    if (inputValue.startsWith('/')) {
      if (handleCommand(inputValue)) {
        e.preventDefault()
        return
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // 渲染带 @引用 的消息
  const nodesMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const n of getNodes()) {
      map.set(n.id, String(n.data.label))
    }
    return map
  }, [getNodes])

  const renderMessageWithMentions = useCallback((content: string) => {
    const parts = content.split(/@(\S+)/g)

    return parts.map((part, i) => {
      if (i % 2 === 1) {
        const label = nodesMap.get(part)
        if (label) {
          return (
            <span key={i} className="node-mention-inline">
              @{label}
            </span>
          )
        }
        return <span key={i} className="node-mention-unknown">@{part}</span>
      }
      return part
    })
  }, [nodesMap])

  // 获取节点列表用于显示
  const nodeList = useMemo(() => {
    return getNodes().map(n => ({
      id: n.id,
      label: n.data.label as string,
      type: n.data.type as string
    }))
  }, [getNodes])

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
        {messages.length === 0 && !aiLoading && (
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
              <button className="chat-suggestion" onClick={() => setInputValue('@')}>
                引用画布节点内容
              </button>
            </div>
          </div>
        )}

        {/* 节点列表提示 */}
        {showNodeList && (
          <div className="chat-node-list">
            <div className="chat-node-list-header">
              <span>可引用的节点</span>
              <button onClick={() => setShowNodeList(false)}>关闭</button>
            </div>
            <div className="chat-node-list-items">
              {nodeList.map(node => (
                <div key={node.id} className="chat-node-list-item">
                  <span className="node-type">[{node.type}]</span>
                  <span className="node-label">{node.label}</span>
                  <span className="node-id">@{node.id}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} renderContent={renderMessageWithMentions} />
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
            placeholder="输入消息，Enter 发送，@节点ID 引用节点..."
            rows={1}
            disabled={isLoading || aiLoading}
          />
        </div>
        <div className="chat-input-toolbar">
          <div className="chat-toolbar-left">
            {/* Attachment */}
            <button className="chat-toolbar-btn" title="附件">
              <PaperclipIcon />
            </button>
            {/* Node list */}
            <button
              className={`chat-toolbar-btn ${showNodeList ? 'chat-toolbar-btn-active' : ''}`}
              onClick={() => setShowNodeList(!showNodeList)}
              title="节点列表 (/nodes)"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7"></rect>
                <rect x="14" y="3" width="7" height="7"></rect>
                <rect x="14" y="14" width="7" height="7"></rect>
                <rect x="3" y="14" width="7" height="7"></rect>
              </svg>
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
              disabled={!inputValue.trim() || isLoading || aiLoading}
            >
              <SendIcon />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

interface MessageBubbleProps {
  message: ChatMessage
  renderContent?: (content: string) => React.ReactNode
}

function MessageBubble({ message, renderContent }: MessageBubbleProps) {
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
        <div className="chat-bubble">
          {renderContent ? renderContent(message.content) : message.content}
        </div>
      </div>
    </div>
  )
}
