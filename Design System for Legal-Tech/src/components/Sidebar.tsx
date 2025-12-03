import React from 'react';
import { Home, MessageSquare, FileText, Network, Settings, LogOut, Sparkles } from 'lucide-react';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', label: 'Trang chủ', icon: Home },
    { id: 'ask', label: 'Hỏi pháp luật', icon: MessageSquare },
    { id: 'documents', label: 'Văn bản', icon: FileText },
    { id: 'knowledge-graph', label: 'Đồ thị tri thức', icon: Network },
    { id: 'settings', label: 'Cài đặt', icon: Settings },
  ];

  return (
    <aside className="w-72 bg-white border-r border-slate-200 h-screen flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl blur-md opacity-50" />
            <div className="relative w-11 h-11 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L4 7V12C4 17.5 8 22 12 24C16 22 20 17.5 20 12V7L12 2Z" fill="white"/>
              </svg>
            </div>
          </div>
          <div>
            <div className="text-lg bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Luật sư ảo</div>
            <div className="text-xs text-slate-500">Legal AI Assistant</div>
          </div>
        </div>
      </div>

      {/* Menu */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`
                w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all group
                ${isActive 
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30' 
                  : 'text-slate-600 hover:bg-slate-50'
                }
              `}
            >
              <Icon className={`w-5 h-5 ${isActive ? '' : 'group-hover:scale-110 transition-transform'}`} />
              <span className={isActive ? '' : ''}>{item.label}</span>
              {isActive && item.id === 'ask' && (
                <Sparkles className="w-4 h-4 ml-auto animate-pulse" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Upgrade Card */}
      <div className="p-4">
        <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl p-4 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
          <div className="relative">
            <div className="text-sm mb-2">🚀 Nâng cấp Pro</div>
            <p className="text-xs text-blue-100 mb-3">Không giới hạn câu hỏi + API access</p>
            <button className="w-full px-3 py-2 bg-white text-blue-600 rounded-lg text-sm hover:bg-blue-50 transition-colors">
              Nâng cấp ngay
            </button>
          </div>
        </div>
      </div>

      {/* User Section */}
      <div className="p-4 border-t border-slate-200">
        <div className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer group">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center shadow-md">
            <span className="text-white text-sm">NĐ</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm text-slate-900 truncate">Nguyễn Đức</div>
            <div className="text-xs text-slate-500">Free Plan</div>
          </div>
          <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
            <LogOut className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </div>
    </aside>
  );
}
