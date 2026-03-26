import { useState } from 'react'

import { ZOOM_OPTIONS } from '../constants'
import { MapIcon, GridIcon, MinusIcon, PlusIcon14, ChevronDownIcon } from '../icons'

interface ControlBarProps {
  zoom: number
  onZoomIn: () => void
  onZoomOut: () => void
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
  onToggleMinimap,
  onToggleSnapGrid,
  onSetZoom,
  showMinimap,
  snapToGrid,
}: ControlBarProps) {
  const [showZoomMenu, setShowZoomMenu] = useState(false)

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
              {ZOOM_OPTIONS.map((option) => (
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
        <PlusIcon14 />
      </button>
    </div>
  )
}
