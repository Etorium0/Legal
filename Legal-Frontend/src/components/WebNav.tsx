import React from 'react'
import { Link } from 'react-router-dom'

const WebNav: React.FC<{ onToggleSidebar?: () => void }> = ({ onToggleSidebar }) => {
  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-black">
      <div className="mx-auto max-w-7xl px-4 flex h-14 items-center justify-between text-white">
        <div className="flex items-center gap-3">
          <button aria-label="Toggle sidebar" className="rounded-md border border-white/20 px-2 py-1 text-xs" onClick={onToggleSidebar}>☰</button>
          <Link to="/assistant" className="font-semibold">Legal Assistant</Link>
        </div>
        <nav className="flex items-center gap-4 text-sm">
          <Link to="/assistant" className="text-white/80 hover:text-white">Trò chuyện ảo</Link>
          <Link to="/documents" className="text-white/80 hover:text-white">Tài liệu</Link>
          <Link to="/graph" className="text-white/80 hover:text-white">Biểu đồ</Link>
          <Link to="/settings" className="text-white/80 hover:text-white">Cài đặt</Link>
        </nav>
      </div>
    </header>
  )
}

export default WebNav
