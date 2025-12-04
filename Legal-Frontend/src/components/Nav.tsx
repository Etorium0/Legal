import React from 'react'
import { Link } from 'react-router-dom'
import Button from './ui/button'

export const Nav: React.FC = () => {
  return (
    <header className="sticky top-0 z-20 w-full bg-white/80 backdrop-blur border-b">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link to="/assistant" className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-indigo-600 text-white font-bold">L</span>
            <div className="font-semibold text-gray-900">Legal Assistant</div>
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/documents"><Button variant="ghost" size="sm">Tài liệu</Button></Link>
          <Link to="/settings"><Button variant="ghost" size="sm">Cài đặt</Button></Link>
          <Link to="/login"><Button variant="primary" size="sm">Đăng nhập</Button></Link>
        </div>
      </div>
    </header>
  )
}

export default Nav
