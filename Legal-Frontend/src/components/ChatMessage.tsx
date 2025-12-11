import React from 'react'

export type ChatMessage = {
  id: string
  role: 'assistant' | 'user'
  content: string
  timestamp?: string
}

export const ChatMessageView: React.FC<{ message: ChatMessage }> = ({ message }) => 
{
  const isUser = message.role === 'user'
  return (
    <div className={`w-full flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[75%] md:max-w-[65%] flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        <div className="h-8 w-8 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center shrink-0">
          {isUser ? '🧑' : '🤖'}
        </div>
        <div className={`rounded-2xl border ${isUser ? 'border-white/10 bg-[#1B1F27]' : 'border-white/10 bg-[#1B1F27]'} p-4 text-sm text-white/90 shadow-soft`}
        >
          {message.content}
        </div>
      </div>
    </div>
  )
}

export default ChatMessageView
