import React from 'react';
import { ArrowRight, Bot, BookOpen, Users, Search, Network, FileCheck, ChevronRight, Sparkles, Zap, Shield, TrendingUp } from 'lucide-react';
import { Button } from './Button';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface LandingPageProps {
  onNavigate: (page: string) => void;
}

export function LandingPage({ onNavigate }: LandingPageProps) {
  const features = [
    {
      icon: Sparkles,
      title: 'AI Thông minh',
      description: 'Công nghệ GPT-4 và NLP tiên tiến hiểu câu hỏi tiếng Việt tự nhiên',
      gradient: 'from-blue-500 to-cyan-500'
    },
    {
      icon: Network,
      title: 'Knowledge Graph',
      description: 'Hệ thống đồ thị tri thức kết nối hàng triệu mối quan hệ pháp lý',
      gradient: 'from-purple-500 to-pink-500'
    },
    {
      icon: Shield,
      title: 'Độ chính xác cao',
      description: 'Mọi câu trả lời đều có trích dẫn chính xác từ văn bản pháp luật',
      gradient: 'from-emerald-500 to-teal-500'
    }
  ];

  const stats = [
    { number: '50,000+', label: 'Văn bản pháp luật', icon: FileCheck },
    { number: '99.5%', label: 'Độ chính xác', icon: Shield },
    { number: '{"< 3s"}', label: 'Thời gian phản hồi', icon: Zap },
    { number: '10,000+', label: 'Người dùng', icon: Users }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-white/20 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl blur-lg opacity-50" />
              <div className="relative w-11 h-11 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L4 7V12C4 17.5 8 22 12 24C16 22 20 17.5 20 12V7L12 2Z" fill="white"/>
                </svg>
              </div>
            </div>
            <div>
              <span className="text-xl bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Luật sư ảo</span>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-slate-600 hover:text-blue-600 transition-colors">
              Tính năng
            </a>
            <a href="#how-it-works" className="text-slate-600 hover:text-blue-600 transition-colors">
              Cách hoạt động
            </a>
            <a href="#for-whom" className="text-slate-600 hover:text-blue-600 transition-colors">
              Đối tượng
            </a>
            <Button variant="ghost" size="sm" onClick={() => onNavigate('login')}>
              Đăng nhập
            </Button>
            <Button variant="primary" size="sm" onClick={() => onNavigate('login')}>
              Dùng thử ngay
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative max-w-7xl mx-auto px-6 pt-20 pb-32 overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-blue-400/20 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-indigo-400/20 rounded-full blur-3xl" style={{ animationDelay: '1s' }} />
          <div className="absolute top-40 right-20 w-64 h-64 bg-purple-400/20 rounded-full blur-3xl" style={{ animationDelay: '2s' }} />
        </div>

        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600/10 to-indigo-600/10 border border-blue-200 rounded-full mb-8">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span className="text-sm bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Công nghệ AI • Ontology • Knowledge Graph
              </span>
            </div>
            <h1 className="mb-6 bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent">
              Luật sư ảo thông minh
            </h1>
            <p className="text-xl text-slate-600 mb-8 leading-relaxed">
              Tra cứu văn bản pháp luật bằng trí tuệ nhân tạo. 
              <span className="text-blue-600"> Chính xác, nhanh chóng, dễ hiểu.</span>
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mb-12">
              <Button 
                variant="primary" 
                size="lg" 
                onClick={() => onNavigate('login')}
                className="shadow-2xl shadow-blue-500/30 hover:shadow-blue-500/50 transition-all"
              >
                Dùng thử miễn phí
                <ArrowRight className="w-5 h-5" />
              </Button>
              <Button variant="secondary" size="lg">
                Xem demo
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {stats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <div key={index} className="text-center">
                    <div className="inline-flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl mb-2">
                      <Icon className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="text-2xl bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-1">
                      {stat.number}
                    </div>
                    <div className="text-sm text-slate-500">{stat.label}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="relative lg:block hidden">
            <div className="absolute -inset-4 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl opacity-20 blur-2xl" />
            <div className="relative bg-white rounded-3xl shadow-2xl border border-slate-200 p-8">
              {/* Mock Chat Interface */}
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center flex-shrink-0">
                    <Users className="w-5 h-5 text-slate-600" />
                  </div>
                  <div className="flex-1 bg-slate-100 rounded-2xl rounded-tl-sm px-4 py-3">
                    <p className="text-slate-700">Thủ tục ly hôn theo pháp luật Việt Nam như thế nào?</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl rounded-tl-sm px-4 py-3">
                    <p className="text-slate-700 mb-3">Theo <strong>Điều 51 Bộ luật Hôn nhân và Gia đình 2014</strong>, thủ tục ly hôn bao gồm:</p>
                    <ol className="text-sm text-slate-600 space-y-1 ml-4">
                      <li>1. Nộp đơn khởi kiện ly hôn</li>
                      <li>2. Tòa án tiến hành hòa giải</li>
                      <li>3. Xét xử nếu hòa giải không thành</li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-block px-4 py-2 bg-blue-100 text-blue-600 rounded-full mb-4">
              ✨ Tính năng nổi bật
            </div>
            <h2 className="mb-4">Công nghệ tiên tiến</h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Kết hợp AI, Ontology và Knowledge Graph để mang đến trải nghiệm tra cứu pháp luật tốt nhất
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div 
                  key={index}
                  className="group relative bg-gradient-to-br from-slate-50 to-white rounded-3xl p-8 border border-slate-200 hover:border-slate-300 transition-all hover:shadow-2xl hover:-translate-y-1"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-5 rounded-3xl transition-opacity`} />
                  <div className={`relative inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br ${feature.gradient} rounded-2xl mb-6 shadow-lg`}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <h4 className="mb-3 relative">{feature.title}</h4>
                  <p className="text-slate-600 relative">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-block px-4 py-2 bg-blue-100 text-blue-600 rounded-full mb-4">
              ⚡ Quy trình
            </div>
            <h2 className="mb-4">Đơn giản chỉ với 3 bước</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-1/3 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 opacity-20" style={{ zIndex: 0 }} />
            
            {[
              { step: '01', title: 'Đặt câu hỏi', description: 'Nhập câu hỏi pháp lý bằng tiếng Việt tự nhiên', icon: Search, color: 'from-blue-600 to-cyan-600' },
              { step: '02', title: 'AI phân tích', description: 'Hệ thống tìm kiếm và phân tích trong cơ sở tri thức', icon: Bot, color: 'from-indigo-600 to-purple-600' },
              { step: '03', title: 'Nhận kết quả', description: 'Câu trả lời chi tiết kèm trích dẫn pháp luật', icon: FileCheck, color: 'from-purple-600 to-pink-600' }
            ].map((item, index) => {
              const Icon = item.icon;
              return (
                <div key={index} className="relative z-10">
                  <div className="bg-white rounded-3xl p-8 shadow-xl border border-slate-200 hover:shadow-2xl transition-all">
                    <div className={`inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br ${item.color} rounded-2xl text-white text-2xl mb-6 shadow-lg`}>
                      <Icon className="w-8 h-8" />
                    </div>
                    <div className={`text-sm bg-gradient-to-r ${item.color} bg-clip-text text-transparent mb-2`}>
                      BƯỚC {item.step}
                    </div>
                    <h4 className="mb-3">{item.title}</h4>
                    <p className="text-slate-600">{item.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-6">
          <div className="relative bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 rounded-[2.5rem] p-12 md:p-16 text-white text-center overflow-hidden shadow-2xl">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-40" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full mb-6">
                <Sparkles className="w-4 h-4" />
                <span className="text-sm">Miễn phí dùng thử</span>
              </div>
              <h2 className="text-white mb-4">Sẵn sàng trải nghiệm?</h2>
              <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
                Đăng ký ngay để nhận 100 câu hỏi miễn phí. Không cần thẻ tín dụng.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  variant="secondary" 
                  size="lg"
                  onClick={() => onNavigate('login')}
                  className="bg-white text-blue-600 hover:bg-blue-50 shadow-xl"
                >
                  Bắt đầu ngay
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2L4 7V12C4 17.5 8 22 12 24C16 22 20 17.5 20 12V7L12 2Z" fill="white"/>
                  </svg>
                </div>
                <span className="text-white text-lg">Luật sư ảo</span>
              </div>
              <p className="text-sm leading-relaxed">
                Trợ lý pháp lý AI thông minh, chính xác và dễ sử dụng cho mọi người.
              </p>
            </div>
            <div>
              <h6 className="text-white mb-4">Sản phẩm</h6>
              <ul className="space-y-3 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Tính năng</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Bảng giá</a></li>
                <li><a href="#" className="hover:text-white transition-colors">API</a></li>
              </ul>
            </div>
            <div>
              <h6 className="text-white mb-4">Hỗ trợ</h6>
              <ul className="space-y-3 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Tài liệu</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Hướng dẫn</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Liên hệ</a></li>
              </ul>
            </div>
            <div>
              <h6 className="text-white mb-4">Pháp lý</h6>
              <ul className="space-y-3 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Điều khoản</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Bảo mật</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Cookies</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-slate-800 text-center text-sm">
            <p>© 2024 Luật sư ảo. Bảo lưu mọi quyền.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
