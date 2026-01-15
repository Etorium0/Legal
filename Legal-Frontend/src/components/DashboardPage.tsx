import React from 'react'
import Button from './ui/button'
import { Link, useNavigate } from 'react-router-dom'
import SimpleLayout from './SimpleLayout'
import MapCard from './MapCard'

const DashboardPage: React.FC = () => 
{
  const navigate = useNavigate()

  return (
    <SimpleLayout>
      <div className="py-8">
        <section className="text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-sm mb-4">
            <span>🎓</span>
            <span>Đồ án tốt nghiệp - UIT</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            Nền tảng Trợ lý Pháp lý
          </h1>
          <p className="mt-4 text-lg text-white/70 max-w-xl mx-auto">
            Tra cứu văn bản pháp luật Việt Nam bằng giọng nói. 
            Hỏi bất cứ lúc nào, kể cả khi đang di chuyển.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4 flex-wrap">
            <Link to="/assistant">
              <Button variant="primary" size="lg">🎤 Bắt đầu hỏi</Button>
            </Link>
            <Link to="/documents">
              <Button variant="secondary" size="lg">📚 Tra cứu văn bản</Button>
            </Link>
          </div>
        </section>
        
        <section className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { 
              title: 'Hỏi đáp bằng giọng nói', 
              desc: 'Chỉ cần nói "Hey Legal" và đặt câu hỏi về pháp luật.', 
              icon: '🎤',
              color: 'from-blue-500/20 to-cyan-500/20',
              path: '/assistant'
            },
            { 
              title: 'Tra cứu thông minh', 
              desc: 'Tìm kiếm ngữ nghĩa trong 76,000+ điều khoản pháp luật.', 
              icon: '🔍',
              color: 'from-purple-500/20 to-pink-500/20',
              path: '/documents'
            },
            { 
              title: 'Đi đường an toàn', 
              desc: 'Hotword hoạt động khi đang di chuyển, không cần chạm màn hình.', 
              icon: '🚗',
              color: 'from-emerald-500/20 to-green-500/20',
              path: '/assistant' // Or map if appropriate
            },
            { 
                title: 'Bộ Pháp Điển', 
                desc: 'Tra cứu hệ thống pháp luật theo chủ đề.', 
                icon: '📚', 
                color: 'from-amber-500/20 to-orange-500/20',
                path: '/phapdien' 
            },
            { 
                title: 'Biểu đồ tri thức', 
                desc: 'Khám phá mối quan hệ giữa các khái niệm pháp lý.', 
                icon: '🔗', 
                color: 'from-teal-500/20 to-cyan-500/20',
                path: '/graph' 
            },
          ].map((f, i) => (
            <div 
                key={i} 
                onClick={() => navigate(f.path)}
                className={`rounded-xl border border-white/10 bg-gradient-to-br ${f.color} backdrop-blur p-5 hover:scale-105 transition-all cursor-pointer`}
            >
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="text-lg font-semibold text-white">{f.title}</h3>
              <p className="mt-2 text-sm text-white/70">{f.desc}</p>
            </div>
          ))}
        </section>

        <section className="mt-10">
          <MapCard />
        </section>

        <section className="mt-10 rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">ℹ️</span>
            <h3 className="text-xl font-semibold text-white">Về ứng dụng</h3>
          </div>
          <div className="grid gap-4 md:grid-cols-2 text-sm text-white/80">
            <div>
              <p className="font-semibold text-white mb-2">Mục đích</p>
              <p>Hỗ trợ người dân tra cứu pháp luật Việt Nam một cách dễ dàng, đặc biệt là khi đang di chuyển thông qua tương tác giọng nói.</p>
            </div>
            <div>
              <p className="font-semibold text-white mb-2">Công nghệ</p>
              <p>RAG (Retrieval-Augmented Generation), Knowledge Graph, LLM (Groq/Gemini), Voice Recognition, và hơn 76,000 đơn vị pháp luật.</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-white/10 text-center text-xs text-white/50">
            Đồ án tốt nghiệp - Khoa Công nghệ Phần mềm - Trường ĐH Công nghệ Thông tin (UIT) - ĐHQG HCM
          </div>
        </section>
      </div>
    </SimpleLayout>
  )
}

export default DashboardPage
