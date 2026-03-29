# AI 内容生成功能设计方案

## 1. 概述

### 1.1 设计目标

实现智能的 AI 内容生成功能，让节点成为"有记忆的 AI 代理"，而非静态容器。用户可以通过自然语言指令，自动获取上游节点内容并生成结果。

### 1.2 核心设计理念

```
节点 = AI代理 + 上下文 + 工具能力
```

每个节点具备：
- **角色定义**：知道自己是什么类型的 AI（编剧、总结、翻译等）
- **上下文感知**：自动获取上游节点内容
- **智能执行**：理解用户意图，自动完成任务

---

## 2. 系统架构

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                         用户输入                            │
│              "帮我生成一个剧本"                              │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    意图识别层 (IntentClassifier)             │
│  • 解析用户意图（生成剧本/总结/翻译/...）                      │
│  • 判断是否需要上游内容                                       │
│  • 选择合适的工具/技能                                       │
└─────────────────────┬───────────────────────────────────────┘
                      │ 需要上游内容
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                   上下文感知层 (UpstreamContextManager)      │
│  • 沿着边追溯上游节点                                        │
│  • 收集上游内容（支持多跳追溯）                               │
│  • 构建上下文摘要                                            │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    执行层 (AIExecutionEngine)               │
│  • 调用LLM生成内容                                            │
│  • 支持流式输出                                              │
│  • 结果写入节点                                              │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 模块依赖关系

```
IntentClassifier ─────┐
                     │
UpstreamContext ─────┼──── AIExecutionEngine ───── useNodeAI
                     │
RolePromptMap ────────┘
```

---

## 3. 双对话框架构

### 3.1 现状分析

| 对话框 | 定位 | 当前问题 |
|--------|------|----------|
| `ChatDrawer` | 全局AI助手，多轮对话 | 与节点内容割裂 |
| `NodeAIDialog` | 节点内AI交互 | 只有输入框，AI发送是TODO |

**核心矛盾**：两个对话框功能重复但互不关联，用户不知道该用哪个。

### 3.2 设计方案：融合而非合并

保持两个入口，但共享同一个 AI 执行引擎，职责分明。

```
┌─────────────────────────────────────────────────────────────┐
│                    ChatDrawer (全局)                         │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  多轮对话上下文                                         │ │
│  │  • 不绑定特定节点                                       │ │
│  │  • 通用问答、知识查询                                    │ │
│  │  • 跨节点内容讨论                                       │ │
│  │  • 支持 @节点 引用                                      │ │
│  └───────────────────────────────────────────────────────┘ │
└────────────────────────────┬────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │    AIRouter     │
                    │   统一执行引擎   │
                    └────────┬────────┘
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                  │
          ▼                  ▼                  ▼
   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
   │ 全局对话模式 │   │ 节点执行模式 │   │ 跨节点模式   │
   │ (多轮)      │   │ (单轮+上游)  │   │ (多节点引用) │
   └─────────────┘   └─────────────┘   └─────────────┘
```

### 3.3 职责划分

| 场景 | 推荐入口 | 原因 |
|------|----------|------|
| "帮我写一个剧本" | NodeAIDialog | 需要上游内容 |
| "解释一下相对论" | ChatDrawer | 通用知识，无需上下文 |
| "把这个剧本改成中文" | NodeAIDialog | 绑定节点内容 |
| "这个项目怎么用？" | ChatDrawer | 全局问答 |
| "根据节点1和节点2生成..." | ChatDrawer | 多节点引用 |

---

## 4. 核心数据结构

### 4.1 节点角色定义

