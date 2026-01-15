import { useState, useRef, useEffect } from 'react';
import { Message, Triple } from '../types';
import { audioService } from '../services/audioService';
import { queryLegalAssistant } from '../services/legalService';
import { addHistory } from '../components/HistoryStore';
import { chatService } from '../services/chatService';
import { authService } from '../services/authService';
import { useSpeechRecognition } from './useSpeechRecognition';
import { useAvatarAudio } from './useAvatarAudio';
import { useNavigationIntent } from './useNavigationIntent';

const WELCOME_MESSAGE: Message = {
  id: 'welcome',
  role: 'assistant',
  text: 'Xin chào! Tôi là Trợ lý Pháp luật Ảo. Nhấn nút mic để bắt đầu nói chuyện với tôi.',
  timestamp: new Date()
};

export const useAssistantChat = () =>
{
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [_currentTriples, setCurrentTriples] = useState<Triple[]>([]);
  const [navigationDestination, setNavigationDestination] = useState<string | null>(null);
  
  const processingRef = useRef(false);

  const {
    isMuted,
    isSpeaking,
    avatarVideoUrl,
    setAvatarVideoUrl,
    speak,
    stopSpeaking,
    toggleMute,
    handleVideoEnd,
    setIsSpeaking,
    setIsMuted
  } = useAvatarAudio();

  const { checkNavigationIntent } = useNavigationIntent();

  // Load chat history on mount (only if authenticated)
  useEffect(() =>
  {
    if (historyLoaded)
    {
      return;
    }

    const loadChatHistory = async () =>
    {
      try
      {
        // Check if user is authenticated first
        const token = await authService.getValidAccessToken();
        if (!token)
        {
          // User not logged in - skip loading history silently
          setHistoryLoaded(true);
          return;
        }

        const session = await chatService.getCurrentSession();
        const chatMessages = await chatService.getMessages(session.id);

        if (chatMessages && chatMessages.length > 0)
        {
          const loadedMessages: Message[] = chatMessages.map((msg) => ({
            id: msg.id,
            role: msg.role as 'user' | 'assistant',
            text: msg.content,
            timestamp: new Date(msg.created_at),
            sources: msg.metadata?.sources,
            triples: msg.metadata?.triples
          }));

          // Prepend welcome message and add loaded messages
          setMessages([WELCOME_MESSAGE, ...loadedMessages]);
        }
      }
      catch (error)
      {
        // Silently fail - don't show error to user
        console.warn('Failed to load chat history:', error);
        // Keep default welcome message
      }
      finally
      {
        setHistoryLoaded(true);
      }
    };

    loadChatHistory();
  }, [historyLoaded]);

  const handleSendMessage = async (textOverride?: string) =>
  {
    const textToSend = textOverride || inputText;
    if (!textToSend.trim() || processingRef.current)
    {
      return;
    }

    processingRef.current = true;
    stopListening(); // Use stopListening from useSpeechRecognition

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: textToSend,
      timestamp: new Date()
    };

    // Check for navigation intent
    const navResult = checkNavigationIntent(textToSend);
    if (navResult.isNavigation && navResult.location && navResult.responseMessage)
    {
      setMessages(prev => [...prev, userMsg, navResult.responseMessage!]);
      setInputText('');
      setIsLoading(false);
      processingRef.current = false;
      
      // Speak the response
      speak(`Đang chỉ đường đến ${navResult.location}`);
      
      // Open in-app navigation
      setNavigationDestination(navResult.location);
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

      // Save to backend chat history
      chatService.saveConversation(textToSend, botMsg.text, {
        sources: response.sources,
        triples: response.triples
      }).catch(err => console.warn('Failed to save chat history:', err));

      if (response.triples)
      {
        setCurrentTriples(response.triples);
      }

      // Handle TTS only (PantoMatrix video disabled)
      if (botMsg.text)
      {
        speak(botMsg.text);
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

  const {
    isListening,
    startListening,
    stopListening,
    toggleListening: toggleSpeechListening
  } = useSpeechRecognition({
    onResult: (transcript, isFinal) =>
    {
      console.log('[Assistant] Transcript:', transcript, 'Final:', isFinal);
      setInputText(transcript);
      
      // Auto-send when final (người nói xong)
      if (isFinal && transcript.trim().length > 0)
      {
        handleSendMessage(transcript);
      }
    },
    onError: (err) =>
    {
      console.error('[Assistant] Listening error:', err);
    },
    onEnd: () =>
    {
      console.log('[Assistant] Listening ended');
    }
  });

  const handleMicClick = () =>
  {
    // Allow clicking to stop if listening
    if (isListening)
    {
      stopListening();
      return;
    }

    // Force start even if processing (to interrupt)
    console.log('[Assistant] Mic clicked - starting to listen');
    setInputText('');
    startListening();
  };

  const toggleListening = () =>
  {
    if (isListening)
    {
      stopListening();
    }
    else
    {
      handleMicClick();
    }
  };

  // Load a specific session by ID
  const loadSession = async (sessionId: string) =>
  {
    try
    {
      // Update current session in localStorage
      localStorage.setItem('current_chat_session', sessionId);

      // Load messages for this session
      const chatMessages = await chatService.getMessages(sessionId);

      if (chatMessages && chatMessages.length > 0)
      {
        const loadedMessages: Message[] = chatMessages.map((msg) => ({
          id: msg.id,
          role: msg.role as 'user' | 'assistant',
          text: msg.content,
          timestamp: new Date(msg.created_at),
          sources: msg.metadata?.sources,
          triples: msg.metadata?.triples
        }));

        setMessages([WELCOME_MESSAGE, ...loadedMessages]);
      }
      else
      {
        // Empty session - just show welcome message
        setMessages([WELCOME_MESSAGE]);
      }
    }
    catch (error)
    {
      console.error('Failed to load session:', error);
    }
  };

  return {
    messages,
    inputText,
    setInputText,
    isLoading,
    isListening,
    setIsListening: (val: boolean) => val ? startListening() : stopListening(), // Adapter for backward compatibility
    isMuted,
    setIsMuted,
    isSpeaking,
    setIsSpeaking,
    avatarVideoUrl,
    navigationDestination,
    setNavigationDestination,
    processingRef,
    handleSendMessage,
    handleMicClick,
    toggleListening,
    handleVideoEnd,
    toggleMute,
    loadSession
  };
};
