import React from 'react'

export type ChatMessage = {
  id: string
  role: 'assistant' | 'user'
  content: string
  timestamp?: string
  references?: { title: string; url: string }[]
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
        <div className={`flex flex-col gap-2 ${isUser ? 'items-end' : 'items-start'}`}>
          <div className={`rounded-2xl border ${isUser ? 'border-white/10 bg-[#1B1F27]' : 'border-white/10 bg-[#1B1F27]'} p-4 text-sm text-white/90 shadow-soft`}
          >
            <div className="whitespace-pre-wrap">{message.content}</div>
          </div>
          
          {!isUser && message.references && message.references.length > 0 && (
            <div className="mt-1 ml-1 flex flex-col gap-1">
              <span className="text-xs text-white/50 font-medium uppercase tracking-wider">Nguồn tham khảo:</span>
              <div className="flex flex-wrap gap-2">
                {message.references.map((ref, idx) => (
                  <a 
                    key={idx}
                    href={ref.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded border border-indigo-500/30 hover:bg-indigo-500/30 transition-colors truncate max-w-[200px]"
                    title={ref.title}
                  >
                    {ref.title}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ChatMessageView