```typescript
// src/types/ai.ts

export type NodeRole =
  | 'writer'        // 写作（剧本、小说、文章）
  | 'summarizer'    // 总结摘要
  | 'translator'    // 翻译
  | 'analyzer'      // 分析
  | 'generator'     // 生成器
  | 'editor'        // 编辑器
  | 'reviewer'      // 审核评论

export interface NodeAIConfig {
  role: NodeRole
  model?: string              // 可选，指定使用的模型
  temperature?: number        // 生成温度
  maxTokens?: number          // 最大生成长度
  autoExecution?: boolean     // 是否自动执行
  preserveHistory?: boolean   // 保留对话历史
}

export interface BaseNodeData {
  label: string
  type: 'text' | 'image' | 'video' | 'audio'
  content?: string

  // AI相关配置
  aiConfig?: NodeAIConfig
  systemPrompt?: string       // 自定义system prompt

  // 上下文缓存（避免每次重新计算）
  cachedContext?: {
    upstreamContent: string[]
    timestamp: number
  }
}
```

### 4.2 执行状态

```typescript
export interface ExecutionState {
  status: 'idle' | 'pending' | 'generating' | 'completed' | 'error'
  progress?: string            // 当前步骤
  result?: string              // 生成结果
  error?: string
  startTime?: number
}
```

### 4.3 对话消息

```typescript
// ChatDrawer 使用

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  nodeMentions?: string[]      // 引用了哪些节点ID
  timestamp: number
}
```

---

## 5. 核心模块设计

### 5.1 上下文管理器 (UpstreamContextManager)

**文件**: `src/services/UpstreamContextManager.ts`

```typescript
import { Node, Edge } from '@xyflow/react'

export interface UpstreamNode {
  nodeId: string
  nodeLabel: string
  content: string
  type: 'text' | 'image' | 'video' | 'audio'
  distance: number            // 跳数
}

export class UpstreamContextManager {
  /**
   * 获取指定节点的所有上游节点内容
   * @param nodeId 目标节点ID
   * @param nodes 所有节点
   * @param edges 所有边
   * @param maxDepth 最大追溯深度，默认2
   */
  static getUpstreamContent(
    nodeId: string,
    nodes: Node[],
    edges: Edge[],
    maxDepth: number = 2
  ): UpstreamNode[] {
    const visited = new Set<string>()
    const result: UpstreamNode[] = []

    this.traverse(nodeId, 0, maxDepth, visited, result, nodes, edges)

    return result
  }

  private static traverse(
    currentId: string,
    currentDepth: number,
    maxDepth: number,
    visited: Set<string>,
    result: UpstreamNode[],
    nodes: Node[],
    edges: Edge[]
  ) {
    if (visited.has(currentId) || currentDepth > maxDepth) return
    visited.add(currentId)

    const upstreamEdges = edges.filter(e => e.target === currentId)

    for (const edge of upstreamEdges) {
      const sourceNode = nodes.find(n => n.id === edge.source)
      if (!sourceNode) continue

      result.push({
        nodeId: sourceNode.id,
        nodeLabel: sourceNode.data.label,
        content: this.extractContent(sourceNode),
        type: sourceNode.data.type,
        distance: currentDepth + 1
      })

      this.traverse(sourceNode.id, currentDepth + 1, maxDepth, visited, result, nodes, edges)
    }
  }

  private static extractContent(node: Node): string {
    const data = node.data
    switch (data.type) {
      case 'text':
        return data.content || ''
      case 'image':
        return `[图片] ${data.imageUrl || '无URL'}`
      case 'video':
        return `[视频] ${data.videoUrl || '无URL'}`
      case 'audio':
        return `[音频] ${data.audioUrl || '无URL'}`
      default:
        return JSON.stringify(data)
    }
  }

  /**
   * 构建发送给LLM的上下文字符串
   */
  static buildContextPrompt(upstreamNodes: UpstreamNode[]): string {
    if (upstreamNodes.length === 0) {
      return '（无可用上游内容）'
    }

    const lines = upstreamNodes.map((node, index) => {
      return `[来源${index + 1}: ${node.nodeLabel}] (距离${node.distance}跳)\n${node.content}`
    })

    return lines.join('\n\n')
  }
}
```

### 5.2 意图识别器 (IntentClassifier)

**文件**: `src/services/IntentClassifier.ts`

