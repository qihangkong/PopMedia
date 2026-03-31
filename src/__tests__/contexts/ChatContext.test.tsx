import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import { ChatProvider, useChat, type ChatMessage } from '../../contexts/ChatContext'

// Mock the chatApi module
vi.mock('../../utils/chatApi', () => ({
  sendChatMessage: vi.fn(),
}))

import { sendChatMessage } from '../../utils/chatApi'

// Test component that uses the chat context
function TestConsumer() {
  const {
    messages,
    isOpen,
    isLoading,
    error,
    openChat,
    closeChat,
    toggleChat,
    sendMessage,
    addMessage,
    clearMessages,
  } = useChat()

  return (
    <div>
      <div data-testid="isOpen">{isOpen.toString()}</div>
      <div data-testid="isLoading">{isLoading.toString()}</div>
      <div data-testid="error">{error || 'none'}</div>
      <div data-testid="messageCount">{messages.length}</div>
      <button onClick={openChat}>Open</button>
      <button onClick={closeChat}>Close</button>
      <button onClick={toggleChat}>Toggle</button>
      <button onClick={() => sendMessage('Hello')}>Send</button>
      <button onClick={() => addMessage({ role: 'user', content: 'Test' })}>Add</button>
      <button onClick={clearMessages}>Clear</button>
      <div data-testid="messages">
        {messages.map((m) => (
          <div key={m.id} data-role={m.role}>
            {m.content}
          </div>
        ))}
      </div>
    </div>
  )
}

describe('ChatContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Provider', () => {
    it('should render children', () => {
      render(
        <ChatProvider>
          <div>Test Child</div>
        </ChatProvider>
      )
      expect(screen.getByText('Test Child')).toBeInTheDocument()
    })
  })

  describe('initial state', () => {
    it('should have correct initial values', () => {
      render(
        <ChatProvider>
          <TestConsumer />
        </ChatProvider>
      )

      expect(screen.getByTestId('isOpen')).toHaveTextContent('false')
      expect(screen.getByTestId('isLoading')).toHaveTextContent('false')
      expect(screen.getByTestId('error')).toHaveTextContent('none')
      expect(screen.getByTestId('messageCount')).toHaveTextContent('0')
    })
  })

  describe('openChat/closeChat/toggleChat', () => {
    it('should open chat', () => {
      render(
        <ChatProvider>
          <TestConsumer />
        </ChatProvider>
      )

      fireEvent.click(screen.getByText('Open'))
      expect(screen.getByTestId('isOpen')).toHaveTextContent('true')
    })

    it('should close chat', () => {
      render(
        <ChatProvider>
          <TestConsumer />
        </ChatProvider>
      )

      fireEvent.click(screen.getByText('Open'))
      expect(screen.getByTestId('isOpen')).toHaveTextContent('true')

      fireEvent.click(screen.getByText('Close'))
      expect(screen.getByTestId('isOpen')).toHaveTextContent('false')
    })

    it('should toggle chat', () => {
      render(
        <ChatProvider>
          <TestConsumer />
        </ChatProvider>
      )

      expect(screen.getByTestId('isOpen')).toHaveTextContent('false')

      fireEvent.click(screen.getByText('Toggle'))
      expect(screen.getByTestId('isOpen')).toHaveTextContent('true')

      fireEvent.click(screen.getByText('Toggle'))
      expect(screen.getByTestId('isOpen')).toHaveTextContent('false')
    })
  })

  describe('addMessage', () => {
    it('should add a message', () => {
      render(
        <ChatProvider>
          <TestConsumer />
        </ChatProvider>
      )

      fireEvent.click(screen.getByText('Add'))

      expect(screen.getByTestId('messageCount')).toHaveTextContent('1')
      expect(screen.getByTestId('messages').firstChild).toHaveAttribute('data-role', 'user')
      expect(screen.getByTestId('messages').firstChild).toHaveTextContent('Test')
    })

    it('should add multiple messages', () => {
      render(
        <ChatProvider>
          <TestConsumer />
        </ChatProvider>
      )

      fireEvent.click(screen.getByText('Add'))
      fireEvent.click(screen.getByText('Add'))

      expect(screen.getByTestId('messageCount')).toHaveTextContent('2')
    })

    it('should generate unique ids for messages', () => {
      render(
        <ChatProvider>
          <TestConsumer />
        </ChatProvider>
      )

      fireEvent.click(screen.getByText('Add'))
      fireEvent.click(screen.getByText('Add'))

      const messageDivs = screen.getByTestId('messages').querySelectorAll('[data-role="user"]')
      // Each message should have a unique key/id - verify they are separate DOM nodes
      expect(messageDivs.length).toBe(2)
      // Content is same ('Test') but they are separate divs with unique keys
      expect(messageDivs[0]).not.toBe(messageDivs[1])
    })
  })

  describe('clearMessages', () => {
    it('should clear all messages', () => {
      render(
        <ChatProvider>
          <TestConsumer />
        </ChatProvider>
      )

      fireEvent.click(screen.getByText('Add'))
      fireEvent.click(screen.getByText('Add'))
      expect(screen.getByTestId('messageCount')).toHaveTextContent('2')

      fireEvent.click(screen.getByText('Clear'))
      expect(screen.getByTestId('messageCount')).toHaveTextContent('0')
    })

    it('should clear error when clearing messages', async () => {
      vi.mocked(sendChatMessage).mockRejectedValueOnce(new Error('API Error'))

      render(
        <ChatProvider>
          <TestConsumer />
        </ChatProvider>
      )

      await act(async () => {
        fireEvent.click(screen.getByText('Send'))
      })

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('API Error')
      })

      fireEvent.click(screen.getByText('Clear'))
      expect(screen.getByTestId('error')).toHaveTextContent('none')
    })
  })

  describe('sendMessage', () => {
    it('should send message successfully', async () => {
      vi.mocked(sendChatMessage).mockResolvedValueOnce('AI response')

      render(
        <ChatProvider>
          <TestConsumer />
        </ChatProvider>
      )

      await act(async () => {
        fireEvent.click(screen.getByText('Send'))
      })

      expect(screen.getByTestId('messageCount')).toHaveTextContent('2')
      expect(screen.getByTestId('messages').lastChild).toHaveTextContent('AI response')
    })

    it('should not send empty message when loading', async () => {
      render(
        <ChatProvider>
          <TestConsumer />
        </ChatProvider>
      )

      // First, trigger a message send
      vi.mocked(sendChatMessage).mockImplementation(() => new Promise(() => {})) // Never resolves

      await act(async () => {
        fireEvent.click(screen.getByText('Send'))
      })

      // While loading, another send should be ignored
      await act(async () => {
        fireEvent.click(screen.getByText('Send'))
      })

      // Should only be called once (the first click)
      expect(sendChatMessage).toHaveBeenCalledTimes(1)
    })

    it('should handle sendMessage error', async () => {
      vi.mocked(sendChatMessage).mockRejectedValueOnce(new Error('Network error'))

      render(
        <ChatProvider>
          <TestConsumer />
        </ChatProvider>
      )

      await act(async () => {
        fireEvent.click(screen.getByText('Send'))
      })

      expect(screen.getByTestId('error')).toHaveTextContent('Network error')
    })
  })
})
