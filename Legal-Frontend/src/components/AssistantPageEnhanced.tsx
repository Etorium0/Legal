import React, { useState, useEffect, useRef } from 'react';
import { Send, Mic, MicOff, Volume2, VolumeX, Sparkles, Power, FileText, ExternalLink, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import SidebarDark from './SidebarDark';
import HeaderBar from './HeaderBar';
import AvatarView from './AvatarView';
import NavigationMap from './NavigationMap';
import { Message, Triple } from '../types';
import { audioService } from '../services/audioService';
import { queryLegalAssistant } from '../services/legalService';
import { pantoMatrixService } from '../services/pantoMatrixService';
import { addHistory } from './HistoryStore';
import { authService } from '../services/authService';
import { API_BASE_URL } from '../config';

// Unit detail popup type
type UnitDetail = {
  document: { title?: string; type?: string };
  unit: { id?: string; level?: string; code?: string; text?: string };
};

const AssistantPage: React.FC = () => 
{
  const navigate = useNavigate();
  const [hasStarted, setHasStarted] = useState(true); // Auto-start for now to debug blank screen issue
  
  // Modal state for viewing law content
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [unitDetail, setUnitDetail] = useState<UnitDetail | null>(null);
  const [loadingUnit, setLoadingUnit] = useState(false);
  
  useEffect(() => 
  {
    console.log('AssistantPage: hasStarted changed to', hasStarted);
  }, [hasStarted]);

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
  const [navigationDestination, setNavigationDestination] = useState<string | null>(null);
  
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

  // Handle Android/WebView Events (Wake Word, ASR)
  useEffect(() => 
{
    const handleMessage = (event: MessageEvent) => 
{
      // Android sends data directly in event.data (parsed JSON if using new MessageEvent with data object)
      // MainActivity sends: window.dispatchEvent(new MessageEvent('message',{data:${payload}}));
      // payload is a JSON object.
      
      const data = event.data;
      if (!data) {return;}

      console.log('[Assistant] Received event:', data);

      if (data.type === 'wake') 
      {
        console.log('[Assistant] Wake word detected!');
        // If not already listening, start listening UI
        if (!isListening && !processingRef.current) 
        {
             setIsListening(true);
             setInputText('Đang nghe...');
             // Note: On Android, HotwordService starts capture automatically after wake
        }
      }
      else if (data.type === 'asr_partial') 
      {
        if (isListening) 
        {
            setInputText(data.text);
        }
      }
      else if (data.type === 'asr_final') 
      {
        if (isListening) 
        {
            if (!data.text || data.text.trim() === '') 
            {
                setInputText('Không nghe rõ, vui lòng thử lại.');
                setTimeout(() => 
                  {
                    setIsListening(false);
                    setInputText('');
                }, 1500);
            } 
            else 
            {
                setInputText(data.text);
                handleSendMessage(data.text);
                setIsListening(false);
            }
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [isListening]); // Re-bind when isListening changes to ensure we have latest state

  // Proactive Greeting on Start
  useEffect(() => 
  {
    if (hasStarted) 
    {
      const greeting = "Xin chào, tôi là trợ lý pháp luật. Nhấn mic để hỏi tôi bất cứ điều gì.";
      setIsSpeaking(true);
      
      setTimeout(() => 
      {
        try 
        {
          audioService.speak(greeting, () => 
          {
            setIsSpeaking(false);
          });
        }
        catch (e) 
        {
          console.error("AudioService speak error:", e);
          setIsSpeaking(false);
        }
      }, 1000);
    }
  }, [hasStarted]);

  // Fetch unit detail for popup
  const fetchUnitDetail = async (unitUrl: string) => 
  {
    // Extract unit ID from URL like "/unit/39e808c6-..."
    const match = unitUrl.match(/\/unit\/([a-f0-9-]+)/i);
    if (!match) 
    {
      console.warn("Invalid unit URL:", unitUrl);
      return;
    }
    
    const unitId = match[1];
    setLoadingUnit(true);
    setShowUnitModal(true);
    setUnitDetail(null);
    
    try 
    {
      const token = await authService.getValidAccessToken();
      const headers: Record<string, string> = {};
      if (token) 
      {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const res = await fetch(`${API_BASE_URL}/query/units/${unitId}`, { headers });
      if (!res.ok) 
      {
        throw new Error(`HTTP ${res.status}`);
      }
      
      const data = await res.json();
      setUnitDetail(data);
    } 
    catch (err) 
    {
      console.error("Failed to fetch unit:", err);
      setUnitDetail({
        document: { title: "Lỗi" },
        unit: { text: "Không thể tải nội dung điều luật. Vui lòng thử lại." }
      });
    } 
    finally 
    {
      setLoadingUnit(false);
    }
  };

  const handleMicClick = () => 
  {
    // Allow clicking to stop if listening
    if (isListening) 
    {
      audioService.stopListening();
      setIsListening(false);
      return;
    }

    // Force start even if processing (to interrupt)
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

    // Map Intent Handling - Open in-app navigation
    const mapMatch = textToSend.match(/(?:tìm|chỉ|dẫn|đưa)\s+đường\s+(?:đến|tới|tại|đi)?\s*(.+)/i);
    if (mapMatch && mapMatch[1]) 
{
      const location = mapMatch[1].trim();
      
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: `Đang mở bản đồ chỉ đường đến "${location}"...`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, userMsg, botMsg]);
      setInputText('');
      setIsLoading(false);
      processingRef.current = false;
      
      // Speak the response
      if (!isMuted) 
{
        audioService.speak(`Đang chỉ đường đến ${location}`);
      }
      
      // Open in-app navigation
      setNavigationDestination(location);
      return;
    }

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
    <div className="dark min-h-screen flex flex-col pb-20 sm:pb-0">
      {/* Navigation Map Overlay */}
      {navigationDestination && (
        <NavigationMap
          destination={navigationDestination}
          onClose={() => setNavigationDestination(null)}
        />
      )}
      
      <div className="min-h-screen bg-[#0C0F14] text-white flex-1 flex flex-col">
        <div className="flex flex-1">
          <SidebarDark />
          <div className="flex-1 min-h-screen flex flex-col pb-16 sm:pb-0">
            <HeaderBar />
            
            <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4 overflow-hidden">
              <div className="lg:w-1/3 min-h-[300px] lg:min-h-0">
                <AvatarView
                  isSpeaking={isSpeaking}
                  isListening={isListening}
                  videoUrl={avatarVideoUrl}
                  onVideoEnd={handleVideoEnd}
                />
              </div>

              <div className="lg:w-2/3 flex flex-col bg-surface/50 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
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

                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                        msg.role === 'user'
                          ? 'bg-primary text-white ml-12'
                          : 'bg-white/5 text-gray-100 mr-12 border border-white/10'
                      }`}
                    >
                      <p className="text-sm md:text-base leading-relaxed break-words whitespace-pre-wrap max-w-full overflow-hidden">{msg.text}</p>
                      
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
                                      fetchUnitDetail(source.url);
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

                <div className="p-4 bg-darker/80 border-t border-white/5 backdrop-blur-md">
                  <div className="relative">
                    <input
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      placeholder="Nhập câu hỏi hoặc nhấn mic để nói..."
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-12 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all"
                      disabled={isListening || isLoading}
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      <button
                        onClick={handleMicClick}
                        disabled={isLoading}
                        className={`p-2 rounded-lg transition-all ${
                          isListening 
                            ? 'bg-red-500/20 text-red-500 animate-pulse' 
                            : 'hover:bg-white/10 text-gray-400 hover:text-white'
                        }`}
                      >
                        {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                      </button>
                      {inputText.trim() && (
                        <button
                          onClick={() => handleSendMessage()}
                          disabled={isLoading}
                          className="p-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                        >
                          <Send className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 text-center">
                    <p className="text-[10px] text-gray-600">
                      AI có thể mắc lỗi. Hãy kiểm tra lại thông tin quan trọng.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Unit Detail Modal */}
      {showUnitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl max-h-[80vh] bg-[#1a1d24] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="sticky top-0 flex items-center justify-between p-4 bg-[#1a1d24] border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <FileText className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    {unitDetail?.document?.title || 'Đang tải...'}
                  </h3>
                  {unitDetail?.unit?.level && (
                    <p className="text-sm text-gray-400 capitalize">{unitDetail.unit.level}</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setShowUnitModal(false)}
                className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-80px)]">
              {loadingUnit ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                  <p className="text-gray-400">Đang tải nội dung...</p>
                </div>
              ) : unitDetail?.unit?.text ? (
                <div className="prose prose-invert prose-sm max-w-none">
                  <div className="text-gray-200 whitespace-pre-wrap leading-relaxed">
                    {unitDetail.unit.text}
                  </div>
                </div>
              ) : (
                <p className="text-gray-400 text-center py-8">Không có nội dung</p>
              )}
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 flex justify-end gap-3 p-4 bg-[#1a1d24] border-t border-white/10">
              <button
                onClick={() => 
                {
                  if (unitDetail?.unit?.id) 
                  {
                    window.open(`#/unit/${unitDetail.unit.id}`, '_blank');
                  }
                }}
                className="px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Mở trang đầy đủ
              </button>
              <button
                onClick={() => setShowUnitModal(false)}
                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssistantPage;