```typescript
import type { NodeRole } from '../types/ai'

export interface Intent {
  action: 'generate' | 'summarize' | 'translate' | 'analyze' | 'edit' | 'review' | 'custom'
  target?: string               // 具体目标，如"剧本"、"摘要"
  customPrompt?: string         // 用户原始输入
  needsUpstream: boolean        // 是否需要上游内容
  confidence: number            // 置信度 0-1
}

const INTENT_PATTERNS = {
  generate: {
    patterns: [/生成.*/i, /创作.*/i, /编写.*/i, /制作.*/i, /create.*script/i],
    roles: ['writer', 'generator'] as NodeRole[]
  },
  summarize: {
    patterns: [/总结/i, /概括/i, /摘要/i, /提炼/i, /summarize/i],
    roles: ['summarizer'] as NodeRole[]
  },
  translate: {
    patterns: [/翻译/i, /译成/i, /translate/i],
    roles: ['translator'] as NodeRole[]
  },
  analyze: {
    patterns: [/分析/i, /解读/i, /拆解/i, /analyze/i],
    roles: ['analyzer'] as NodeRole[]
  },
  edit: {
    patterns: [/修改/i, /编辑/i, /润色/i, /改写/i, /edit/i],
    roles: ['editor'] as NodeRole[]
  },
  review: {
    patterns: [/评论/i, /评价/i, /审核/i, /review/i],
    roles: ['reviewer'] as NodeRole[]
  }
}

export class IntentClassifier {
  /**
   * 识别用户输入的意图
   */
  static classify(userInput: string, nodeRole?: NodeRole): Intent {
    // 如果节点有预设角色，使用角色相关的action
    if (nodeRole) {
      const intent = this.classifyWithRole(userInput, nodeRole)
      if (intent.confidence > 0.8) return intent
    }

    // 通用模式匹配
    for (const [action, config] of Object.entries(INTENT_PATTERNS)) {
      for (const pattern of config.patterns) {
        if (pattern.test(userInput)) {
          return {
            action: action as Intent['action'],
            target: this.extractTarget(userInput),
            customPrompt: userInput,
            needsUpstream: true,
            confidence: 0.9
          }
        }
      }
    }

    // 无法识别，返回自定义意图
    return {
      action: 'custom',
      customPrompt: userInput,
      needsUpstream: true,
      confidence: 0.5
    }
  }

  private static classifyWithRole(userInput: string, role: NodeRole): Intent {
    const roleToAction: Record<NodeRole, Intent['action']> = {
      'writer': 'generate',
      'generator': 'generate',
      'summarizer': 'summarize',
      'translator': 'translate',
      'analyzer': 'analyze',
      'editor': 'edit',
      'reviewer': 'review'
    }

    return {
      action: roleToAction[role],
      target: this.extractTarget(userInput),
      customPrompt: userInput,
      needsUpstream: true,
      confidence: 0.95
    }
  }

  private static extractTarget(input: string): string | undefined {
    const targets = ['剧本', '脚本', '摘要', '总结', '翻译', '分析', '评论']
    return targets.find(t => input.includes(t))
  }
}
```

### 5.3 AI执行引擎 (AIExecutionEngine)

**文件**: `src/services/AIExecutionEngine.ts`

```typescript
import { Node, Edge } from '@xyflow/react'
import { sendChatMessage } from '../utils/chatApi'
import { UpstreamContextManager, UpstreamNode } from './UpstreamContextManager'
import { IntentClassifier, Intent } from './IntentClassifier'
import type { ExecutionState, NodeAIConfig } from '../types/ai'

// 角色对应的System Prompt
const ROLE_PROMPTS: Record<string, string> = {
  'writer': `你是一个专业的剧本创作助手。

规则：
- 深入理解素材的核心情节和人物
- 剧本格式：场景编号 | 场景描述 | 角色对白 | 动作指示
- 保持原素材的创意和情感
- 对白要自然，符合角色性格`,

  'summarizer': `你是一个文本摘要专家。

