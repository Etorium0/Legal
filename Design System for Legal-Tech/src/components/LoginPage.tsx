import React, { useState } from 'react';
import { Mail, Lock, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { Button } from './Button';
import { Input } from './Input';

interface LoginPageProps {
  onNavigate: (page: string) => void;
}

export function LoginPage({ onNavigate }: LoginPageProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [agreed, setAgreed] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNavigate('dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-20 left-20 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 right-20 w-[500px] h-[500px] bg-indigo-400/20 rounded-full blur-3xl" style={{ animationDelay: '1s' }} />
      </div>

      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-12 items-center">
        {/* Left Side - Branding */}
        <div className="hidden lg:block animate-fade-in">
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl opacity-20 blur-2xl" />
            <div className="relative bg-white/80 backdrop-blur-xl rounded-3xl p-12 border border-white/20 shadow-2xl">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2L4 7V12C4 17.5 8 22 12 24C16 22 20 17.5 20 12V7L12 2Z" fill="white"/>
                  </svg>
                </div>
                <div>
                  <div className="text-2xl bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Luật sư ảo</div>
                  <div className="text-sm text-slate-500">Legal AI Assistant</div>
                </div>
              </div>
              
              <h3 className="mb-4 text-slate-900">Chào mừng đến với tương lai của tra cứu pháp luật</h3>
              <p className="text-slate-600 mb-8 leading-relaxed">
                Trải nghiệm công nghệ AI tiên tiến giúp bạn tra cứu và hiểu pháp luật Việt Nam một cách nhanh chóng và chính xác.
              </p>

              <div className="space-y-4">
                {[
                  { icon: '🤖', title: 'AI thông minh', desc: 'Hiểu ngôn ngữ tự nhiên' },
                  { icon: '⚡', title: 'Phản hồi nhanh', desc: 'Kết quả trong 3 giây' },
                  { icon: '🎯', title: 'Chính xác cao', desc: 'Trích dẫn từ văn bản gốc' }
                ].map((item, index) => (
                  <div key={index} className="flex items-start gap-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100">
                    <div className="text-2xl">{item.icon}</div>
                    <div>
                      <div className="text-slate-900 mb-1">{item.title}</div>
                      <div className="text-sm text-slate-600">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="animate-scale-in">
          <button 
            onClick={() => onNavigate('landing')}
            className="flex items-center gap-2 text-slate-600 hover:text-blue-600 mb-8 transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span>Quay lại trang chủ</span>
          </button>

          <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl p-10 border border-white/20">
            <div className="text-center mb-8">
              <div className="lg:hidden inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl mb-4 shadow-lg">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L4 7V12C4 17.5 8 22 12 24C16 22 20 17.5 20 12V7L12 2Z" fill="white"/>
                </svg>
              </div>
              <h2 className="text-slate-900 mb-2">{isLogin ? 'Đăng nhập' : 'Tạo tài khoản'}</h2>
              <p className="text-slate-600">
                {isLogin 
                  ? 'Chào mừng bạn quay lại!' 
                  : 'Bắt đầu hành trình pháp lý của bạn'
                }
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {!isLogin && (
                <Input
                  label="Họ và tên"
                  type="text"
                  placeholder="Nguyễn Văn A"
                  required
                />
              )}
              
              <Input
                label="Email"
                type="email"
                placeholder="email@example.com"
                icon={<Mail className="w-5 h-5" />}
                required
              />
              
              <div className="relative">
                <Input
                  label="Mật khẩu"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  icon={<Lock className="w-5 h-5" />}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-[38px] text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {!isLogin && (
                <Input
                  label="Xác nhận mật khẩu"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  icon={<Lock className="w-5 h-5" />}
                  required
                />
              )}

              {isLogin && (
                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all"
                    />
                    <span className="text-slate-600 group-hover:text-slate-900 transition-colors">Ghi nhớ đăng nhập</span>
                  </label>
                  <a href="#" className="text-blue-600 hover:text-blue-700 transition-colors">
                    Quên mật khẩu?
                  </a>
                </div>
              )}

              {!isLogin && (
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="w-5 h-5 mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all"
                    required
                  />
                  <span className="text-sm text-slate-600 group-hover:text-slate-900 transition-colors">
                    Tôi đồng ý với{' '}
                    <a href="#" className="text-blue-600 hover:underline">
                      Điều khoản sử dụng
                    </a>
                    {' '}và{' '}
                    <a href="#" className="text-blue-600 hover:underline">
                      Chính sách bảo mật
                    </a>
                  </span>
                </label>
              )}

              <Button variant="primary" size="lg" className="w-full shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all">
                {isLogin ? 'Đăng nhập' : 'Đăng ký'}
              </Button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-4 my-8">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
              <span className="text-sm text-slate-500">hoặc</span>
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
            </div>

            {/* Google Login */}
            <Button variant="secondary" size="lg" className="w-full group">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span className="group-hover:text-blue-600 transition-colors">Tiếp tục với Google</span>
            </Button>

            {/* Toggle Login/Register */}
            <p className="text-center text-sm text-slate-600 mt-8">
              {isLogin ? 'Chưa có tài khoản?' : 'Đã có tài khoản?'}{' '}
              <button 
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-blue-600 hover:text-blue-700 transition-colors"
              >
                {isLogin ? 'Đăng ký ngay' : 'Đăng nhập'}
              </button>
            </p>
          </div>

          {/* Trust Badge */}
          <div className="mt-6 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-xl rounded-full border border-white/20 shadow-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm text-slate-600">Dữ liệu được mã hóa và bảo mật</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
