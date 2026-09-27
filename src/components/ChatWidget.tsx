import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/context/AuthContext'
import { ChatBubbleIcon, CloseIcon, SendIcon } from './Icons'
import { chatbot } from '@/lib/chatbot'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  quickReplies?: string[]
}

const ChatWidget = () => {
  const { isAuthenticated, user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Show initial suggestions on first open
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const suggestions = chatbot.getInitialSuggestions()
      setMessages([{
        role: 'assistant',
        content: 'Hello! 👋 Welcome to Sahaay. How can I help you today?',
        timestamp: Date.now(),
        quickReplies: suggestions,
      }])
    }
  }, [isOpen, messages.length])

  // Only show for authenticated customers
  if (!isAuthenticated || user?.role !== 'customer') {
    return null
  }

  const handleSendMessage = async (messageText?: string) => {
    const text = messageText || input.trim()
    if (!text || loading) return

    // Add user message
    const userMessage: Message = {
      role: 'user',
      content: text,
      timestamp: Date.now(),
    }
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      // Get chatbot response
      const response = await chatbot.sendMessage(text)
      const assistantMessage: Message = {
        role: 'assistant',
        content: response.message,
        timestamp: Date.now(),
        quickReplies: response.quickReplies,
      }
      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      console.error('Chatbot error:', error)
      const errorMessage: Message = {
        role: 'assistant',
        content: "I'm having trouble right now. Please try again.",
        timestamp: Date.now(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleSendMessage()
  }

  const handleQuickReply = (reply: string) => {
    handleSendMessage(reply)
  }

  const handleClearChat = () => {
    setMessages([])
    chatbot.reset()
    // Re-show initial suggestions
    const suggestions = chatbot.getInitialSuggestions()
    setMessages([{
      role: 'assistant',
      content: 'Hello! 👋 Welcome to Sahaay. How can I help you today?',
      timestamp: Date.now(),
      quickReplies: suggestions,
    }])
  }

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-40 flex items-center justify-center w-14 h-14 rounded-full shadow-lg transition-all duration-300 hover:scale-110"
        style={{
          backgroundColor: 'var(--color-primary)',
          color: 'white',
          animation: isOpen ? 'none' : 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        }}
        aria-label="Open chat"
        title="Chat with us"
      >
        {isOpen ? <CloseIcon className="w-6 h-6" /> : <ChatBubbleIcon className="w-6 h-6" />}
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div
          className="fixed bottom-24 right-6 z-40 w-96 max-w-[calc(100vw-32px)] h-[28rem] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          style={{
            backgroundColor: 'var(--color-bg)',
            border: '1px solid var(--color-border)',
            animation: 'slideIn 0.3s ease-out',
          }}
        >
          {/* Header */}
          <div
            className="px-5 py-4 flex items-center justify-between border-b"
            style={{
              backgroundColor: 'var(--color-primary)',
              color: 'white',
              borderColor: 'var(--color-border)',
            }}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-white bg-opacity-20 flex items-center justify-center">
                <ChatBubbleIcon className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <h3 className="font-semibold text-sm">Sahaay Support</h3>
                <p className="text-xs opacity-90">Instant help, 24/7</p>
              </div>
            </div>
            <button
              onClick={handleClearChat}
              className="text-xs px-2 py-1 rounded hover:bg-white hover:bg-opacity-20 transition-colors"
              title="Clear chat"
            >
              Clear
            </button>
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg, idx) => (
              <div key={idx}>
                <div
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`px-4 py-2.5 rounded-2xl max-w-[85%] text-sm break-words ${
                      msg.role === 'user'
                        ? 'rounded-br-md'
                        : 'rounded-bl-md'
                    }`}
                    style={{
                      backgroundColor:
                        msg.role === 'user'
                          ? 'var(--color-primary)'
                          : 'var(--color-bg-secondary)',
                      color:
                        msg.role === 'user'
                          ? 'white'
                          : 'var(--color-text)',
                    }}
                  >
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  </div>
                </div>

                {/* Quick Replies */}
                {msg.role === 'assistant' && msg.quickReplies && msg.quickReplies.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2 ml-1">
                    {msg.quickReplies.map((reply, replyIdx) => (
                      <button
                        key={replyIdx}
                        onClick={() => handleQuickReply(reply)}
                        disabled={loading}
                        className="px-3 py-1.5 text-xs font-medium rounded-full transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{
                          backgroundColor: 'var(--color-primary-light)',
                          color: 'var(--color-primary)',
                          border: '1px solid var(--color-primary)',
                        }}
                      >
                        {reply}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div
                  className="px-4 py-3 rounded-2xl rounded-bl-md text-sm"
                  style={{
                    backgroundColor: 'var(--color-bg-secondary)',
                    color: 'var(--color-text)',
                  }}
                >
                  <div className="flex gap-1.5">
                    <span className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: 'var(--color-primary)', animationDelay: '0ms' }} />
                    <span className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: 'var(--color-primary)', animationDelay: '150ms' }} />
                    <span className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: 'var(--color-primary)', animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Form */}
          <form
            onSubmit={handleSubmit}
            className="p-4 border-t flex gap-2"
            style={{
              backgroundColor: 'var(--color-bg)',
              borderColor: 'var(--color-border)',
            }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your question..."
              disabled={loading}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 transition-colors disabled:opacity-50"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                color: 'var(--color-text)',
                border: '1px solid var(--color-border)',
              }}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="px-4 py-2.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
              style={{
                backgroundColor: 'var(--color-primary)',
                color: 'white',
              }}
              aria-label="Send message"
            >
              <SendIcon className="w-5 h-5" />
            </button>
          </form>

          <style>{`
            @keyframes slideIn {
              from {
                opacity: 0;
                transform: translateY(10px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }
            @keyframes pulse {
              0%, 100% {
                opacity: 1;
                box-shadow: 0 0 0 0 rgba(14, 116, 144, 0.4);
              }
              50% {
                opacity: 0.9;
                box-shadow: 0 0 0 10px rgba(14, 116, 144, 0);
              }
            }
          `}</style>
        </div>
      )}
    </>
  )
}

export default ChatWidget
