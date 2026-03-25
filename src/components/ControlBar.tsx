import { useState } from 'react'

// Icons
const MapIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z"></path>
    <path d="M15 5.764v15"></path>
    <path d="M9 3.236v15"></path>
  </svg>
)

const GridIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="18" height="18" x="3" y="3" rx="2"></rect>
    <path d="M3 9h18"></path>
    <path d="M3 15h18"></path>
    <path d="M9 3v18"></path>
    <path d="M15 3v18"></path>
  </svg>
)

const MinusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14"></path>
  </svg>
)

const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14"></path>
    <path d="M12 5v14"></path>
  </svg>
)

const ChevronDownIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m6 9 6 6 6-6"></path>
  </svg>
)

interface ControlBarProps {
  zoom: number
  onZoomIn: () => void
  onZoomOut: () => void
  onFitView: () => void
  onToggleMinimap: () => void
  onToggleSnapGrid: () => void
  onSetZoom: (value: number) => void
  showMinimap: boolean
  snapToGrid: boolean
}

export default function ControlBar({
  zoom,
  onZoomIn,
  onZoomOut,
  onFitView,
  onToggleMinimap,
  onToggleSnapGrid,
  onSetZoom,
  showMinimap,
  snapToGrid,
}: ControlBarProps) {
  const [showZoomMenu, setShowZoomMenu] = useState(false)

  const zoomOptions = [
    { label: '50%', value: 0.5 },
    { label: '75%', value: 0.75 },
    { label: '100%', value: 1 },
    { label: '125%', value: 1.25 },
    { label: '150%', value: 1.5 },
    { label: '200%', value: 2 },
  ]

  return (
    <div className="canvas-controls">
      {/* Toggle Minimap */}
      <button
        className={`controls-btn ${showMinimap ? 'active' : ''}`}
        aria-label="切换小地图"
        onClick={onToggleMinimap}
      >
        <MapIcon />
      </button>

      {/* Toggle Snap Grid */}
      <button
        className={`controls-btn ${snapToGrid ? 'active' : ''}`}
        aria-label="网格吸附"
        onClick={onToggleSnapGrid}
      >
        <GridIcon />
      </button>

      <div className="controls-divider"></div>

      {/* Zoom Out */}
      <button className="controls-btn" aria-label="缩小" onClick={onZoomOut}>
        <MinusIcon />
      </button>

      {/* Zoom Level Dropdown */}
      <div className="zoom-dropdown-wrapper">
        <button
          className="controls-btn zoom-level"
          aria-label="缩放选项"
          onClick={() => setShowZoomMenu(!showZoomMenu)}
        >
          {Math.round(zoom * 100)}%
          <ChevronDownIcon />
        </button>

        {showZoomMenu && (
          <>
            <div className="zoom-menu-backdrop" onClick={() => setShowZoomMenu(false)} />
            <div className="zoom-dropdown">
              {zoomOptions.map((option) => (
                <button
                  key={option.value}
                  className={`zoom-menu-item ${Math.abs(zoom - option.value) < 0.01 ? 'active' : ''}`}
                  onClick={() => {
                    onSetZoom(option.value)
                    setShowZoomMenu(false)
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Zoom In */}
      <button className="controls-btn" aria-label="放大" onClick={onZoomIn}>
        <PlusIcon />
      </button>
    </div>
  )
}