规则：
- 提取核心信息和关键点
- 保持逻辑连贯性
- 长度控制在原文的1/3到1/2
- 使用简洁清晰的语言`,

  'translator': `你是一个专业翻译。

规则：
- 保持原文风格和语气
- 符合目标语言的表达习惯
- 专业术语准确翻译`,

  'analyzer': `你是一个内容分析专家。

规则：
- 深入分析内容结构和逻辑
- 识别关键主题和论点
- 提供建设性的分析意见`,

  'generator': `你是一个内容生成专家。

规则：
- 根据素材生成相关的内容
- 保持创意性和实用性
- 输出格式清晰`,

  'editor': `你是一个文字编辑。

规则：
- 优化语言表达
- 保持原文意图
- 提升可读性和专业性`,

  'reviewer': `你是一个评论专家。

规则：
- 客观公正地评价内容
- 提出具体改进建议
- 肯定优点，指出不足`
}

export enum ChatMode {
  GLOBAL_CHAT = 'global',    // 全局多轮对话
  NODE_EXECUTE = 'node',      // 节点单轮执行
  CROSS_NODE = 'cross'        // 跨节点引用
}

export interface ExecutionOptions {
  mode: ChatMode
  userInput: string
  nodeId?: string              // 节点模式必填
  mentionNodeIds?: string[]   // 跨节点模式引用的节点
  messages?: ChatMessage[]     // 全局模式的历史
  nodes?: Node[]               // 所有节点(节点/跨节点模式)
  edges?: Edge[]               // 所有边(节点模式)
  onStateChange?: (state: ExecutionState) => void
  onChunk?: (chunk: string) => void
}

export class AIExecutionEngine {
  /**
   * 执行AI任务
   */
  static async execute(options: ExecutionOptions): Promise<string> {
    const { mode, userInput, ...rest } = options

    switch (mode) {
      case ChatMode.GLOBAL_CHAT:
        return this.executeGlobalChat(userInput, rest.messages)
      case ChatMode.NODE_EXECUTE:
        return this.executeNodeTask(userInput, rest.nodeId, rest.nodes, rest.edges, rest.onStateChange)
      case ChatMode.CROSS_NODE:
        return this.executeCrossNode(userInput, rest.mentionNodeIds, rest.nodes, rest.onStateChange)
      default:
        throw new Error(`Unknown mode: ${mode}`)
    }
  }

  /**
   * 节点执行模式
   */
  static async executeNodeTask(
    userInput: string,
    nodeId: string | undefined,
    nodes: Node[] | undefined,
    edges: Edge[] | undefined,
    onStateChange?: (state: ExecutionState) => void
  ): Promise<string> {
    if (!nodeId || !nodes || !edges) {
      throw new Error('Node task requires nodeId, nodes and edges')
    }

    const node = nodes.find(n => n.id === nodeId)
    if (!node) throw new Error(`Node not found: ${nodeId}`)

    try {
      onStateChange?.({ status: 'pending', progress: '分析意图...' })

      const intent = IntentClassifier.classify(userInput, node.data.aiConfig?.role)

      let upstreamContent = ''
      if (intent.needsUpstream) {
        onStateChange?.({ status: 'pending', progress: '获取上游内容...' })
        const upstreamNodes = UpstreamContextManager.getUpstreamContent(nodeId, nodes, edges)
        upstreamContent = UpstreamContextManager.buildContextPrompt(upstreamNodes)
      }

      onStateChange?.({ status: 'generating', progress: '正在生成...' })
      const fullPrompt = this.buildPrompt(intent, upstreamContent, node.data)
      const result = await sendChatMessage(fullPrompt)

      onStateChange?.({ status: 'completed', result, startTime: Date.now() })
      return result

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误'
      onStateChange?.({ status: 'error', error: errorMessage })
      throw error
    }
  }

  /**
   * 全局对话模式
   */
  static async executeGlobalChat(
    userInput: string,
    messages: ChatMessage[] | undefined
  ): Promise<string> {
    // 直接调用，不带上下文
    return await sendChatMessage(userInput)
  }

  /**
   * 跨节点模式
   */
  static async executeCrossNode(
    userInput: string,
    mentionNodeIds: string[] | undefined,
    nodes: Node[] | undefined,
    onStateChange?: (state: ExecutionState) => void
  ): Promise<string> {
    if (!mentionNodeIds || !nodes) {
      throw new Error('Cross-node task requires mentionNodeIds and nodes')
    }

    onStateChange?.({ status: 'pending', progress: '获取引用节点内容...' })

    const mentionedNodes = nodes.filter(n => mentionNodeIds.includes(n.id))
    const context = mentionedNodes.map(n => {
      return `[${n.data.label}]\n${this.extractContent(n)}`
    }).join('\n\n')

    const fullPrompt = `## 引用内容\n${context}\n\n## 用户指令\n${userInput}`
    return await sendChatMessage(fullPrompt)
  }

  private static buildPrompt(
    intent: Intent,
    upstreamContent: string,
    nodeData: Node['data']
  ): string {
    const role = nodeData.aiConfig?.role
    const systemPrompt = nodeData.systemPrompt ||
      (role ? ROLE_PROMPTS[role] : ROLE_PROMPTS['generator'])

    let userContent = ''

    if (upstreamContent && upstreamContent !== '（无可用上游内容）') {
      userContent = `## 上游素材\n${upstreamContent}\n\n## 用户指令\n${intent.customPrompt || intent.action}`
    } else {
      userContent = `## 用户指令\n${intent.customPrompt || intent.action}`
    }

    return `${systemPrompt}\n\n${userContent}`
  }

  private static extractContent(node: Node): string {
    const data = node.data
    switch (data.type) {
      case 'text':
        return data.content || ''
      case 'image':
        return `[图片] ${data.imageUrl || '无URL'}`
      case 'video':
        return `[视频] ${data.videoUrl || '无URL'}`
      case 'audio':
        return `[音频] ${data.audioUrl || '无URL'}`
      default:
        return JSON.stringify(data)
    }
  }
}
```

### 5.4 节点AI状态管理 (useNodeAI)

**文件**: `src/hooks/useNodeAI.ts`

```typescript
import { useState, useCallback, useRef } from 'react'
import { useReactFlow } from '@xyflow/react'
import { AIExecutionEngine, ChatMode, ExecutionOptions } from '../services/AIExecutionEngine'
import { useNodeUpdates } from './useNodeUpdates'
import type { ExecutionState } from '../types/ai'

