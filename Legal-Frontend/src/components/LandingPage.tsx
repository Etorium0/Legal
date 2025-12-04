import React from 'react'
import Button from './ui/button'
import { Link } from 'react-router-dom'

export const LandingPage: React.FC = () => {
  return (
    <div className="container py-12">
      <section className="text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Nền tảng Trợ lý Pháp lý</h1>
        <p className="mt-3 text-gray-600">Tra cứu, phân tích và trực quan hoá dữ liệu pháp luật nhanh chóng.</p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link to="/documents"><Button variant="primary">Bắt đầu</Button></Link>
          <Link to="/graph"><Button variant="secondary">Biểu đồ</Button></Link>
        </div>
      </section>
      <section className="mt-16 grid gap-6 sm:grid-cols-3">
        {[
          { title: 'Tra cứu văn bản', desc: 'Tìm nhanh văn bản pháp luật theo từ khoá.' },
          { title: 'Biểu đồ tri thức', desc: 'Xem quan hệ giữa các chủ thể pháp lý.' },
          { title: 'Tóm tắt và gợi ý', desc: 'Nhận tóm tắt nội dung và hành động liên quan.' },
        ].map((f, i) => (
          <div key={i} className="rounded-lg border bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold">{f.title}</h3>
            <p className="mt-1 text-sm text-gray-600">{f.desc}</p>
          </div>
        ))}
      </section>
    </div>
  )
}

export default LandingPage
