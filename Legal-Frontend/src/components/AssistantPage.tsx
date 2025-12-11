import React, { useState, useRef } from 'react'
import SidebarDark from './SidebarDark'
import HeaderBar from './HeaderBar'
import ChatInput from './ChatInput'
import ChatMessageView, { ChatMessage } from './ChatMessage'
import { addHistory } from './HistoryStore'
import { queryEndpoint, ttsEndpoint, gesturesEndpoint } from '../api'

const AssistantPage: React.FC = () => 
{
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Xin chào! Tôi là Legal AI Assistant. Tôi có thể giúp bạn tra cứu, tóm tắt và giải thích các quy định pháp luật Việt Nam. Bạn muốn hỏi gì?',
      timestamp: new Date().toISOString(),
    },
  ])
  const [loading, setLoading] = useState(false)
  const [avatarEnabled, setAvatarEnabled] = useState(true)
  const [avatarVideoUrl, setAvatarVideoUrl] = useState<string | null>(null)
  const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  async function generateAvatarResponse(text: string) 
{
    setIsGeneratingAvatar(true)
    try 
{
      // Generate TTS audio
      const { url: audioUrl, blob: audioBlob } = await ttsEndpoint(text)
      
      // Play audio
      if (!audioRef.current) 
{
        audioRef.current = new Audio()
      }
      audioRef.current.src = audioUrl
      audioRef.current.play().catch(err => console.warn('Audio play failed:', err))
      
      // Generate gesture video
      const { url: videoUrl } = await gesturesEndpoint(audioBlob)
      setAvatarVideoUrl(videoUrl)
    }
 catch (error) 
{
      console.error('Avatar generation failed:', error)
    }
 finally 
{
      setIsGeneratingAvatar(false)
    }
  }

  async function handleSend(text: string) 
{
    if (!text.trim() || loading) {return}
    
    const userMsg: ChatMessage = { 
      id: Date.now().toString(), 
      role: 'user', 
      content: text, 
      timestamp: new Date().toISOString() 
    }
    setMessages(prev => [...prev, userMsg])
    addHistory({ question: text, answer: '', timestamp: Date.now() })
    setLoading(true)

    try 
{
      const result = await queryEndpoint(text)
      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result.answer,
        timestamp: new Date().toISOString(),
      }
      setMessages(prev => [...prev, aiMsg])
      addHistory({ question: text, answer: result.answer, timestamp: Date.now() })
      
      // Generate avatar speech and gestures if enabled
      if (avatarEnabled && result.answer) 
{
        generateAvatarResponse(result.answer)
      }
    }
 catch (error) 
{
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại sau.',
        timestamp: new Date().toISOString(),
      }
      setMessages(prev => [...prev, errorMsg])
    }
 finally 
{
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
            
            {/* Avatar Video Player */}
            {avatarEnabled && (
              <div className="border-b border-white/10 bg-[#0C0F14] p-4">
                <div className="mx-auto max-w-3xl">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">🎭 Avatar Trợ lý ảo</span>
                      {isGeneratingAvatar && (
                        <span className="text-xs text-white/60 animate-pulse">Đang tạo...</span>
                      )}
                    </div>
                    <button
                      onClick={() => 
{
                        setAvatarEnabled(false)
                        setAvatarVideoUrl(null)
                        if (audioRef.current) 
{
                          audioRef.current.pause()
                        }
                      }}
                      className="text-xs px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 transition-colors"
                    >
                      Ẩn Avatar
                    </button>
                  </div>
                  
                  {avatarVideoUrl ? (
                    <div className="relative aspect-video bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl overflow-hidden border border-white/10">
                      {avatarVideoUrl.endsWith('.mp4') || avatarVideoUrl.includes('video') ? (
                        <video
                          src={avatarVideoUrl}
                          className="w-full h-full object-cover"
                          autoPlay
                          loop
                          muted={false}
                        />
                      ) : (
                        <img
                          src={avatarVideoUrl}
                          alt="Avatar"
                          className="w-full h-full object-contain"
                        />
                      )}
                      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                        <div className="text-xs text-white/80 bg-black/50 px-2 py-1 rounded">PantoMatrix Avatar</div>
                      </div>
                    </div>
                  ) : (
                    <div className="aspect-video bg-gradient-to-br from-indigo-900/20 to-purple-900/20 rounded-xl border border-white/10 flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-6xl mb-3">🤖</div>
                        <p className="text-sm text-white/60">Avatar sẽ xuất hiện khi có câu trả lời</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            
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
            
            {/* Avatar Toggle */}
            {!avatarEnabled && (
              <div className="px-3 sm:px-4 md:px-6 py-2 border-t border-white/10">
                <div className="mx-auto max-w-5xl">
                  <button
                    onClick={() => setAvatarEnabled(true)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/30 transition-colors"
                  >
                    🎭 Hiển thị Avatar Trợ lý ảo (PantoMatrix)
                  </button>
                </div>
              </div>
            )}
            
            <ChatInput onSend={handleSend} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default AssistantPage
