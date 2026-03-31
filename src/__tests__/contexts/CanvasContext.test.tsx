import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CanvasProvider, useCanvasContext } from '../../contexts/CanvasContext'

// Test component that uses the canvas context
function TestConsumer() {
  const {
    canvasName,
    setCanvasName,
    contextMenu,
    onNodeContextMenu,
    clearContextMenu,
    previewImage,
    onPreviewImage,
    previewVideo,
    onPreviewVideo,
    onCloseAllMenus,
  } = useCanvasContext()

  return (
    <div>
      <div data-testid="canvasName">{canvasName}</div>
      <div data-testid="contextMenu">
        {contextMenu ? `${contextMenu.nodeId}:${contextMenu.x},${contextMenu.y}` : 'null'}
      </div>
      <div data-testid="previewImage">{previewImage || 'null'}</div>
      <div data-testid="previewVideo">{previewVideo || 'null'}</div>
      <button onClick={() => setCanvasName('New Canvas')}>SetName</button>
      <button onClick={() => onNodeContextMenu('node1', 'text', 100, 200)}>ContextMenu</button>
      <button onClick={clearContextMenu}>ClearMenu</button>
      <button onClick={() => onPreviewImage('image.jpg')}>PreviewImage</button>
      <button onClick={() => onPreviewVideo('video.mp4')}>PreviewVideo</button>
      <button onClick={onCloseAllMenus}>CloseAll</button>
    </div>
  )
}

describe('CanvasContext', () => {
  describe('Provider', () => {
    it('should render children', () => {
      render(
        <CanvasProvider>
          <div>Test Child</div>
        </CanvasProvider>
      )

      expect(screen.getByText('Test Child')).toBeInTheDocument()
    })
  })

  describe('canvasName', () => {
    it('should have default canvas name', () => {
      render(
        <CanvasProvider>
          <TestConsumer />
        </CanvasProvider>
      )

      expect(screen.getByTestId('canvasName')).toHaveTextContent('未命名的画布')
    })

    it('should set canvas name', () => {
      render(
        <CanvasProvider>
          <TestConsumer />
        </CanvasProvider>
      )

      fireEvent.click(screen.getByText('SetName'))
      expect(screen.getByTestId('canvasName')).toHaveTextContent('New Canvas')
    })
  })

  describe('contextMenu', () => {
    it('should have no context menu initially', () => {
      render(
        <CanvasProvider>
          <TestConsumer />
        </CanvasProvider>
      )

      expect(screen.getByTestId('contextMenu')).toHaveTextContent('null')
    })

    it('should show context menu', () => {
      render(
        <CanvasProvider>
          <TestConsumer />
        </CanvasProvider>
      )

      fireEvent.click(screen.getByText('ContextMenu'))
      expect(screen.getByTestId('contextMenu')).toHaveTextContent('node1:100,200')
    })

    it('should clear context menu', () => {
      render(
        <CanvasProvider>
          <TestConsumer />
        </CanvasProvider>
      )

      fireEvent.click(screen.getByText('ContextMenu'))
      expect(screen.getByTestId('contextMenu')).toHaveTextContent('node1:100,200')

      fireEvent.click(screen.getByText('ClearMenu'))
      expect(screen.getByTestId('contextMenu')).toHaveTextContent('null')
    })
  })

  describe('previewImage', () => {
    it('should have no image preview initially', () => {
      render(
        <CanvasProvider>
          <TestConsumer />
        </CanvasProvider>
      )

      expect(screen.getByTestId('previewImage')).toHaveTextContent('null')
    })

    it('should set image preview', () => {
      render(
        <CanvasProvider>
          <TestConsumer />
        </CanvasProvider>
      )

      fireEvent.click(screen.getByText('PreviewImage'))
      expect(screen.getByTestId('previewImage')).toHaveTextContent('image.jpg')
    })
  })

  describe('previewVideo', () => {
    it('should have no video preview initially', () => {
      render(
        <CanvasProvider>
          <TestConsumer />
        </CanvasProvider>
      )

      expect(screen.getByTestId('previewVideo')).toHaveTextContent('null')
    })

    it('should set video preview', () => {
      render(
        <CanvasProvider>
          <TestConsumer />
        </CanvasProvider>
      )

      fireEvent.click(screen.getByText('PreviewVideo'))
      expect(screen.getByTestId('previewVideo')).toHaveTextContent('video.mp4')
    })
  })

  describe('onCloseAllMenus', () => {
    it('should close all menus', () => {
      render(
        <CanvasProvider>
          <TestConsumer />
        </CanvasProvider>
      )

      // Open everything
      fireEvent.click(screen.getByText('ContextMenu'))
      fireEvent.click(screen.getByText('PreviewImage'))
      fireEvent.click(screen.getByText('PreviewVideo'))

      expect(screen.getByTestId('contextMenu')).not.toHaveTextContent('null')
      expect(screen.getByTestId('previewImage')).not.toHaveTextContent('null')
      expect(screen.getByTestId('previewVideo')).not.toHaveTextContent('null')

      // Close all
      fireEvent.click(screen.getByText('CloseAll'))

      expect(screen.getByTestId('contextMenu')).toHaveTextContent('null')
      expect(screen.getByTestId('previewImage')).toHaveTextContent('null')
      expect(screen.getByTestId('previewVideo')).toHaveTextContent('null')
    })
  })
})
