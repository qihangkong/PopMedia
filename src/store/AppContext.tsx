import { createContext, useContext, useState, ReactNode } from 'react'
import type { FlowState } from '../types'

interface AppContextType {
  canvasName: string
  setCanvasName: (name: string) => void
  flowState: FlowState
  setFlowState: React.Dispatch<React.SetStateAction<FlowState>>
}

const AppContext = createContext<AppContextType | undefined>(undefined)

export function AppProvider({ children }: { children: ReactNode }) {
  const [canvasName, setCanvasName] = useState('未命名的画布')
  const [flowState, setFlowState] = useState<FlowState>({
    nodes: [],
    setNodes: () => {},
    edges: [],
    setEdges: () => {},
    previewImage: null,
    setPreviewImage: () => {},
    previewVideo: null,
    setPreviewVideo: () => {},
  })

  return (
    <AppContext.Provider value={{ canvasName, setCanvasName, flowState, setFlowState }}>
      {children}
    </AppContext.Provider>
  )
}

export function useAppContext() {
  const context = useContext(AppContext)
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider')
  }
  return context
}
