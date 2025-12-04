import React from 'react'

interface ChatBubbleProps {
  role: 'user' | 'assistant'
  message: string
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ role, message }) => 
{
  const isUser = role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[70%] rounded-lg px-4 py-2 text-sm ${isUser ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-900'}`}>
        {message}
      </div>
    </div>
  )
}

export default ChatBubble
