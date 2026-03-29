import { useMemo } from 'react'
import type { NodeRole } from '../types/ai'

export interface QuickAction {
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
  'translator': [
    { label: '翻译', icon: '🌐', prompt: '翻译上游内容' },
    { label: '中译英', icon: '🇺🇸', prompt: '把上游内容翻译成英文' },
    { label: '英译中', icon: '🇨🇳', prompt: '把上游内容翻译成中文' },
  ],
  'analyzer': [
    { label: '分析内容', icon: '🔍', prompt: '分析上游内容' },
    { label: '深度解读', icon: '💡', prompt: '深度解读上游内容' },
  ],
  'generator': [
    { label: '生成内容', icon: '✨', prompt: '根据上游内容生成' },
    { label: '创意扩展', icon: '💭', prompt: '基于上游内容进行创意扩展' },
  ],
  'editor': [
    { label: '润色', icon: '✨', prompt: '润色上游内容' },
    { label: '改写', icon: '🔄', prompt: '改写上游内容' },
  ],
  'reviewer': [
    { label: '评价', icon: '⭐', prompt: '评价上游内容' },
    { label: '审核', icon: '✅', prompt: '审核上游内容' },
  ],
}

const DEFAULT_ACTIONS: QuickAction[] = [
  { label: '生成内容', icon: '✨', prompt: '根据上游内容生成' },
  { label: '总结', icon: '📝', prompt: '总结上游内容' },
  { label: '翻译', icon: '🌐', prompt: '翻译上游内容' },
]

export function useQuickActions(role?: NodeRole) {
  const actions = useMemo(() => {
    if (role && ROLE_ACTIONS[role]) {
      return ROLE_ACTIONS[role]
    }
    return DEFAULT_ACTIONS
  }, [role])

  return { quickActions: actions }
}
