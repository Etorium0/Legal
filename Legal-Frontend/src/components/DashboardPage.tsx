import React from 'react'
import { useNavigate } from 'react-router-dom'
import SimpleLayout from './SimpleLayout'
import MapCard from './MapCard'

const DashboardPage: React.FC = () => 
{
  const navigate = useNavigate()

  return (
    <SimpleLayout>
      <div>
        <h2 className="text-3xl font-bold text-white">Bảng điều khiển</h2>
        <p className="mt-2 text-white/70">Truy cập nhanh các tính năng chính.</p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { title: 'Hỏi đáp pháp luật', description: 'Đặt câu hỏi bằng giọng nói hoặc văn bản', icon: '🎤', color: 'from-blue-500 to-cyan-500', path: '/assistant' },
            { title: 'Tra cứu văn bản', description: 'Duyệt danh sách VBQPPL', icon: '📄', color: 'from-purple-500 to-pink-500', path: '/vbpl' },
            { title: 'Bộ Pháp Điển', description: 'Tra cứu theo chủ đề, đề mục', icon: '📚', color: 'from-amber-500 to-orange-500', path: '/phapdien' },
            { title: 'Biểu đồ tri thức', description: 'Xem quan hệ giữa các khái niệm', icon: '🔗', color: 'from-green-500 to-emerald-500', path: '/graph' },
          ].map((item, i) => (
            <div 
              key={i} 
              onClick={() => navigate(item.path)}
              className="rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-white/10 backdrop-blur p-6 hover:scale-105 transition-transform cursor-pointer"
            >
              <div className={`inline-flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br ${item.color} text-2xl mb-4`}>
                {item.icon}
              </div>
              <h3 className="text-xl font-semibold text-white">{item.title}</h3>
              <p className="mt-2 text-sm text-white/70">{item.description}</p>
            </div>
          ))}
        </div>

        <div className="mt-10">
          <MapCard />
        </div>
      </div>
    </SimpleLayout>
  )
}

export default DashboardPage
