import { useEffect } from 'react';
import { audioService } from '../services/audioService';

interface ProactiveGreetingProps
{
  hasStarted: boolean;
  setIsSpeaking: (isSpeaking: boolean) => void;
}

export const useProactiveGreeting = ({ hasStarted, setIsSpeaking }: ProactiveGreetingProps) =>
{
  useEffect(() =>
  {
    if (hasStarted)
    {
      const greeting = "Xin chào, tôi là trợ lý pháp luật. Nhấn mic để hỏi tôi bất cứ điều gì.";
      setIsSpeaking(true);
      
      const timer = setTimeout(() =>
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

      return () => clearTimeout(timer);
    }
  }, [hasStarted, setIsSpeaking]);
};
