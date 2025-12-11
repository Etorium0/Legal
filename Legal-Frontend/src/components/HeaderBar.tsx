import React from 'react'

export const HeaderBar: React.FC<{ onModelClick?: () => void }> = ({ onModelClick }) => 
{
  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0C0F14]/80 backdrop-blur">
      <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center">⚖️</div>
          <h1 className="text-sm sm:text-base md:text-lg font-semibold text-white">Legal AI Assistant</h1>
        </div>
        <button
          onClick={onModelClick}
          className="text-xs md:text-sm px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 transition-colors"
        >
          Model: GPT-5
        </button>
      </div>
    </header>
  )
}

export default HeaderBar
