import React, { useRef, useEffect } from 'react';
import { FileText, Sparkles } from 'lucide-react';
import { Message } from '../../types';

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
  onSourceClick: (url: string) => void;
}

export const MessageList: React.FC<MessageListProps> = ({ messages, isLoading, onSourceClick }) =>
{
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () =>
  {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() =>
  {
    scrollToBottom();
  }, [messages, isLoading]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-6">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          <div
            className={`max-w-[85%] rounded-2xl px-4 py-3 overflow-hidden ${
              msg.role === 'user'
                ? 'bg-primary text-white ml-12'
                : 'bg-white/5 text-gray-100 mr-12 border border-white/10'
            }`}
          >
            <p className="text-sm md:text-base leading-relaxed whitespace-pre-wrap break-all overflow-wrap-anywhere">{msg.text}</p>
            
            {msg.triples && msg.triples.length > 0 && (
              <div className="mt-3 pt-3 border-t border-white/10">
                <p className="text-xs text-gray-400 mb-2 font-medium">Trích xuất thông tin:</p>
                <div className="space-y-2">
                  {msg.triples.map((triple, idx) => (
                    <div key={idx} className="bg-black/20 rounded p-2 text-xs flex flex-wrap gap-2 items-center">
                      <span className="text-blue-300">{triple.subject}</span>
                      <span className="text-gray-500">→</span>
                      <span className="text-purple-300">{triple.relation}</span>
                      <span className="text-gray-500">→</span>
                      <span className="text-emerald-300">{triple.object}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {msg.sources && msg.sources.length > 0 && (
              <div className="mt-3 pt-3 border-t border-white/10">
                <p className="text-xs text-gray-400 mb-2 font-medium">Nguồn tham khảo:</p>
                <div className="flex flex-col space-y-2">
                  {msg.sources.map((source, idx) => (
                    <button
                      key={idx}
                      onClick={() =>
                      {
                        if (source.url && source.url !== '#')
                        {
                          onSourceClick(source.url);
                        }
                      }}
                      className="group flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-blue-500/30 transition-all cursor-pointer text-left"
                    >
                      <div className="mt-1 p-1.5 rounded-md bg-blue-500/10 text-blue-400 group-hover:bg-blue-500/20 group-hover:scale-105 transition-all">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-blue-100 group-hover:text-blue-300 transition-colors line-clamp-2" title={source.document}>
                          {source.document}
                        </h4>
                        {source.unit && (
                          <p className="text-xs text-gray-400 mt-1 group-hover:text-gray-300">
                            {source.unit}
                          </p>
                        )}
                      </div>
                      <Sparkles className="w-4 h-4 text-gray-500 group-hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-all" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
      {isLoading && (
        <div className="flex justify-start">
          <div className="bg-white/5 text-gray-100 rounded-2xl px-4 py-3 border border-white/10 flex items-center gap-2">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
};
