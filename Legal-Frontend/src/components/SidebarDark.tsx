import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { cn } from './ui/utils'

type Item = { key: string; label: string; icon?: React.ReactNode; path: string }

const items: Item[] = [
  { key: 'assistant', label: 'Trợ lý', icon: <span>🤖</span>, path: '/assistant' },
  { key: 'home', label: 'Trang chủ', icon: <span>🏠</span>, path: '/home' },
  { key: 'dashboard', label: 'Dashboard', icon: <span>📊</span>, path: '/dashboard' },
  { key: 'documents', label: 'Tài liệu', icon: <span>📄</span>, path: '/documents' },
  { key: 'graph', label: 'Biểu đồ tri thức', icon: <span>🔗</span>, path: '/graph' },
  { key: 'settings', label: 'Cài đặt', icon: <span>⚙️</span>, path: '/settings' },
]

export const SidebarDark: React.FC = () => 
{
  const location = useLocation()
  
  return (
    <aside className="w-64 shrink-0 bg-sidebar text-white/80 border-r border-white/10 h-screen sticky top-0 hidden md:block">
      <div className="px-4 py-4">
        <Link to="/assistant" className="text-white font-bold text-xl tracking-wide hover:opacity-80 transition-opacity">
          LEXcentra
        </Link>
      </div>
      <nav className="px-2 py-2 space-y-1">
        {items.map((item) => (
          <Link
            key={item.key}
            to={item.path}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-colors',
              location.pathname === item.path
                ? 'bg-white/10 text-white shadow-soft'
                : 'hover:bg-white/5 text-white/70'
            )}
          >
            <span className="text-lg">{item.icon}</span>
            <span className="text-sm font-medium">{item.label}</span>
          </Link>
        ))}
      </nav>
    </aside>
  )
}

export default SidebarDark
