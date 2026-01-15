import { useState, useCallback } from 'react';
import { audioService } from '../services/audioService';

export const useAvatarAudio = () =>
{
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [avatarVideoUrl, setAvatarVideoUrl] = useState<string | null>(null);

  const stopSpeaking = useCallback(() =>
  {
    audioService.stopSpeaking();
    setIsSpeaking(false);
    setAvatarVideoUrl(null);
  }, []);

  const speak = useCallback((text: string) =>
  {
    if (isMuted || !text)
    {
      return;
    }

    setIsSpeaking(true);
    audioService.speak(text, () =>
    {
      setIsSpeaking(false);
    });
  }, [isMuted]);

  const toggleMute = useCallback(() =>
  {
    setIsMuted(prev =>
    {
      const newState = !prev;
      if (newState)
      {
        stopSpeaking();
      }
      return newState;
    });
  }, [stopSpeaking]);

  const handleVideoEnd = useCallback(() =>
  {
    setAvatarVideoUrl(null);
    setIsSpeaking(false);
  }, []);

  return {
    isMuted,
    isSpeaking,
    avatarVideoUrl,
    setAvatarVideoUrl,
    speak,
    stopSpeaking,
    toggleMute,
    handleVideoEnd,
    setIsMuted, // For backward compatibility if needed
    setIsSpeaking // For backward compatibility if needed
  };
};