export function useNodeAI(nodeId: string) {
  const { getNode, getNodes, getEdges } = useReactFlow()
  const { updateContent } = useNodeUpdates(nodeId)

  const [executionState, setExecutionState] = useState<ExecutionState>({
    status: 'idle'
  })
  const executionRef = useRef<AbortController | null>(null)

  // 执行AI任务
  const execute = useCallback(async (userInput: string) => {
    const node = getNode(nodeId)
    if (!node) return

    executionRef.current?.abort()
    executionRef.current = new AbortController()

    const options: ExecutionOptions = {
      mode: ChatMode.NODE_EXECUTE,
      userInput,
      nodeId,
      nodes: getNodes(),
      edges: getEdges(),
      onStateChange: setExecutionState,
    }

    try {
      const result = await AIExecutionEngine.execute(options)
      updateContent(result)
    } catch (error) {
      console.error('AI execution failed:', error)
    }
  }, [nodeId, getNode, getNodes, getEdges, updateContent])

  // 取消执行
  const cancel = useCallback(() => {
    executionRef.current?.abort()
    setExecutionState({ status: 'idle' })
  }, [])

  // 重置状态
  const reset = useCallback(() => {
    setExecutionState({ status: 'idle' })
  }, [])

  return {
    executionState,
    execute,
    cancel,
    reset,
    isExecuting: executionState.status === 'generating' || executionState.status === 'pending'
  }
}
```

---

## 6. 组件设计

### 6.1 NodeAIDialog 改进

**文件**: `src/components/NodeAIDialog.tsx`

```typescript
interface NodeAIDialogProps {
  nodeId: string
  onClose: () => void
}

