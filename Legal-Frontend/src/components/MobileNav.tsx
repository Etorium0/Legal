import React from 'react'
import { Link, useLocation } from 'react-router-dom'

const TabLink: React.FC<{ to: string; label: string }> = ({ to, label }) => 
{
  const { pathname } = useLocation()
  const active = pathname === to
  return (
    <Link
      to={to}
      className={`flex-1 py-2 text-center text-sm ${active ? 'text-indigo-600 font-semibold' : 'text-gray-600'}`}
    >
      {label}
    </Link>
  )
}

const MobileNav: React.FC = () => 
{
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t bg-white shadow-sm sm:hidden">
      <div className="flex">
        <TabLink to="/assistant" label="Trò chuyện" />
        <TabLink to="/home" label="Trang chủ" />
        <TabLink to="/documents" label="Tài liệu" />
        <TabLink to="/graph" label="Biểu đồ" />
        <TabLink to="/settings" label="Cài đặt" />
      </div>
    </nav>
  )
}

export default MobileNav
