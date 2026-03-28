// 应用全局常量，统一管理所有魔法数字

// 节点尺寸
export const NODE_WIDTH = 200
export const NODE_HEIGHT = 100
export const NODE_MIN_WIDTH = 200
export const NODE_MIN_HEIGHT = 80

// 手柄
export const HANDLE_SIZE = 14
export const HANDLE_RADIUS = HANDLE_SIZE / 2

// 网格
export const GRID_SIZE = 20
export const GRID_SNAP: [number, number] = [GRID_SIZE, GRID_SIZE]

// 视口
export const DEFAULT_ZOOM = 1
export const MAX_ZOOM = 1
export const FIT_VIEW_PADDING = 0.5

// 缩放选项（百分比列表）
export const ZOOM_OPTIONS = [
  { label: '50%', value: 0.5 },
  { label: '75%', value: 0.75 },
  { label: '100%', value: 1 },
  { label: '125%', value: 1.25 },
  { label: '150%', value: 1.5 },
  { label: '200%', value: 2 },
]

// 菜单层级
export const MENU_Z_INDEX = 1000
export const MENU_MIN_WIDTH = 220
export const MENU_MIN_HEIGHT = 400

