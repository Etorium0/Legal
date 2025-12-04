// Light/white Sidebar used by router pages; keep this version.
import React, { useEffect, useState } from 'react'
import { getHistory, clearHistory } from './HistoryStore'

interface NavItem {
  label: string
  icon?: React.ReactNode
  href?: string
}

const defaultItems: NavItem[] = [
  { label: 'Trò chuyện ảo', href: '/assistant' },
  { label: 'Trang chủ', href: '/home' },
  { label: 'Bảng điều khiển', href: '/dashboard' },
  { label: 'Tài liệu', href: '/documents' },
  { label: 'Biểu đồ tri thức', href: '/graph' },
  { label: 'Cài đặt', href: '/settings' },
]

export const Sidebar: React.FC<{ items?: NavItem[]; className?: string; open?: boolean }> = ({ items = defaultItems, className = '', open = true }) => 
{
  const [history, setHistory] = useState(getHistory())
  useEffect(() => 
{
    // refresh on open
    if (open) {setHistory(getHistory())}
  }, [open])

  return (
    <aside className={`h-full w-64 border-r bg-white transition-transform duration-200 ${open ? 'translate-x-0' : '-translate-x-full'} ${className}`}>
      <div className="px-4 py-3 text-lg font-semibold">Legal Assistant</div>
      <nav className="space-y-1 px-2">
        {items.map((item, idx) => (
          <a
            key={idx}
            href={item.href || '#'}
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            {item.icon}
            <span>{item.label}</span>
          </a>
        ))}
      </nav>
      <div className="mt-4 px-2">
        <div className="flex items-center justify-between px-2">
          <div className="text-sm font-semibold text-gray-800">Lịch sử</div>
          <button className="text-xs text-gray-600 hover:text-gray-900" onClick={() => { clearHistory(); setHistory([]) }}>Xoá</button>
        </div>
        <ul className="mt-2 space-y-1">
          {history.map((h, i) => (
            <li key={i} className="rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100">
                {h.question.slice(0, 30)}{h.question.length > 30 ? '…' : ''}
              <div className="mt-1 text-xs text-gray-500">{new Date(h.timestamp).toLocaleTimeString()}</div>
            </li>
          ))}
          {history.length === 0 && (
            <li className="rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-600">Chưa có phiên làm việc nào</li>
          )}
        </ul>
      </div>
    </aside>
  )
}

export default Sidebar
