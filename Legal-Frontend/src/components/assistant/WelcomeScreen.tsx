import React from 'react';
import { Power, Mic } from 'lucide-react';

interface WelcomeScreenProps {
  onStart: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onStart }) => 
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
          onClick={onStart}
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
};