// 功能模块
const NodeAIDialog = ({ nodeId, onClose }: NodeAIDialogProps) => {
  const { upstreamNodes } = useUpstreamPreview(nodeId)  // 上游预览
  const { quickActions } = useQuickActions(nodeId)       // 快捷指令
  const { executionState, execute, cancel } = useNodeAI(nodeId)

  return (
    <div className="node-ai-dialog">
      {/* 状态指示器 */}
      {executionState.status !== 'idle' && (
        <div className="execution-status">
          {executionState.progress || executionState.status}
          {executionState.status === 'generating' && (
            <button onClick={cancel}>取消</button>
          )}
        </div>
      )}

      {/* 上游内容预览 */}
      <UpstreamPreview nodes={upstreamNodes} />

      {/* 快捷指令 */}
      <QuickActions
        actions={quickActions}
        onSelect={execute}
      />

      {/* 输入框 */}
      <InputArea
        placeholder="输入指令，或点击上方快捷按钮..."
        onSend={execute}
        disabled={executionState.status === 'generating'}
      />

      {/* 结果预览 */}
      {executionState.result && (
        <ResultPreview result={executionState.result} />
      )}
    </div>
  )
}
```

### 6.2 ChatDrawer 增强

**文件**: `src/components/ChatDrawer.tsx`

```typescript
// 新增功能
interface ChatDrawerProps {
  // ...
}

// @节点引用渲染
const renderWithMentions = (content: string, nodes: Node[]) => {
  const parts = content.split(/@(\w+)/)
  return parts.map((part, i) => {
    if (i % 2 === 1) {
      // 这是一个节点引用
      const node = nodes.find(n => n.id === part)
      return node ? (
        <span className="node-mention" key={i}>
          @{node.data.label}
        </span>
      ) : part
    }
    return part
  })
}

// 命令处理
const handleCommand = (input: string) => {
  if (input === '/nodes') {
    return listAllNodes()
  }
  // ...
}
```

### 6.3 新增 Hooks

#### useUpstreamPreview

```typescript
// src/hooks/useUpstreamPreview.ts

import { useMemo } from 'react'
import { useReactFlow } from '@xyflow/react'
import { UpstreamContextManager, UpstreamNode } from '../services/UpstreamContextManager'

export function useUpstreamPreview(nodeId: string) {
  const { getNodes, getEdges } = useReactFlow()

  const upstreamNodes = useMemo(() => {
    return UpstreamContextManager.getUpstreamContent(
      nodeId,
      getNodes(),
      getEdges(),
      2
    )
  }, [nodeId, getNodes, getEdges])

  return { upstreamNodes }
}
```

#### useQuickActions

```typescript
// src/hooks/useQuickActions.ts

import { useMemo } from 'react'
import type { NodeRole } from '../types/ai'

interface QuickAction {
  label: string
  icon: string
  prompt: string
}

const ROLE_ACTIONS: Record<NodeRole, QuickAction[]> = {
  'writer': [
    { label: '生成剧本', icon: '🎬', prompt: '根据上游内容生成剧本' },
    { label: '改写内容', icon: '✏️', prompt: '改写上游内容' },
    { label: '扩展情节', icon: '📖', prompt: '扩展上游内容的情节' },
  ],
  'summarizer': [
    { label: '生成摘要', icon: '📝', prompt: '总结上游内容' },
    { label: '提取要点', icon: '🎯', prompt: '提取上游内容的要点' },
  ],
  // ...
}

