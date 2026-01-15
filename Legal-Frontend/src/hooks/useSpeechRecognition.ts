import { useState, useCallback } from 'react';
import { audioService } from '../services/audioService';

interface UseSpeechRecognitionProps {
  onResult: (transcript: string, isFinal: boolean) => void;
  onError?: (error: any) => void;
  onEnd?: () => void;
}

export const useSpeechRecognition = ({ onResult, onError, onEnd }: UseSpeechRecognitionProps) => 
{
  const [isListening, setIsListening] = useState(false);

  const startListening = useCallback(() => 
{
    if (isListening) {return;}

    console.log('[Speech] Starting listening...');
    setIsListening(true);

    audioService.startListening(
      (transcript, isFinal) => 
{
        onResult(transcript, isFinal);
      },
      (err) => 
{
        console.error('[Speech] Error:', err);
        setIsListening(false);
        if (onError) {onError(err);}
      },
      () => 
{
        console.log('[Speech] Ended');
        setIsListening(false);
        if (onEnd) {onEnd();}
      }
    );
  }, [isListening, onResult, onError, onEnd]);

  const stopListening = useCallback(() => 
{
    if (!isListening) {return;}
    
    console.log('[Speech] Stopping listening...');
    audioService.stopListening();
    setIsListening(false);
  }, [isListening]);

  const toggleListening = useCallback(() => 
{
    if (isListening) 
{
      stopListening();
    }
 else 
{
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  return {
    isListening,
    startListening,
    stopListening,
    toggleListening
  };
};
