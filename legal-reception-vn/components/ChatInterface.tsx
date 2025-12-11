
import React, { useState, useEffect, useRef } from 'react';
import { Send, Mic, MicOff, Volume2, VolumeX, Loader, Sparkles, Radio } from 'lucide-react';
import { Message, Triple } from '../types';
import { audioService } from '../services/audioService';
import { queryLegalAssistant } from '../services/legalService';
import { pantoMatrixService } from '../services/pantoMatrixService';

interface ChatInterfaceProps {
  onNewTriples: (triples: Triple[]) => void;
  setGlobalIsSpeaking: (val: boolean) => void;
  setGlobalIsListening: (val: boolean) => void;
  setAvatarVideoUrl?: (url: string | null) => void;
  autoStart?: boolean;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  onNewTriples, 
  setGlobalIsSpeaking, 
  setGlobalIsListening,
  setAvatarVideoUrl,
  autoStart
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'Xin chào! Tôi là Trợ lý Pháp luật Ảo. Bạn có thể nói "Hey Legal" hoặc "Trợ lý ơi" để gọi tôi bất cứ lúc nào.',
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  
  // New State for Wake Word
  const [wakeWordMode, setWakeWordMode] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const processingRef = useRef(false); // To prevent double submission from speech

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Proactive Greeting & Wake Word Initialization
  useEffect(() => {
    if (autoStart) {
      // 1. Proactive Greeting
      const greeting = "Xin chào, tôi là trợ lý pháp luật. Tôi có thể giúp gì cho bạn?";
      setGlobalIsSpeaking(true);
      
      // Artificial delay for smoother transition from welcome screen
      setTimeout(() => {
        audioService.speak(greeting, () => {
          setGlobalIsSpeaking(false);
          // 2. Auto start listening for command after greeting
          startListeningForCommand();
        });
      }, 1000);
    }
  }, [autoStart]);

  // Handle Logic when stopping Active Listening -> Go to Wake Word Mode
  const startWakeWordListener = () => {
    if (processingRef.current || isListening) return;

    setWakeWordMode(true);
    setGlobalIsListening(false); // Not active listening, just passive

    audioService.startListening(
      (transcript, isFinal) => {
        const lower = transcript.toLowerCase();
        // Wake words: Legal, Trợ lý, Hey Legal, Ơi
        if (lower.includes('legal') || lower.includes('trợ lý') || lower.includes('ơi') || lower.includes('hey')) {
          console.log("Wake word detected:", transcript);
          audioService.stopListening();
          setWakeWordMode(false);
          // Play a sound effect could go here
          startListeningForCommand();
        }
      },
      (err) => {
        // Silently restart on error/end to keep listening for wake word
        if (err !== 'aborted') {
            // Short timeout to prevent rapid looping
            setTimeout(() => {
                if (wakeWordMode) startWakeWordListener(); 
            }, 1000);
        }
      },
      () => {
        // If it ends naturally, restart it
         if (wakeWordMode) startWakeWordListener();
      }
    );
  };

  const startListeningForCommand = () => {
    setWakeWordMode(false);
    setIsListening(true);
    setGlobalIsListening(true);
    setInputText('');

    audioService.startListening(
      (transcript, isFinal) => {
        setInputText(transcript);
        if (isFinal && transcript.trim().length > 0) {
           // Auto submit if final result is long enough
           handleSendMessage(transcript);
        }
      },
      (err) => {
        console.error("Command Error:", err);
        setIsListening(false);
        setGlobalIsListening(false);
        // Go back to sleep/wake word mode
        setWakeWordMode(true);
      },
      () => {
        // Logic handled in onResult mostly, but if silence:
        // Check if we have text to submit?
        setIsListening(false);
        setGlobalIsListening(false);
        // If no input was processed, go back to wake word
        if (!processingRef.current) {
            setWakeWordMode(true);
        }
      }
    );
  };

  const handleSendMessage = async (textOverride?: string) => {
    const textToSend = textOverride || inputText;
    if (!textToSend.trim() || processingRef.current) return;

    processingRef.current = true;
    audioService.stopListening();
    setIsListening(false);
    setGlobalIsListening(false);
    setWakeWordMode(false);

    // 1. Add User Message
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: textToSend,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    // 2. Call Gemini/Backend
    const response = await queryLegalAssistant(userMsg.text);
    setIsLoading(false);
    processingRef.current = false;

    const botMsg: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      text: response.text || "Xin lỗi, tôi không thể trả lời lúc này.",
      timestamp: new Date(),
      sources: response.sources,
      triples: response.triples
    };

    setMessages(prev => [...prev, botMsg]);

    if (response.triples) {
      onNewTriples(response.triples);
    }

