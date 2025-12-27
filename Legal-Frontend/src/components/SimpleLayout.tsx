import React from 'react'
import { Link, useLocation } from 'react-router-dom'

const SimpleLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => 
{
  const location = useLocation()
  
  const navItems = [
    { path: '/assistant', label: 'Trợ lý AI', icon: '🤖' },
    { path: '/home', label: 'Trang chủ', icon: '🏠' },
    { path: '/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/phapdien', label: 'Pháp điển', icon: '📚' },
    { path: '/vbpl', label: 'VBPL', icon: '📜' },
    { path: '/documents', label: 'Tài liệu', icon: '📄' },
    { path: '/graph', label: 'Biểu đồ', icon: '🔗' },
    { path: '/settings', label: 'Cài đặt', icon: '⚙️' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 backdrop-blur-lg bg-slate-900/80 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/assistant" className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <span className="text-xl">⚖️</span>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                Legal AI Assistant
              </span>
            </Link>
            
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map(item => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    location.pathname === item.path
                      ? 'bg-white/10 text-white'
                      : 'text-white/70 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span className="mr-2">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-lg border-t border-white/10 z-50">
        <div className="flex items-center justify-around">
          {navItems.slice(0, 5).map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-1 py-3 px-2 transition-colors ${
                location.pathname === item.path
                  ? 'text-indigo-400'
                  : 'text-white/60'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-xs">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  )
}

export default SimpleLayout
