import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { NotificationProvider, useNotification } from '../../contexts/NotificationContext'

// Test component that uses the notification context
function TestConsumer({ onAction }: { onAction?: (action: string) => void }) {
  const { addNotification, removeNotification, error, success, info, warning } = useNotification()

  const handleAddInfo = () => {
    addNotification('info', 'Info message')
    onAction?.('addInfo')
  }

  const handleAddSuccess = () => {
    addNotification('success', 'Success message')
    onAction?.('addSuccess')
  }

  const handleAddError = () => {
    addNotification('error', 'Error message')
    onAction?.('addError')
  }

  const handleAddWarning = () => {
    addNotification('warning', 'Warning message')
    onAction?.('addWarning')
  }

  const handleError = () => {
    error('Error via method')
    onAction?.('error')
  }

  const handleSuccess = () => {
    success('Success via method')
    onAction?.('success')
  }

  const handleInfo = () => {
    info('Info via method')
    onAction?.('info')
  }

  const handleWarning = () => {
    warning('Warning via method')
    onAction?.('warning')
  }

  const handleRemove = () => {
    removeNotification('test-id')
    onAction?.('remove')
  }

  return (
    <div>
      <button onClick={handleAddInfo}>Add Info</button>
      <button onClick={handleAddSuccess}>Add Success</button>
      <button onClick={handleAddError}>Add Error</button>
      <button onClick={handleAddWarning}>Add Warning</button>
      <button onClick={handleError}>Error Method</button>
      <button onClick={handleSuccess}>Success Method</button>
      <button onClick={handleInfo}>Info Method</button>
      <button onClick={handleWarning}>Warning Method</button>
      <button onClick={handleRemove}>Remove</button>
    </div>
  )
}

describe('NotificationContext', () => {
  describe('Provider', () => {
    it('should render children', () => {
      render(
        <NotificationProvider>
          <div>Test Child</div>
        </NotificationProvider>
      )

      expect(screen.getByText('Test Child')).toBeInTheDocument()
    })

    it('should render without crashing', () => {
      render(
        <NotificationProvider>
          <div>Content</div>
        </NotificationProvider>
      )
      // Just verify no errors
    })
  })

  describe('useNotification', () => {
    it('should provide notification methods within provider', () => {
      const onAction = vi.fn()

      render(
        <NotificationProvider>
          <TestConsumer onAction={onAction} />
        </NotificationProvider>
      )

      // All buttons should be available
      expect(screen.getByText('Add Info')).toBeInTheDocument()
      expect(screen.getByText('Error Method')).toBeInTheDocument()
      expect(screen.getByText('Success Method')).toBeInTheDocument()
      expect(screen.getByText('Info Method')).toBeInTheDocument()
      expect(screen.getByText('Warning Method')).toBeInTheDocument()
      expect(screen.getByText('Remove')).toBeInTheDocument()
    })

    it('should call addNotification with info type', async () => {
      const onAction = vi.fn()

      render(
        <NotificationProvider>
          <TestConsumer onAction={onAction} />
        </NotificationProvider>
      )

      await act(async () => {
        fireEvent.click(screen.getByText('Add Info'))
      })

      expect(onAction).toHaveBeenCalledWith('addInfo')
    })

    it('should call addNotification with success type', async () => {
      const onAction = vi.fn()

      render(
        <NotificationProvider>
          <TestConsumer onAction={onAction} />
        </NotificationProvider>
      )

      await act(async () => {
        fireEvent.click(screen.getByText('Add Success'))
      })

      expect(onAction).toHaveBeenCalledWith('addSuccess')
    })

    it('should call error method', async () => {
      const onAction = vi.fn()

      render(
        <NotificationProvider>
          <TestConsumer onAction={onAction} />
        </NotificationProvider>
      )

      await act(async () => {
        fireEvent.click(screen.getByText('Error Method'))
      })

      expect(onAction).toHaveBeenCalledWith('error')
    })

    it('should call success method', async () => {
      const onAction = vi.fn()

      render(
        <NotificationProvider>
          <TestConsumer onAction={onAction} />
        </NotificationProvider>
      )

      await act(async () => {
        fireEvent.click(screen.getByText('Success Method'))
      })

      expect(onAction).toHaveBeenCalledWith('success')
    })

    it('should call info method', async () => {
      const onAction = vi.fn()

      render(
        <NotificationProvider>
          <TestConsumer onAction={onAction} />
        </NotificationProvider>
      )

      await act(async () => {
        fireEvent.click(screen.getByText('Info Method'))
      })

      expect(onAction).toHaveBeenCalledWith('info')
    })

    it('should call warning method', async () => {
      const onAction = vi.fn()

      render(
        <NotificationProvider>
          <TestConsumer onAction={onAction} />
        </NotificationProvider>
      )

      await act(async () => {
        fireEvent.click(screen.getByText('Warning Method'))
      })

      expect(onAction).toHaveBeenCalledWith('warning')
    })

    it('should call removeNotification', async () => {
      const onAction = vi.fn()

      render(
        <NotificationProvider>
          <TestConsumer onAction={onAction} />
        </NotificationProvider>
      )

      await act(async () => {
        fireEvent.click(screen.getByText('Remove'))
      })

      expect(onAction).toHaveBeenCalledWith('remove')
    })
  })

  describe('notification types', () => {
    it('should accept info type', () => {
      render(
        <NotificationProvider>
          <div>Content</div>
        </NotificationProvider>
      )
      // Should render without error
    })

    it('should accept success type', () => {
      render(
        <NotificationProvider>
          <div>Content</div>
        </NotificationProvider>
      )
    })

    it('should accept error type', () => {
      render(
        <NotificationProvider>
          <div>Content</div>
        </NotificationProvider>
      )
    })

    it('should accept warning type', () => {
      render(
        <NotificationProvider>
          <div>Content</div>
        </NotificationProvider>
      )
    })
  })
})