export function useQuickActions(nodeId: string, role?: NodeRole) {
  const actions = useMemo(() => {
    if (role && ROLE_ACTIONS[role]) {
      return ROLE_ACTIONS[role]
    }
    // 默认动作
    return [
      { label: '生成内容', icon: '✨', prompt: '根据上游内容生成' },
      { label: '总结', icon: '📝', prompt: '总结上游内容' },
      { label: '翻译', icon: '🌐', prompt: '翻译上游内容' },
    ]
  }, [role])

  return { quickActions: actions }
}
```

---

## 7. 工作流程示意

### 7.1 节点执行流程

```
用户输入："生成剧本"

                        ┌─────────────────┐
                        │   NodeAIDialog  │
                        └────────┬────────┘
                                 │
                    ┌────────────▼────────────┐
                    │    IntentClassifier     │
                    │  识别为: generate      │
                    │  角色: writer          │
                    └────────────┬────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │  UpstreamContextManager  │
                    │  找到节点1: "小说内容"   │
                    └────────────┬────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │   AIExecutionEngine      │
                    │  读取writer的systemPrmt  │
                    │  构建完整prompt          │
                    └────────────┬────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │     sendChatMessage      │
                    │     调用LLM API         │
                    └────────────┬────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │    useNodeAI            │
                    │  updateContent()       │
                    │  剧本写入节点2          │
                    └─────────────────────────┘
```

### 7.2 跨节点引用流程

```
ChatDrawer 中用户输入："@节点1 @节点2 帮我分析"

                    ┌─────────────────┐
                    │    ChatDrawer    │
                    │ 解析 @引用      │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
         节点1内容      节点2内容       其他消息
              │              │              │
              └──────────────┼──────────────┘
                             │
                    ┌────────▼────────┐
                    │ AIRouter (cross) │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │ 构建跨节点上下文 │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │ sendChatMessage │
                    │    调用 LLM     │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │ 返回结果到      │
                    │ ChatDrawer      │
                    └─────────────────┘
```

---

## 8. 文件结构

```
src/
├── types/
│   └── ai.ts                    # AI 相关类型定义
├── services/
│   ├── UpstreamContextManager.ts  # 上下文管理器
│   ├── IntentClassifier.ts        # 意图识别器
│   └── AIExecutionEngine.ts       # 统一执行引擎
├── hooks/
│   ├── useNodeAI.ts               # 节点AI状态管理
│   ├── useUpstreamPreview.ts      # 上游预览
│   └── useQuickActions.ts          # 快捷指令
├── components/
│   ├── NodeAIDialog.tsx           # 节点AI对话框 (增强)
│   └── ChatDrawer.tsx             # 全局AI抽屉 (增强)
```

---

## 9. 扩展功能建议

### 9.1 多节点协同
- 一个AI任务可以同时修改多个节点
- 比如"根据小说生成剧本和分镜"

### 9.2 执行历史
- 记录每次AI执行的内容
- 支持回滚到之前的版本

### 9.3 流式输出
- 分块返回结果，实时显示到节点
- 用户可以看到生成过程

### 9.4 反馈循环
- AI可以修改上游节点内容
- 支持"AI生成 → 用户评价 → AI改进"的迭代

---

## 10. 技术说明

### 10.1 为什么不需要 MCP

| 需求 | 现有方案 | 结论 |
|------|----------|------|
| 读取节点内容 | `useReactFlow().getNode()` + `edges` | 前端状态，直接访问 |
| 调用 LLM | `sendChatMessage()` → Rust 后端 | 已有 OpenAI 兼容 API 调用 |
| 写入节点内容 | `useNodeUpdates().updateContent()` | 前端状态，直接修改 |

MCP 用于 AI 直接访问外部工具/文件系统，当前架构已通过 Rust 后端封装了所有外部调用，无需额外引入 MCP。

### 10.2 与现有系统的兼容

- 复用 `sendChatMessage()` 发送 LLM 请求
- 复用 `useNodeUpdates()` 更新节点内容
- 复用 `edges` 状态追溯上游节点
- 新增服务层，不破坏现有架构
