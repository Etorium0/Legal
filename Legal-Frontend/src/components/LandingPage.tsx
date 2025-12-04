import React from 'react'
import Button from './ui/button'
import { Link } from 'react-router-dom'
import SimpleLayout from './SimpleLayout'

export const LandingPage: React.FC = () => 
{
  return (
    <SimpleLayout>
      <div className="py-12">
        <section className="text-center">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            Nền tảng Trợ lý Pháp lý
          </h1>
          <p className="mt-4 text-lg text-white/70">Tra cứu, phân tích và trực quan hoá dữ liệu pháp luật nhanh chóng.</p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Link to="/assistant">
              <Button variant="primary" size="lg">Bắt đầu ngay</Button>
            </Link>
            <Link to="/documents">
              <Button variant="secondary" size="lg">Duyệt tài liệu</Button>
            </Link>
          </div>
        </section>
        
        <section className="mt-20 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { title: 'Tra cứu văn bản', desc: 'Tìm nhanh văn bản pháp luật theo từ khoá.', icon: '🔍' },
            { title: 'Biểu đồ tri thức', desc: 'Xem quan hệ giữa các chủ thể pháp lý.', icon: '🔗' },
            { title: 'Tóm tắt và gợi ý', desc: 'Nhận tóm tắt nội dung và hành động liên quan.', icon: '💡' },
          ].map((f, i) => (
            <div key={i} className="rounded-xl border border-white/10 bg-white/5 backdrop-blur p-6 hover:bg-white/10 transition-all">
              <div className="text-4xl mb-3">{f.icon}</div>
              <h3 className="text-xl font-semibold text-white">{f.title}</h3>
              <p className="mt-2 text-sm text-white/70">{f.desc}</p>
            </div>
          ))}
        </section>
      </div>
    </SimpleLayout>
  )
}

export default LandingPage
