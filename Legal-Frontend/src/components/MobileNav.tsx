import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Mic, Home, FileText, Activity, Settings } from 'lucide-react'

const TabLink: React.FC<{ to: string; label: string; icon: React.ReactNode }> = ({ to, label, icon }) => 
{
  const { pathname } = useLocation()
  const active = pathname === to || (pathname.startsWith(to) && to !== '/')
  return (
    <Link
      to={to}
      className={`flex-1 py-3 flex flex-col items-center justify-center gap-1 text-[10px] transition-colors ${active ? 'text-blue-600 font-bold' : 'text-gray-400 hover:text-gray-600'}`}
    >
      {icon}
      <span>{label}</span>
    </Link>
  )
}

const MobileNav: React.FC = () => 
{
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 bg-white/95 backdrop-blur-lg border-t border-gray-200 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.05)] sm:hidden">
      <div className="flex justify-around items-center h-16">
        <TabLink to="/home" label="Trang chủ" icon={<Home className="w-5 h-5" />} />
        <TabLink to="/documents" label="Tài liệu" icon={<FileText className="w-5 h-5" />} />
        
        <div className="relative -top-6">
           <Link to="/assistant" className="flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/40 transform hover:scale-105 transition-all border-4 border-white">
             <Mic className="w-6 h-6" />
           </Link>
        </div>

        <TabLink to="/graph" label="Biểu đồ" icon={<Activity className="w-5 h-5" />} />
        <TabLink to="/settings" label="Cài đặt" icon={<Settings className="w-5 h-5" />} />
      </div>
    </nav>
  )
}

export default MobileNav
