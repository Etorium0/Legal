import React, { useState } from 'react'
import SidebarDark from './SidebarDark'
import HeaderBar from './HeaderBar'
import ChatInput from './ChatInput'
import ChatMessageView, { ChatMessage } from './ChatMessage'
import { addHistory } from './HistoryStore'
import { queryEndpoint } from '../api'

const AssistantPage: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Xin chào! Tôi là Legal AI Assistant. Tôi có thể giúp bạn tra cứu, tóm tắt và giải thích các quy định pháp luật Việt Nam. Bạn muốn hỏi gì?',
      timestamp: new Date().toISOString(),
    },
  ])
  const [loading, setLoading] = useState(false)

  async function handleSend(text: string) {
    if (!text.trim() || loading) return
    
    const userMsg: ChatMessage = { 
      id: Date.now().toString(), 
      role: 'user', 
      content: text, 
      timestamp: new Date().toISOString() 
    }
    setMessages(prev => [...prev, userMsg])
    addHistory({ question: text, answer: '', timestamp: Date.now() })
    setLoading(true)

    try {
      const result = await queryEndpoint(text)
      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result.answer,
        timestamp: new Date().toISOString(),
      }
      setMessages(prev => [...prev, aiMsg])
      addHistory({ question: text, answer: result.answer, timestamp: Date.now() })
    } catch (error) {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại sau.',
        timestamp: new Date().toISOString(),
      }
      setMessages(prev => [...prev, errorMsg])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="dark">
      <div className="min-h-screen bg-[#0C0F14] text-white">
        <div className="flex">
          <SidebarDark />
          <div className="flex-1 min-h-screen flex flex-col">
            <HeaderBar />
            <div className="flex-1 overflow-y-auto px-3 sm:px-4 md:px-6">
              <div className="mx-auto max-w-5xl py-4 space-y-4">
                {messages.map(m => (
                  <ChatMessageView key={m.id} message={m} />
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-white/60">
                      <span className="animate-pulse">Đang xử lý...</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <ChatInput onSend={handleSend} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default AssistantPage
