import React from 'react'

type Props = {
  role: 'user' | 'ai'
  text: string
}

export const MessageBubble: React.FC<Props> = ({ role, text }) => 
{
  const isUser = role === 'user'
  return (
    <div className={`w-full flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] md:max-w-[70%] rounded-xl px-4 py-3 text-sm leading-relaxed shadow-soft backdrop-blur-sm border transition-colors
        ${isUser ? 'bg-primary/20 border-primary/30 text-white' : 'bg-white/5 border-white/10 text-white/90'}`}
      >
        {text}
      </div>
    </div>
  )
}

export default MessageBubble
