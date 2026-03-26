import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ReactFlowProvider } from '@xyflow/react'
import { Home, Projects, Canvas, Settings } from './pages'
import { isTauri, getAppInfo } from './utils/tauriApi'
import { useEffect } from 'react'

function CanvasWithProvider() {
  return (
    <ReactFlowProvider>
      <Canvas />
    </ReactFlowProvider>
  )
}

export default function App() {
  useEffect(() => {
    // Test Tauri integration on startup
    if (isTauri()) {
      getAppInfo()
        .then(info => console.log('[PopMedia] Tauri backend connected:', info))
        .catch(err => console.error('[PopMedia] Tauri error:', err))
    } else {
      console.log('[PopMedia] Running in browser mode (Tauri not detected)')
    }
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/canvas" element={<CanvasWithProvider />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </BrowserRouter>
  )
}
