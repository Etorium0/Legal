import React from 'react';
import { Bot, User } from 'lucide-react';

interface ChatBubbleProps {
  message: string;
  sender: 'user' | 'ai';
  timestamp?: string;
}

export function ChatBubble({ message, sender, timestamp }: ChatBubbleProps) {
  const isAI = sender === 'ai';
  
  return (
    <div className={`flex gap-3 ${isAI ? 'justify-start' : 'justify-end'}`}>
      {isAI && (
        <div className="flex-shrink-0 w-8 h-8 bg-[--color-primary-600] rounded-full flex items-center justify-center">
          <Bot className="w-5 h-5 text-white" />
        </div>
      )}
      
      <div className={`flex flex-col gap-1 max-w-[75%]`}>
        <div 
          className={`
            px-4 py-3 rounded-2xl
            ${isAI 
              ? 'bg-white border border-[--color-border] text-[--color-text-primary]' 
              : 'bg-[--color-primary-600] text-white'
            }
          `}
        >
          <p className="whitespace-pre-wrap">{message}</p>
        </div>
        {timestamp && (
          <span className={`caption px-2 ${isAI ? 'text-left' : 'text-right'}`}>
            {timestamp}
          </span>
        )}
      </div>
      
      {!isAI && (
        <div className="flex-shrink-0 w-8 h-8 bg-[--color-primary-100] rounded-full flex items-center justify-center">
          <User className="w-5 h-5 text-[--color-primary-600]" />
        </div>
      )}
    </div>
  );
}
