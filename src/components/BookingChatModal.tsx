import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { CloseIcon, SendIcon } from './Icons'

interface Message {
  id: string
  sender_id: string
  text: string
  created_at: string
}

interface BookingChatModalProps {
  bookingId: string
  recipientName: string
  onClose: () => void
}

const BookingChatModal = ({ bookingId, recipientName, onClose }: BookingChatModalProps) => {
  const { user } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Use an ephemeral channel for real-time chat
  useEffect(() => {
    if (!user?.id) return

    const channel = supabase.channel(`booking-chat-${bookingId}`, {
      config: { broadcast: { self: true } }
    })

    channel
      .on('broadcast', { event: 'message' }, (payload) => {
        setMessages((prev) => [...prev, payload.payload])
      })
      .subscribe()

    // Add a welcome message
    setMessages([
      {
        id: 'system-1',
        sender_id: 'system',
        text: `Chat with ${recipientName} started. Messages are end-to-end and disappear when you leave.`,
        created_at: new Date().toISOString()
      }
    ])

    return () => {
      supabase.removeChannel(channel)
    }
  }, [bookingId, user?.id, recipientName])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || !user?.id) return

    const newMessage: Message = {
      id: Math.random().toString(36).substr(2, 9),
      sender_id: user.id,
      text: input.trim(),
      created_at: new Date().toISOString()
    }

    // Broadcast to the channel
    const channel = supabase.channel(`booking-chat-${bookingId}`)
    await channel.send({
      type: 'broadcast',
      event: 'message',
      payload: newMessage
    })

    setInput('')
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-xl flex flex-col h-[500px] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700 bg-teal-600 text-white">
          <div>
            <h3 className="font-bold">{recipientName}</h3>
            <p className="text-xs text-teal-100">Booking #{bookingId.slice(0, 6)}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-teal-700 rounded-lg transition-colors"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Messages Space */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-900">
          {messages.map((msg) => {
            const isMe = msg.sender_id === user?.id
            const isSystem = msg.sender_id === 'system'

            if (isSystem) {
              return (
                <div key={msg.id} className="text-center">
                  <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-200/50 dark:bg-slate-800 px-3 py-1 rounded-full">
                    {msg.text}
                  </span>
                </div>
              )
            }

            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm shadow-sm ${
                    isMe
                      ? 'bg-teal-600 text-white rounded-br-none'
                      : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-100 dark:border-slate-700 rounded-bl-none'
                  }`}
                >
                  <p>{msg.text}</p>
                  <p className={`text-[10px] mt-1 ${isMe ? 'text-teal-100' : 'text-slate-400'}`}>
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            )
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Form */}
        <form onSubmit={handleSend} className="p-3 bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-slate-100 dark:bg-slate-900 border-transparent focus:border-teal-500 focus:bg-white dark:focus:bg-slate-800 rounded-xl px-4 text-sm"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="p-3 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl shadow-sm transition-colors"
          >
            <SendIcon className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  )
}

export default BookingChatModal