    // 3. Handle TTS or PantoMatrix Video
    if (!isMuted && botMsg.text) {
      setGlobalIsSpeaking(true);

      // Attempt PantoMatrix generation
      setIsGeneratingVideo(true);
      const videoUrl = await pantoMatrixService.generateGestureVideo(botMsg.text);
      setIsGeneratingVideo(false);

      if (videoUrl && setAvatarVideoUrl) {
        setAvatarVideoUrl(videoUrl);
        // Wait for video end is handled by App.tsx prop, 
        // but we need to know when to go back to wake word mode?
        // Usually App.tsx calls handleVideoEnd -> we need to hook into that logic globally or via effect
      } else {
        // Fallback: Browser TTS
        audioService.speak(botMsg.text, () => {
             setGlobalIsSpeaking(false);
             // After speaking, go back to wake word mode
             startWakeWordListener();
        });
      }
    } else {
        // If muted, just go back to wake word mode
        startWakeWordListener();
    }
  };

  const toggleListening = () => {
    if (isListening) {
      audioService.stopListening();
      setIsListening(false);
      setGlobalIsListening(false);
      startWakeWordListener();
    } else {
      audioService.stopListening(); // Stop wake word listener if running
      startListeningForCommand();
    }
  };

  // Effect to restart wake word listener when not doing anything else
  useEffect(() => {
      // If we are not speaking, not listening, not loading, and autoStart was true
      // We should probably be in wake word mode
      if (autoStart && !isListening && !isLoading && !isGeneratingVideo && !wakeWordMode) {
          // A small timeout to avoid conflict with speech end events
          const timer = setTimeout(() => {
              // Ensure we are truly idle
              if (!audioService.isListening) {
                  startWakeWordListener();
              }
          }, 2000);
          return () => clearTimeout(timer);
      }
  }, [isListening, isLoading, isGeneratingVideo, wakeWordMode, autoStart]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full bg-surface/50 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden relative">
      
      {/* Listening Overlay (Siri Style) */}
      {isListening && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center text-white animate-in fade-in duration-200">
           <div className="w-24 h-24 rounded-full bg-red-500 animate-ping absolute opacity-20"></div>
           <div className="w-20 h-20 rounded-full bg-gradient-to-r from-red-500 to-pink-500 flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.5)] z-10">
              <Mic className="w-8 h-8 text-white" />
           </div>
           <p className="mt-8 text-xl font-light tracking-wider">Đang lắng nghe...</p>
           <p className="mt-2 text-sm text-gray-400">"{inputText || '...'}"</p>
           <button 
             onClick={() => {
                 setIsListening(false); 
                 setGlobalIsListening(false);
                 audioService.stopListening();
             }}
             className="mt-8 px-6 py-2 bg-gray-800 rounded-full text-sm hover:bg-gray-700 transition-colors border border-gray-700"
           >
             Hủy bỏ
           </button>
        </div>
      )}

      {/* Header */}
      <div className="p-4 bg-darker/80 border-b border-white/5 flex justify-between items-center backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-2">
           <Sparkles className="w-4 h-4 text-primary" />
           <h3 className="text-sm font-semibold text-gray-200 tracking-wide uppercase">Lịch sử hội thoại</h3>
        </div>
        <div className="flex items-center gap-3">
          {wakeWordMode && (
              <span className="flex items-center text-[10px] text-green-400 border border-green-900 bg-green-900/20 px-2 py-1 rounded-full animate-pulse">
                  <Radio className="w-3 h-3 mr-1" />
                  Nghe thụ động ("Hey Legal")
              </span>
          )}
          {isGeneratingVideo && (
            <span className="flex items-center text-xs text-blue-400 animate-pulse bg-blue-500/10 px-2 py-1 rounded">
              <Loader className="w-3 h-3 mr-1 animate-spin" />
              Rendering Avatar...
            </span>
          )}
          <button 
            onClick={() => {
              setIsMuted(!isMuted);
              audioService.stopSpeaking();
            }}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
            title={isMuted ? "Bật âm thanh" : "Tắt âm thanh"}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-gray-400" /> : <Volume2 className="w-4 h-4 text-primary" />}
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} group`}>
            <div className={`text-[10px] text-gray-500 mb-1 px-1 opacity-0 group-hover:opacity-100 transition-opacity`}>
               {msg.role === 'user' ? 'Bạn' : 'Virtual Receptionist'} • {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
            
            {/* Sources */}
            {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && (
              <div className="mt-2 ml-1 p-3 rounded-xl bg-black/20 border border-white/5 max-w-[85%]">
                <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider block mb-2">Nguồn tham khảo</span>
                <div className="flex flex-wrap gap-2">
                  {msg.sources.map((src, idx) => (
                    <a 
                      key={idx} 
                      href={src.url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-xs bg-white/5 hover:bg-white/10 px-2 py-1 rounded text-gray-300 transition-colors truncate max-w-full border border-white/5"
                    >
                      {src.document} - {src.unit}
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

      {/* Input Area */}
      <div className="p-4 bg-darker/90 backdrop-blur-xl border-t border-white/10">
        <div className="flex items-center gap-3">
          {/* Main Action: Microphone */}
          <button
            onClick={toggleListening}
            className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg ${
              isListening 
                ? 'bg-red-500 text-white scale-110 ring-4 ring-red-500/30' 
                : wakeWordMode
                    ? 'bg-green-800/50 text-green-400 border border-green-500/50 animate-pulse'
                    : 'bg-gradient-to-br from-gray-700 to-gray-800 text-white hover:from-blue-600 hover:to-blue-700 border border-white/10'
            }`}
            title={wakeWordMode ? "Đang đợi 'Hey Legal'" : "Nói để hỏi"}
          >
            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
          
          <div className="flex-1 relative">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={wakeWordMode ? "Hãy nói 'Hey Legal' hoặc 'Trợ lý'..." : "Nhập câu hỏi..."}
              className="w-full bg-black/20 text-white placeholder-gray-500 border border-gray-600 rounded-full pl-5 pr-12 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:bg-black/40 transition-all"
              disabled={isLoading || isListening || isGeneratingVideo}
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={!inputText.trim() || isLoading}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-blue-500 hover:text-blue-400 disabled:opacity-30 disabled:hover:text-blue-500 transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="text-center mt-2 flex justify-center gap-4">
           <p className="text-[10px] text-gray-600">Wake word: "Legal", "Trợ lý", "Ơi", "Hey"</p>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
