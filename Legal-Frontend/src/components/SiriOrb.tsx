import React from 'react';

interface SiriOrbProps {
  isListening: boolean;
}

export const SiriOrb: React.FC<SiriOrbProps> = ({ isListening }) => (
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
