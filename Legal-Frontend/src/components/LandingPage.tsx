import React from 'react'
import Button from './ui/button'
import { Link } from 'react-router-dom'
import SimpleLayout from './SimpleLayout'
import MapCard from './MapCard'

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

        <section className="mt-16 grid gap-6 lg:grid-cols-[1.1fr_0.9fr] items-start">
          <MapCard />
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-6 shadow-lg">
            <p className="text-xs uppercase tracking-[0.2em] text-indigo-200/80">Liên hệ & hướng dẫn</p>
            <h3 className="text-2xl font-semibold text-white mt-2">Tới trực tiếp văn phòng</h3>
            <p className="mt-2 text-white/70">Mang theo hồ sơ gốc, giấy tờ tuỳ thân. Đặt lịch trước để được tiếp nhận nhanh hơn.</p>
            <div className="mt-4 space-y-3 text-sm text-white/80">
              <div className="flex items-start gap-2">
                <span className="text-lg">🕑</span>
                <div>
                  <div className="font-semibold text-white">Giờ làm việc</div>
                  <div>Thứ 2 - Thứ 6: 8:00 - 17:30</div>
                  <div>Thứ 7: 8:00 - 12:00</div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-lg">📞</span>
                <div>
                  <div className="font-semibold text-white">Tổng đài</div>
                  <div>1900 1234 (nhánh 1: tư vấn doanh nghiệp, nhánh 2: dân sự)</div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-lg">✉️</span>
                <div>
                  <div className="font-semibold text-white">Email</div>
                  <div>support@legalassistant.vn</div>
                </div>
              </div>
            </div>
            <div className="mt-6 rounded-xl bg-indigo-500/10 border border-indigo-500/30 p-4 text-white/80">
              <div className="font-semibold text-white">Mẹo nhanh:</div>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Nhập địa chỉ hoặc toạ độ trong ô tìm kiếm để mở Google Maps.</li>
                <li>Thêm khoá API vào file .env.local: <span className="font-mono text-xs">VITE_GOOGLE_MAPS_API_KEY=...</span></li>
                <li>Bật định vị trên trình duyệt để được gợi ý đường đi chính xác.</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </SimpleLayout>
  )
}

export default LandingPage
