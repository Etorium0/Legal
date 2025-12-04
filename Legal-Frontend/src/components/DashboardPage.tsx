import React from 'react'
import ArticleCard from './ArticleCard'

const DashboardPage: React.FC = () => {
  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold">Bảng điều khiển</h2>
      <p className="mt-2 text-gray-600">Tổng quan nhanh về hoạt động gần đây.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {[
          { title: 'Văn bản mới', description: '12 văn bản được cập nhật tuần này' },
          { title: 'Yêu cầu tra cứu', description: '34 yêu cầu trong 24h gần nhất' },
          { title: 'Liên kết tri thức', description: '128 cạnh mới được thêm' },
        ].map((a, i) => (
          <ArticleCard key={i} title={a.title} description={a.description} />
        ))}
      </div>
    </div>
  )
}

export default DashboardPage
