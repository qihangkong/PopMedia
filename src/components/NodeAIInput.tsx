import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useNodeAI } from '../hooks/useNodeAI'
import { useUpstreamPreview } from '../hooks/useUpstreamPreview'
import { ModelSelect } from './ModelSelect'
import { getLlmConfigs } from '../utils/chatApi'
import type { LlmConfig } from '../utils/tauriApi'
import type { ExecutionState } from '../types/ai'

interface NodeAIInputProps {
  nodeId: string
  visible: boolean
  onClose?: () => void
}

function getStatusText(status: ExecutionState['status'], progress?: string, error?: string): string {
  switch (status) {
    case 'pending':
      return progress || '处理中...'
    case 'generating':
      return '正在生成...'
    case 'completed':
      return '已生成'
    case 'error':
      return `错误: ${error}`
    default:
      return ''
  }
}

export function NodeAIInput({ nodeId, visible, onClose }: NodeAIInputProps) {
  const [message, setMessage] = useState('')
  const [hiddenNodeIds, setHiddenNodeIds] = useState<Set<string>>(new Set())
  const [llmConfigs, setLlmConfigs] = useState<LlmConfig[]>([])
  const [selectedModel, setSelectedModel] = useState<string>('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const { upstreamNodes } = useUpstreamPreview(nodeId)
  const { executionState, execute, cancel, isExecuting } = useNodeAI(nodeId)

  // Restore saved model from node config, or load from backend
  useEffect(() => {
    const savedModel = localStorage.getItem(`node-ai-model-${nodeId}`)

    getLlmConfigs().then(configs => {
      setLlmConfigs(configs)
      if (configs.length > 0) {
        setSelectedModel(savedModel || configs[0].model_name)
      }
    }).catch(console.error)
  }, [nodeId])

  // Save model selection
  useEffect(() => {
    if (selectedModel) {
      localStorage.setItem(`node-ai-model-${nodeId}`, selectedModel)
    }
  }, [selectedModel, nodeId])

  useEffect(() => {
    if (visible && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [visible])

  const handleAutoResize = () => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = textarea.scrollHeight + 'px'
    }
  }

  const handleSend = useCallback(async () => {
    if (message.trim() && !isExecuting) {
      await execute(message.trim(), hiddenNodeIds, selectedModel || undefined)
      setMessage('')
      if (textareaRef.current) {
        textareaRef.current.style.height = '48px'
      }
    }
  }, [message, execute, isExecuting, hiddenNodeIds, selectedModel])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
    if (e.key === 'Escape' && onClose) {
      onClose()
    }
  }, [handleSend, onClose])

  const toggleNodeHidden = (targetNodeId: string) => {
    setHiddenNodeIds(prev => {
      const next = new Set(prev)
      if (next.has(targetNodeId)) {
        next.delete(targetNodeId)
      } else {
        next.add(targetNodeId)
      }
      return next
    })
  }

  const modelOptions = useMemo(() =>
    llmConfigs.map(config => ({
      value: config.model_name,
      label: config.name || config.model_name,
    })),
    [llmConfigs]
  )

  if (!visible) return null

  return (
    <div
      className="node-ai-input"
      onClick={(e) => e.stopPropagation()}
    >
      {/* 第一行：文本输入框 */}
      <div className="node-ai-input-row">
        <textarea
          ref={textareaRef}
          className="node-ai-input-textarea"
          placeholder="输入指令，AI 自动执行..."
          value={message}
          onChange={(e) => {
            setMessage(e.target.value)
            handleAutoResize()
          }}
          onKeyDown={handleKeyDown}
          rows={2}
          disabled={isExecuting}
        />
      </div>

      {/* 第二行：模型选择 + 节点标签 + 发送按钮 */}
      <div className="node-ai-input-controls-row">
        {/* 状态指示器 */}
        {executionState.status !== 'idle' && (
          <div className={`node-ai-input-status ${executionState.status}`}>
            <span className="status-text">{getStatusText(executionState.status, executionState.progress, executionState.error)}</span>
            {executionState.status === 'generating' && (
              <button className="cancel-btn" onClick={cancel}>
                取消
              </button>
            )}
          </div>
        )}

        {/* 模型选择 */}
        {modelOptions.length > 0 ? (
          <ModelSelect
            options={modelOptions}
            value={selectedModel}
            onChange={setSelectedModel}
            disabled={isExecuting}
          />
        ) : (
          <div className="model-select-empty">未配置模型</div>
        )}

        {/* 节点标签 */}
        {upstreamNodes.length > 0 && (
          <div className="node-tags-row">
            {upstreamNodes.map(n => {
              const isHidden = hiddenNodeIds.has(n.nodeId)
              return (
                <div
                  key={n.nodeId}
                  className={`node-tag ${isHidden ? 'hidden' : ''}`}
                >
                  <span className="node-tag-label">{n.nodeLabel}</span>
                  <button
                    className="node-tag-hide"
                    onClick={() => toggleNodeHidden(n.nodeId)}
                    title={isHidden ? '显示' : '隐藏'}
                  >
                    {isHidden ? (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    ) : (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {/* 发送按钮 */}
        <button
          className="node-ai-input-send"
          onClick={handleSend}
          disabled={!message.trim() || isExecuting}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
          </svg>
        </button>
      </div>
    </div>
  )
}