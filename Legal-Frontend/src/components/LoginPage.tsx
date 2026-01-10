import React, { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Button from './ui/button'
import { useAuth } from './AuthContext'

// Password validation helper
const validatePassword = (password: string) => {
  const checks = {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };
  const isValid = Object.values(checks).every(Boolean);
  return { checks, isValid };
};

const LoginPage: React.FC = () => 
{
  const navigate = useNavigate()
  const { login, register } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPasswordHints, setShowPasswordHints] = useState(false)

  const passwordValidation = useMemo(() => validatePassword(password), [password]);

  const handleSubmit = (e: React.FormEvent) => 
{
    e.preventDefault()
    
    // Validate password on register
    if (mode === 'register' && !passwordValidation.isValid) {
      setError('Mật khẩu không đủ mạnh. Vui lòng kiểm tra các yêu cầu bên dưới.');
      return;
    }
    
    const action = mode === 'login' ? login : register
    setLoading(true)
    setError(null)
    action(email, password, mode === 'register' ? name : undefined)
      .then(() => navigate('/assistant'))
      .catch((err: any) => setError(err?.message || 'Đăng nhập thất bại'))
      .finally(() => setLoading(false))
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
                onFocus={() => mode === 'register' && setShowPasswordHints(true)}
                onBlur={() => setShowPasswordHints(false)}
                className="w-full px-4 py-3 rounded-lg border border-white/10 bg-white/5 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" 
                placeholder="••••••••"
                required
              />
              {/* Password strength hints for registration */}
              {mode === 'register' && (showPasswordHints || password.length > 0) && (
                <div className="mt-2 p-3 rounded-lg bg-white/5 border border-white/10 text-xs space-y-1">
                  <p className="text-white/70 font-medium mb-2">Yêu cầu mật khẩu:</p>
                  <p className={passwordValidation.checks.minLength ? 'text-green-400' : 'text-white/50'}>
                    {passwordValidation.checks.minLength ? '✓' : '○'} Ít nhất 8 ký tự
                  </p>
                  <p className={passwordValidation.checks.hasUppercase ? 'text-green-400' : 'text-white/50'}>
                    {passwordValidation.checks.hasUppercase ? '✓' : '○'} Có chữ in hoa (A-Z)
                  </p>
                  <p className={passwordValidation.checks.hasLowercase ? 'text-green-400' : 'text-white/50'}>
                    {passwordValidation.checks.hasLowercase ? '✓' : '○'} Có chữ thường (a-z)
                  </p>
                  <p className={passwordValidation.checks.hasNumber ? 'text-green-400' : 'text-white/50'}>
                    {passwordValidation.checks.hasNumber ? '✓' : '○'} Có số (0-9)
                  </p>
                  <p className={passwordValidation.checks.hasSpecial ? 'text-green-400' : 'text-white/50'}>
                    {passwordValidation.checks.hasSpecial ? '✓' : '○'} Có ký tự đặc biệt (!@#$%...)
                  </p>
                </div>
              )}
            </div>
            {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-white mb-2">Họ tên</label>
                <input 
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-white/10 bg-white/5 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" 
                  placeholder="Tên hiển thị"
                />
              </div>
            )}

            {error && <div className="text-sm text-red-300">{error}</div>}
            
            <Button type="submit" className="w-full" variant="primary" size="lg" disabled={loading}>
              {loading ? 'Đang xử lý...' : mode === 'login' ? 'Đăng nhập' : 'Đăng ký'}
            </Button>
          </form>

          <div className="mt-6 text-center space-y-3">
            <p className="text-sm text-white/60">
              Quên mật khẩu? <Link to="/forgot-password" className="text-indigo-400 hover:text-indigo-300 font-medium">Khôi phục</Link>
            </p>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-2 bg-white/5 text-white/40">hoặc</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
              className="block text-sm text-indigo-400 hover:text-indigo-300 font-medium mx-auto"
            >
              {mode === 'login' ? 'Tạo tài khoản mới →' : 'Đã có tài khoản? Đăng nhập →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
