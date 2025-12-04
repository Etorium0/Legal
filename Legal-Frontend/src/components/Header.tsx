import React from 'react'

export const Header: React.FC = () => 
{
  return (
    <div className="p-4 md:p-6">
      <section className="rounded-xl border border-white/10 bg-gradient-to-r from-primary/10 to-transparent p-4">
        <h1 className="text-white text-lg md:text-xl font-semibold">
          ✨ Chào bạn! LEXgpt có thể giúp gì cho bạn hôm nay?
        </h1>
        <p className="text-white/60 text-sm mt-1">Hãy đặt câu hỏi hoặc tải tệp để bắt đầu.</p>
      </section>
    </div>
  )
}

export default Header
