import React, { useState, useEffect, useRef } from 'react';
import { Send, Mic, MicOff, Volume2, VolumeX, Sparkles, Power } from 'lucide-react';
import SidebarDark from './SidebarDark';
import HeaderBar from './HeaderBar';
import AvatarView from './AvatarView';
import { Message, Triple } from '../types';
import { audioService } from '../services/audioService';
import { queryLegalAssistant } from '../services/legalService';
import { pantoMatrixService } from '../services/pantoMatrixService';
import { addHistory } from './HistoryStore';

const AssistantPage: React.FC = () => 
{
  const [hasStarted, setHasStarted] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'Xin chào! Tôi là Trợ lý Pháp luật Ảo. Nhấn nút mic để bắt đầu nói chuyện với tôi.',
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [avatarVideoUrl, setAvatarVideoUrl] = useState<string | null>(null);
  const [_currentTriples, setCurrentTriples] = useState<Triple[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const processingRef = useRef(false);

  const scrollToBottom = () => 
{
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => 
{
    scrollToBottom();
  }, [messages]);

  // Proactive Greeting on Start
  useEffect(() => 
{
    if (hasStarted) 
{
      const greeting = "Xin chào, tôi là trợ lý pháp luật. Nhấn mic để hỏi tôi bất cứ điều gì.";
      setIsSpeaking(true);
      
      setTimeout(() => 
{
        audioService.speak(greeting, () => 
{
          setIsSpeaking(false);
        });
      }, 1000);
    }
  }, [hasStarted]);

  // SOPHIA-STYLE: Click to Talk
  const handleMicClick = () => 
{
    if (processingRef.current || isListening) {return;}

    console.log('[Assistant] Mic clicked - starting to listen');
    setIsListening(true);
    setInputText('');

    audioService.startListening(
      (transcript, isFinal) => 
{
        console.log('[Assistant] Transcript:', transcript, 'Final:', isFinal);
        setInputText(transcript);
        
        // Auto-send when final (người nói xong)
        if (isFinal && transcript.trim().length > 0) 
{
          handleSendMessage(transcript);
        }
      },
      (err) => 
{
        console.error('[Assistant] Listening error:', err);
        setIsListening(false);
      },
      () => 
{
        console.log('[Assistant] Listening ended');
        setIsListening(false);
      }
    );
  };

  const handleSendMessage = async (textOverride?: string) => 
{
    const textToSend = textOverride || inputText;
    if (!textToSend.trim() || processingRef.current) {return;}

    processingRef.current = true;
    audioService.stopListening();
    setIsListening(false);

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: textToSend,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    try 
{
      const response = await queryLegalAssistant(userMsg.text);
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: response.text || "Xin lỗi, tôi không thể trả lời lúc này.",
        timestamp: new Date(),
        sources: response.sources,
        triples: response.triples
      };

      setMessages(prev => [...prev, botMsg]);
      addHistory({ question: textToSend, answer: botMsg.text, timestamp: Date.now() });

      if (response.triples) 
{
        setCurrentTriples(response.triples);
      }

      // Handle TTS only (PantoMatrix video disabled)
      if (!isMuted && botMsg.text) 
{
        setIsSpeaking(true);
        audioService.speak(botMsg.text, () => setIsSpeaking(false));
      }
    }
 catch (error) 
{
      console.error('handleSendMessage error:', error);
      const errorMsg: Message = {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        text: "Xin lỗi, đã xảy ra lỗi khi xử lý yêu cầu của bạn.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
    }
 finally 
{
      setIsLoading(false);
      processingRef.current = false;
    }
  };

  const toggleListening = () => 
{
    if (isListening) 
{
      audioService.stopListening();
      setIsListening(false);
    }
 else 
{
      handleMicClick();
    }
  };

  const handleVideoEnd = () => 
{
    setAvatarVideoUrl(null);
    setIsSpeaking(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => 
{
    if (e.key === 'Enter' && !e.shiftKey) 
{
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Welcome Screen
  if (!hasStarted) 
{
    return (
      <div className="h-screen w-full bg-darker flex flex-col items-center justify-center text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/40 via-darker to-darker z-0"></div>
        <div className="absolute w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse z-0"></div>
        
        <div className="z-10 flex flex-col items-center space-y-8 p-4 text-center">
          <div className="relative">
            <div className="w-32 h-32 rounded-full border-4 border-blue-500/30 flex items-center justify-center animate-[spin_10s_linear_infinite]">
              <div className="w-24 h-24 rounded-full border-t-4 border-blue-400"></div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Mic className="w-10 h-10 text-white animate-pulse" />
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
              Legal Virtual Assistant
            </h1>
            <p className="text-gray-400 text-lg max-w-md mx-auto">
              Trợ lý pháp luật ảo với khả năng tương tác giọng nói tự nhiên
            </p>
          </div>

          <button 
            onClick={() => setHasStarted(true)}
            className="group relative px-8 py-4 bg-white text-darker font-bold rounded-full text-lg shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_40px_rgba(255,255,255,0.5)] hover:scale-105 transition-all duration-300 flex items-center gap-3"
          >
            <Power className="w-5 h-5 group-hover:text-blue-600 transition-colors" />
            Bắt đầu Tư vấn
          </button>
          
          <p className="text-xs text-gray-600 mt-8">
            Bấm "Bắt đầu" để kích hoạt Microphone và Loa
          </p>
        </div>
      </div>
    );
  }

  // Main Chat Interface
  return (
    <div className="dark">
      <div className="min-h-screen bg-[#0C0F14] text-white">
        <div className="flex">
          <SidebarDark />
          <div className="flex-1 min-h-screen flex flex-col">
            <HeaderBar />
            
            <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4 overflow-hidden">
              {/* Avatar Section */}
              <div className="lg:w-1/3 min-h-[300px] lg:min-h-0">
                <AvatarView
                  isSpeaking={isSpeaking}
                  isListening={isListening}
                  videoUrl={avatarVideoUrl}
                  onVideoEnd={handleVideoEnd}
                />
              </div>

              {/* Chat Section */}
              <div className="lg:w-2/3 flex flex-col bg-surface/50 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
                {/* Listening Overlay */}
                {isListening && (
                  <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center text-white animate-in fade-in duration-200">
                    <div className="w-24 h-24 rounded-full bg-red-500 animate-ping absolute opacity-20"></div>
                    <div className="w-20 h-20 rounded-full bg-gradient-to-r from-red-500 to-pink-500 flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.5)] z-10">
                      <Mic className="w-8 h-8 text-white" />
                    </div>
                    <p className="mt-8 text-xl font-light tracking-wider">Đang lắng nghe...</p>
                    <p className="mt-2 text-sm text-gray-400">"{inputText || '...'}"</p>
                    <button 
                      onClick={() => 
{
                        setIsListening(false);
                        audioService.stopListening();
                      }}
                      className="mt-8 px-6 py-2 bg-gray-800 rounded-full text-sm hover:bg-gray-700 transition-colors border border-gray-700"
                    >
                      Hủy bỏ
                    </button>
                  </div>
                )}

                {/* Header */}
                <div className="p-4 bg-darker/80 border-b border-white/5 flex justify-between items-center backdrop-blur-md">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-semibold text-gray-200 tracking-wide uppercase">Lịch sử hội thoại</h3>
                  </div>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => 
{
                        setIsMuted(!isMuted);
                        audioService.stopSpeaking();
                      }}
                      className="p-2 hover:bg-white/10 rounded-full transition-colors"
                    >
                      {isMuted ? <VolumeX className="w-4 h-4 text-gray-400" /> : <Volume2 className="w-4 h-4 text-primary" />}
                    </button>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                  {messages.map((msg) => (
                    <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} group`}>
                      <div className="text-[10px] text-gray-500 mb-1 px-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {msg.role === 'user' ? 'Bạn' : 'AI'} • {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      
                      <div 
                        className={`max-w-[85%] p-4 rounded-2xl shadow-sm backdrop-blur-sm border ${
                          msg.role === 'user' 
                            ? 'bg-blue-600/90 text-white rounded-br-none border-blue-500/50' 
                            : 'bg-gray-800/80 text-gray-100 rounded-bl-none border-white/10'
                        }`}
                      >
                        <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                      </div>
                      
                      {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && (
                        <div className="mt-3 ml-1 max-w-[85%]">
                          <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider block mb-2">Trích dẫn</span>
                          <div className="grid gap-2 sm:grid-cols-2">
                            {msg.sources.map((src, idx) => (
                              <a
                                key={idx}
                                href={src.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors p-3"
                              >
                                <div className="text-xs font-semibold text-gray-200 truncate">{src.document}</div>
                                <div className="text-[11px] text-gray-400 truncate mt-1">{src.unit}</div>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex items-start space-x-2 p-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-400 to-purple-500 flex items-center justify-center animate-pulse">
                        <span className="text-[10px]">AI</span>
                      </div>
                      <div className="bg-gray-800/50 p-3 rounded-2xl rounded-bl-none">
                        <div className="flex space-x-1">
                          <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                          <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-75"></div>
                          <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-150"></div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input Area - Sophia Style */}
                <div className="p-4 bg-darker/90 backdrop-blur-xl border-t border-white/10">
                  <div className="flex items-center gap-3">
                    {/* MIC BUTTON - Sophia Style Click to Talk */}
                    <button
                      onClick={toggleListening}
                      disabled={isLoading || isGeneratingVideo || isSpeaking}
                      className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg ${
                        isListening 
                          ? 'bg-red-500 text-white scale-110 ring-4 ring-red-500/30 animate-pulse' 
                          : 'bg-gradient-to-br from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 hover:scale-105 border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed'
                      }`}
                      title={isListening ? "Đang nghe... (tự động dừng sau 10s)" : "Click để nói"}
                    >
                      {isListening ? (
                        <MicOff className="w-5 h-5 animate-pulse" />
                      ) : (
                        <Mic className="w-5 h-5" />
                      )}
                    </button>
                    
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={handleKeyPress}
                        placeholder={isListening ? "Đang lắng nghe..." : "Nhập câu hỏi hoặc click mic..."}
                        className="w-full bg-black/20 text-white placeholder-gray-500 border border-gray-600 rounded-full pl-5 pr-12 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:bg-black/40 transition-all"
                        disabled={isLoading || isListening || isGeneratingVideo}
                      />
                      <button
                        onClick={() => handleSendMessage()}
                        disabled={!inputText.trim() || isLoading}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-blue-500 hover:text-blue-400 disabled:opacity-30 transition-colors"
                      >
                        <Send className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  <div className="text-center mt-2">
                    <p className="text-[10px] text-gray-600">
                      {isListening 
                        ? "🎤 Đang nghe bạn nói... (tự động dừng sau 10s hoặc 6s kể từ khi bắt đầu nói)"
                        : "💡 Click mic để nói, hoặc gõ câu hỏi"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssistantPage;
