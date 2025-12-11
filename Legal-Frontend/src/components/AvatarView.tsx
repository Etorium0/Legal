import React, { useRef, useEffect } from 'react';
import { Mic, Zap } from 'lucide-react';

interface AvatarViewProps {
  isSpeaking: boolean;
  isListening: boolean;
  videoUrl?: string | null;
  onVideoEnd?: () => void;
}

const AvatarView: React.FC<AvatarViewProps> = ({ 
  isSpeaking, 
  isListening, 
  videoUrl,
  onVideoEnd 
}) => 
{
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => 
{
    if (videoUrl && videoRef.current) 
{
      videoRef.current.play().catch(e => console.warn("Auto-play blocked:", e));
    }
  }, [videoUrl]);

  // Siri-like Orb Animation Component
  const SiriOrb = () => (
    <div className="relative flex items-center justify-center w-64 h-64 md:w-80 md:h-80">
      {/* Core Core */}
      <div className="absolute w-32 h-32 bg-white rounded-full blur-xl opacity-50 animate-pulse z-20"></div>
      
      {/* Inner Color Layer */}
      <div className="absolute w-48 h-48 bg-gradient-to-tr from-blue-400 to-purple-500 rounded-full blur-2xl opacity-80 animate-spin-slow z-10 mix-blend-screen"></div>
      
      {/* Outer Color Layer */}
      <div className="absolute w-64 h-64 bg-gradient-to-bl from-cyan-400 via-blue-500 to-purple-600 rounded-full blur-3xl opacity-60 animate-blob mix-blend-screen"></div>
      
      {/* Listening State Ripples */}
      {isListening && (
        <>
          <div className="absolute w-full h-full border-2 border-white/20 rounded-full animate-ping opacity-20"></div>
          <div className="absolute w-[120%] h-[120%] border border-white/10 rounded-full animate-ping delay-75 opacity-10"></div>
        </>
      )}
    </div>
  );

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-darker rounded-2xl overflow-hidden border border-gray-800 shadow-2xl">
      {/* Background Ambient Light */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/80 z-0"></div>
      <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent z-0 pointer-events-none"></div>

      <div className="relative z-10 flex flex-col items-center justify-center w-full h-full p-6">
        
        {/* Main Visual Display */}
        <div className="relative w-full max-w-md aspect-square flex items-center justify-center">
          
          {videoUrl ? (
            /* PantoMatrix Video Output */
            <div className="relative w-full h-full rounded-full overflow-hidden border-4 border-blue-500/30 shadow-[0_0_50px_rgba(59,130,246,0.3)]">
              <video
                ref={videoRef}
                src={videoUrl}
                className="w-full h-full object-cover scale-110" // Slight scale to hide edges
                autoPlay
                onEnded={onVideoEnd}
              />
               {/* Overlay gradient for cinematic look */}
               <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none"></div>
            </div>
          ) : (
            /* Siri / Virtual Assistant Orb */
            <div className="transition-all duration-500 transform hover:scale-105">
              <SiriOrb />
            </div>
          )}

          {/* Status Icon Overlay */}
          <div className="absolute bottom-4 right-4 z-30">
            {isListening && (
              <div className="bg-red-500/20 backdrop-blur-md border border-red-500/50 p-3 rounded-full shadow-lg animate-pulse">
                <Mic className="w-6 h-6 text-red-400" />
              </div>
            )}
            {isSpeaking && !videoUrl && !isListening && (
              <div className="bg-blue-500/20 backdrop-blur-md border border-blue-500/50 p-3 rounded-full shadow-lg">
                 <Zap className="w-6 h-6 text-blue-400 animate-bounce" />
              </div>
            )}
          </div>
        </div>

        {/* Text Status */}
        <div className="mt-8 text-center space-y-2 z-20">
          <h2 className="text-3xl font-light text-white tracking-wide">
            {isListening ? "Đang lắng nghe..." : isSpeaking ? "Đang trả lời..." : "Tôi có thể giúp gì?"}
          </h2>
          <p className="text-blue-200/60 text-sm font-light tracking-widest uppercase">
            Legal Virtual Receptionist
          </p>
        </div>
      </div>
    </div>
  );
};

export default AvatarView;
