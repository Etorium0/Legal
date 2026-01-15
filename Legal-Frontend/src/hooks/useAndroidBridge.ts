import { useEffect } from 'react';

interface UseAndroidBridgeProps {
  isListening: boolean;
  setIsListening: (val: boolean) => void;
  setInputText: (text: string) => void;
  handleSendMessage: (text: string) => void;
  processingRef: React.MutableRefObject<boolean>;
}

export const useAndroidBridge = ({
  isListening,
  setIsListening,
  setInputText,
  handleSendMessage,
  processingRef
}: UseAndroidBridgeProps) => 
{
  useEffect(() => 
{
    const handleMessage = (event: MessageEvent) => 
{
      const data = event.data;
      if (!data) {return;}

      console.log('[Assistant] Received event:', data);

      if (data.type === 'wake') 
{
        console.log('[Assistant] Wake word detected!');
        if (!isListening && !processingRef.current) 
{
          setIsListening(true);
          setInputText('Đang nghe...');
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
  }, [isListening, setIsListening, setInputText, handleSendMessage, processingRef]);
};
