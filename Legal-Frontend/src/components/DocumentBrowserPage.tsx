import React from 'react'
import ResultCard from './ResultCard'

const mockDocs = [
  { id: 1, title: 'Luật Doanh nghiệp 2020', summary: 'Quy định về thành lập, tổ chức quản lý, tổ chức lại, giải thể và các vấn đề liên quan đến doanh nghiệp.', tags: ['Luật', 'Doanh nghiệp'] },
  { id: 2, title: 'Nghị định 01/2021/NĐ-CP', summary: 'Về đăng ký doanh nghiệp, trình tự thủ tục và hồ sơ.', tags: ['Nghị định', 'Đăng ký'] },
  { id: 3, title: 'Thông tư 01/2023/TT-BTP', summary: 'Hướng dẫn về công chứng và chứng thực.', tags: ['Thông tư', 'Công chứng'] },
]

const DocumentBrowserPage: React.FC = () => {
  return (
    <div className="p-6 bg-neutral-950/70 backdrop-blur rounded-lg border border-white/10">
      <h2 className="text-xl font-semibold text-white">Trình duyệt tài liệu</h2>
      <p className="mt-2 text-white/70">Tìm kiếm và xem chi tiết văn bản pháp luật.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {mockDocs.map(doc => (
          <div
            key={doc.id}
            className="rounded-lg border border-white/10 bg-neutral-900/80 p-4 text-white shadow-lg shadow-black/40"
          >
            <div className="text-lg font-semibold">{doc.title}</div>
            <div className="mt-1 text-sm text-white/80">{doc.summary}</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {doc.tags.map((t, i) => (
                <span
                  key={i}
                  className="rounded-full border border-white/10 bg-neutral-800/80 px-2 py-1 text-xs text-white/80"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default DocumentBrowserPage
