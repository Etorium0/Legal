import React, { useState } from 'react'
import SimpleLayout from './SimpleLayout'

const mockDocs = [
  { id: 1, title: 'Luật Doanh nghiệp 2020', summary: 'Quy định về thành lập, tổ chức quản lý, tổ chức lại, giải thể và các vấn đề liên quan đến doanh nghiệp.', tags: ['Luật', 'Doanh nghiệp'], date: '2020-06-17' },
  { id: 2, title: 'Nghị định 01/2021/NĐ-CP', summary: 'Về đăng ký doanh nghiệp, trình tự thủ tục và hồ sơ.', tags: ['Nghị định', 'Đăng ký'], date: '2021-01-04' },
  { id: 3, title: 'Thông tư 01/2023/TT-BTP', summary: 'Hướng dẫn về công chứng và chứng thực.', tags: ['Thông tư', 'Công chứng'], date: '2023-01-15' },
  { id: 4, title: 'Bộ luật Dân sự 2015', summary: 'Quy định các quan hệ dân sự về nhân thân và tài sản.', tags: ['Bộ luật', 'Dân sự'], date: '2015-11-24' },
  { id: 5, title: 'Luật Lao động 2019', summary: 'Quy định về quan hệ lao động, quyền và nghĩa vụ của người lao động và người sử dụng lao động.', tags: ['Luật', 'Lao động'], date: '2019-11-20' },
  { id: 6, title: 'Luật Đất đai 2013', summary: 'Quy định về chế độ sở hữu, quyền và nghĩa vụ của người sử dụng đất.', tags: ['Luật', 'Đất đai'], date: '2013-11-29' },
]

const DocumentBrowserPage: React.FC = () => 
{
  const [searchTerm, setSearchTerm] = useState('')
  
  const filteredDocs = mockDocs.filter(doc => 
    doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.summary.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <SimpleLayout>
      <div>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-white">Trình duyệt tài liệu</h2>
            <p className="mt-2 text-white/70">Tìm kiếm và xem chi tiết văn bản pháp luật.</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <input
              type="text"
              placeholder="Tìm kiếm văn bản..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-5 py-3 pl-12 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">🔍</span>
          </div>
        </div>

        {/* Documents Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredDocs.map(doc => (
            <div
              key={doc.id}
              className="rounded-xl border border-white/10 bg-white/5 backdrop-blur p-6 hover:bg-white/10 transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-lg font-semibold text-white group-hover:text-indigo-400 transition-colors">{doc.title}</h3>
              </div>
              <p className="text-sm text-white/70 mb-4 line-clamp-3">{doc.summary}</p>
              <div className="flex items-center justify-between">
                <div className="flex flex-wrap gap-2">
                  {doc.tags.map((tag, i) => (
                    <span
                      key={i}
                      className="px-2 py-1 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-xs text-indigo-300"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <div className="mt-3 text-xs text-white/50">{doc.date}</div>
            </div>
          ))}
        </div>
        
        {filteredDocs.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📄</div>
            <p className="text-white/60">Không tìm thấy tài liệu nào</p>
          </div>
        )}
      </div>
    </SimpleLayout>
  )
}

export default DocumentBrowserPage
