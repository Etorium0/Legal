import React from 'react'
import SimpleLayout from './SimpleLayout'
import MapCard from './MapCard'

const DashboardPage: React.FC = () => 
{
  return (
    <SimpleLayout>
      <div>
        <h2 className="text-3xl font-bold text-white">Bảng điều khiển</h2>
        <p className="mt-2 text-white/70">Tổng quan nhanh về hoạt động gần đây.</p>

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { title: 'Văn bản mới', description: '12 văn bản được cập nhật tuần này', icon: '📄', color: 'from-blue-500 to-cyan-500' },
            { title: 'Yêu cầu tra cứu', description: '34 yêu cầu trong 24h gần nhất', icon: '🔍', color: 'from-purple-500 to-pink-500' },
            { title: 'Liên kết tri thức', description: '128 cạnh mới được thêm', icon: '🔗', color: 'from-green-500 to-emerald-500' },
          ].map((item, i) => (
            <div key={i} className="rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-white/10 backdrop-blur p-6 hover:scale-105 transition-transform">
              <div className={`inline-flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br ${item.color} text-2xl mb-4`}>
                {item.icon}
              </div>
              <h3 className="text-xl font-semibold text-white">{item.title}</h3>
              <p className="mt-2 text-sm text-white/70">{item.description}</p>
            </div>
          ))}
        </div>

        <div className="mt-10">
          <MapCard height={320} />
        </div>
      </div>
    </SimpleLayout>
  )
}

export default DashboardPage
