import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ReactFlowProvider } from '@xyflow/react'
import { Home, Projects, Canvas, Settings } from './pages'
import { isTauri, getAppInfo } from './utils/tauriApi'
import { initWindowManager } from './utils/windowManager'
import { skillRegistry } from './services/SkillRegistry'
import { useEffect } from 'react'
import { ChatProvider } from './contexts/ChatContext'
import { CanvasProvider } from './contexts/CanvasContext'
import { NotificationProvider } from './contexts/NotificationContext'
import { ErrorBoundary } from './components/ErrorBoundary'
import { Notification } from './components/Notification'

const isDev = import.meta.env.DEV

function CanvasWithProvider() {
  return (
    <CanvasProvider>
      <ReactFlowProvider>
        <ChatProvider>
          <Canvas />
        </ChatProvider>
      </ReactFlowProvider>
    </CanvasProvider>
  )
}

export default function App() {
  useEffect(() => {
    if (!isTauri()) {
      if (isDev) console.log('[App] Running in browser mode')
      return
    }

    // 连接 Tauri 后端并初始化窗口
    getAppInfo()
      .then(info => {
        if (isDev) console.log('[App] Tauri connected:', info)
        // 初始化 skill registry
        return skillRegistry.initialize()
      })
      .then(() => initWindowManager())
      .catch(err => console.error('[App] Tauri error:', err))
  }, [])

  return (
    <BrowserRouter>
      <NotificationProvider>
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/canvas" element={<CanvasWithProvider />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
          <Notification />
        </ErrorBoundary>
      </NotificationProvider>
    </BrowserRouter>
  )
}
