import { TypeIcon, ImageIcon, VideoIcon, MusicIcon, BlockIcon } from './icons'

// 节点类型元数据 — App.tsx、Sidebar.tsx、CSS class 统一引用此数据
export interface NodeTypeMeta {
  id: string
  label: string
  desc: string
  icon: React.ComponentType
  badge?: string
  placeholderText: string
}

export const NODE_TYPES_META: NodeTypeMeta[] = [
  {
    id: 'text',
    label: '文本',
    desc: '剧本、广告词、品牌文案',
    icon: TypeIcon,
    placeholderText: '点击编辑文本',
  },
  {
    id: 'image',
    label: '图片',
    desc: '海报、分镜、角色设计',
    icon: ImageIcon,
    placeholderText: '点击添加图片',
  },
  {
    id: 'video',
    label: '视频',
    desc: '创意广告、动画、电影',
    icon: VideoIcon,
    placeholderText: '点击添加视频',
  },
  {
    id: 'audio',
    label: '音频',
    desc: '音效、配音、音乐',
    icon: MusicIcon,
    placeholderText: '点击添加音频',
  },
  {
    id: 'block',
    label: '区块',
    desc: '多内容区块',
    icon: BlockIcon,
    placeholderText: '点击编辑内容',
  },
]

// 快速查找映射
export const NODE_TYPE_MAP: Record<string, NodeTypeMeta> = Object.fromEntries(
  NODE_TYPES_META.map((t) => [t.id, t])
)
