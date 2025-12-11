import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Button from './ui/button'

const LoginPage: React.FC = () => 
{
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = (e: React.FormEvent) => 
{
    e.preventDefault()
    // Mock login - redirect to assistant
    navigate('/assistant')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 mb-4">
            <span className="text-3xl">⚖️</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Legal AI Assistant</h1>
          <p className="text-white/60">Đăng nhập để tiếp tục</p>
        </div>

        {/* Login Form */}
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-white mb-2">Email</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-white/10 bg-white/5 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" 
                placeholder="you@example.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-2">Mật khẩu</label>
              <input 
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-white/10 bg-white/5 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" 
                placeholder="••••••••"
                required
              />
            </div>
            
            <Button type="submit" className="w-full" variant="primary" size="lg">
              Đăng nhập
            </Button>
          </form>

          <div className="mt-6 text-center space-y-3">
            <p className="text-sm text-white/60">
              Quên mật khẩu? <a href="#" className="text-indigo-400 hover:text-indigo-300 font-medium">Khôi phục</a>
            </p>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-2 bg-white/5 text-white/40">hoặc</span>
              </div>
            </div>
            <Link to="/assistant" className="block text-sm text-indigo-400 hover:text-indigo-300 font-medium">
              Tiếp tục không cần đăng nhập →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
