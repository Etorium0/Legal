import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import SimpleLayout from './SimpleLayout'
import { useAuth } from './AuthContext'

const SettingsPage: React.FC = () => 
{
  const navigate = useNavigate()
  const { tokens, user, logout } = useAuth()
  const [theme, setTheme] = useState('dark')
  const [language, setLanguage] = useState('vi')

  return (
    <SimpleLayout>
      <div>
        <h2 className="text-3xl font-bold text-white">Cài đặt</h2>
        <p className="mt-2 text-white/70">Tuỳ chỉnh giao diện và cấu hình hệ thống.</p>

        <div className="mt-8 space-y-6 max-w-2xl">
          {/* Account Section */}
          <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Tài khoản</h3>
            <div className="flex gap-3 flex-wrap">
              {tokens ? (
                <>
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="flex-1 px-4 py-3 rounded-lg border bg-indigo-500/20 border-indigo-500/50 text-white hover:bg-indigo-500/30 transition-all font-medium"
                  >
                    <span className="mr-2">📊</span>
                    Dashboard
                  </button>
                  {user?.role === 'admin' && (
                    <button
                      onClick={() => navigate('/users')}
                      className="flex-1 px-4 py-3 rounded-lg border bg-indigo-500/20 border-indigo-500/50 text-white hover:bg-indigo-500/30 transition-all font-medium"
                    >
                      <span className="mr-2">👥</span>
                      Quản lý người dùng
                    </button>
                  )}
                  {user?.role === 'admin' && (
                    <button
                      onClick={() => navigate('/ingest')}
                      className="flex-1 px-4 py-3 rounded-lg border bg-purple-500/20 border-purple-500/50 text-white hover:bg-purple-500/30 transition-all font-medium"
                    >
                      <span className="mr-2">📥</span>
                      Ingest Data
                    </button>
                  )}
                  <button
                    onClick={() => 
{
                      logout()
                      navigate('/login')
                    }}
                    className="flex-1 px-4 py-3 rounded-lg border bg-red-500/20 border-red-500/50 text-white hover:bg-red-500/30 transition-all font-medium"
                  >
                    <span className="mr-2">🚪</span>
                    Đăng xuất
                  </button>
                </>
              ) : (
                <button
                  onClick={() => navigate('/login')}
                  className="flex-1 px-4 py-3 rounded-lg border bg-indigo-500/20 border-indigo-500/50 text-white hover:bg-indigo-500/30 transition-all font-medium"
                >
                  <span className="mr-2">🔐</span>
                  Đăng nhập / Đăng ký
                </button>
              )}
            </div>
          </div>

          {/* Theme Setting */}
          <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Giao diện</h3>
            <div className="flex gap-3">
              {[{ value: 'light', label: 'Sáng', icon: '☀️' }, { value: 'dark', label: 'Tối', icon: '🌙' }].map(option => (
                <button
                  key={option.value}
                  onClick={() => setTheme(option.value)}
                  className={`flex-1 px-4 py-3 rounded-lg border transition-all ${theme === option.value
                    ? 'bg-indigo-500/20 border-indigo-500/50 text-white'
                    : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                    }`}
                >
                  <span className="mr-2">{option.icon}</span>
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Language Setting */}
          <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Ngôn ngữ</h3>
            <div className="flex gap-3">
              {[{ value: 'vi', label: 'Tiếng Việt', icon: '🇻🇳' }, { value: 'en', label: 'English', icon: '🇬🇧' }].map(option => (
                <button
                  key={option.value}
                  onClick={() => setLanguage(option.value)}
                  className={`flex-1 px-4 py-3 rounded-lg border transition-all ${language === option.value
                    ? 'bg-indigo-500/20 border-indigo-500/50 text-white'
                    : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                    }`}
                >
                  <span className="mr-2">{option.icon}</span>
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notifications */}
          <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Thông báo</h3>
            <div className="space-y-3">
              {[
                { label: 'Thông báo văn bản mới', enabled: true },
                { label: 'Cập nhật hệ thống', enabled: true },
                { label: 'Tin nhắn từ admin', enabled: false },
              ].map((item, i) => (
                <label key={i} className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer">
                  <span className="text-white/90">{item.label}</span>
                  <input type="checkbox" defaultChecked={item.enabled} className="w-5 h-5 rounded" />
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </SimpleLayout>
  )
}

export default SettingsPage
