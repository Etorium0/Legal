import React, { useState } from 'react';
import { Search, Filter, ChevronRight, FileText, Download, Share2 } from 'lucide-react';
import { Input } from './Input';
import { Button } from './Button';
import { DocumentTreeItem } from './DocumentTreeItem';

export function DocumentBrowserPage() {
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);

  const documentTree = [
    {
      name: 'Bộ luật Dân sự 2015',
      type: 'folder' as const,
      children: [
        {
          name: 'Phần thứ nhất - Những quy định chung',
          type: 'folder' as const,
          children: [
            {
              name: 'Chương I - Những quy định chung',
              type: 'folder' as const,
              children: [
                { name: 'Điều 1 - Phạm vi điều chỉnh', type: 'file' as const, isActive: true },
                { name: 'Điều 2 - Áp dụng Bộ luật Dân sự', type: 'file' as const },
                { name: 'Điều 3 - Các nguyên tắc cơ bản', type: 'file' as const }
              ]
            },
            {
              name: 'Chương II - Chủ thể của quan hệ dân sự',
              type: 'folder' as const,
              children: [
                { name: 'Điều 4 - Cá nhân', type: 'file' as const },
                { name: 'Điều 5 - Pháp nhân', type: 'file' as const }
              ]
            }
          ]
        },
        {
          name: 'Phần thứ hai - Chủ thể dân sự',
          type: 'folder' as const,
          children: [
            { name: 'Chương III - Quy định chung về cá nhân', type: 'folder' as const }
          ]
        }
      ]
    },
    {
      name: 'Bộ luật Hôn nhân và Gia đình 2014',
      type: 'folder' as const,
      children: [
        { name: 'Chương I - Những quy định chung', type: 'folder' as const },
        { name: 'Chương II - Hôn nhân', type: 'folder' as const }
      ]
    },
    {
      name: 'Bộ luật Lao động 2019',
      type: 'folder' as const,
      children: [
        { name: 'Chương I - Những quy định chung', type: 'folder' as const }
      ]
    }
  ];

  return (
    <div className="flex-1 bg-[--color-background-alt] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-[--color-border] p-6">
        <div className="flex items-center justify-between mb-4">
          <h2>Duyệt văn bản pháp luật</h2>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" icon={<Download className="w-4 h-4" />}>
              Tải xuống
            </Button>
            <Button variant="ghost" size="sm" icon={<Share2 className="w-4 h-4" />}>
              Chia sẻ
            </Button>
          </div>
        </div>
        
        {/* Search and Filters */}
        <div className="flex gap-3">
          <div className="flex-1">
            <Input 
              placeholder="Tìm kiếm điều, khoản, văn bản..." 
              icon={<Search className="w-5 h-5" />}
            />
          </div>
          <Button variant="secondary" size="md" icon={<Filter className="w-5 h-5" />}>
            Bộ lọc
          </Button>
        </div>

        {/* Quick Filters */}
        <div className="flex gap-2 mt-4">
          {['Tất cả', 'Bộ luật', 'Luật', 'Nghị định', 'Thông tư'].map((filter) => (
            <button
              key={filter}
              className={`px-4 py-2 rounded-lg text-sm transition-all ${
                filter === 'Tất cả'
                  ? 'bg-[--color-primary-600] text-white'
                  : 'bg-[--color-neutral-100] text-[--color-text-secondary] hover:bg-[--color-neutral-200]'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Document Tree */}
        <div className="w-96 bg-white border-r border-[--color-border] overflow-auto p-4">
          <h5 className="mb-4 px-2">Cấu trúc văn bản</h5>
          <div className="space-y-1">
            {documentTree.map((doc, index) => (
              <DocumentTreeItem key={index} {...doc} onClick={() => setSelectedDoc(doc.name)} />
            ))}
          </div>
        </div>

        {/* Document Content */}
        <div className="flex-1 overflow-auto p-8">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-xl border border-[--color-border] p-8">
              {/* Breadcrumb */}
              <div className="flex items-center gap-2 text-sm text-[--color-text-tertiary] mb-6">
                <span>Bộ luật Dân sự 2015</span>
                <ChevronRight className="w-4 h-4" />
                <span>Phần thứ nhất</span>
                <ChevronRight className="w-4 h-4" />
                <span>Chương I</span>
                <ChevronRight className="w-4 h-4" />
                <span className="text-[--color-text-primary]">Điều 1</span>
              </div>

              {/* Article Header */}
              <div className="mb-6 pb-6 border-b border-[--color-border]">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="inline-block px-3 py-1 bg-[--color-primary-50] text-[--color-primary-700] rounded-lg text-sm mb-2">
                      Điều 1
                    </div>
                    <h3 className="mb-2">Phạm vi điều chỉnh</h3>
                  </div>
                  <div className="flex gap-2">
                    <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[--color-neutral-100] transition-colors">
                      <FileText className="w-4 h-4 text-[--color-text-tertiary]" />
                    </button>
                  </div>
                </div>
                <div className="flex gap-3 text-sm text-[--color-text-tertiary]">
                  <span>Hiệu lực: 01/01/2017</span>
                  <span>•</span>
                  <span>Ban hành: 24/11/2015</span>
                  <span>•</span>
                  <span>Trạng thái: Còn hiệu lực</span>
                </div>
              </div>

              {/* Article Content */}
              <div className="space-y-6">
                <div>
                  <p className="text-[--color-text-primary] leading-relaxed">
                    Bộ luật này điều chỉnh các quan hệ nhân thân và quan hệ tài sản giữa các chủ thể trong các lĩnh vực dân sự.
                  </p>
                </div>

                {/* Clauses */}
                <div className="space-y-4">
                  <div className="pl-6 border-l-2 border-[--color-primary-200]">
                    <div className="mb-2">
                      <span className="px-2 py-1 bg-[--color-primary-50] text-[--color-primary-700] rounded text-sm">
                        Khoản 1
                      </span>
                    </div>
                    <p className="text-[--color-text-primary] leading-relaxed">
                      Quan hệ nhân thân là quan hệ phát sinh, thay đổi, chấm dứt giữa các cá nhân trên cơ sở 
                      huyết thống tự nhiên, hôn nhân, nuôi con nuôi và một số trường hợp khác theo quy định của Bộ luật này.
                    </p>
                  </div>

                  <div className="pl-6 border-l-2 border-[--color-primary-200]">
                    <div className="mb-2">
                      <span className="px-2 py-1 bg-[--color-primary-50] text-[--color-primary-700] rounded text-sm">
                        Khoản 2
                      </span>
                    </div>
                    <p className="text-[--color-text-primary] leading-relaxed">
                      Quan hệ tài sản là quan hệ phát sinh, thay đổi, chấm dứt trong các hoạt động dân sự 
                      gắn liền với tài sản giữa các chủ thể.
                    </p>
                  </div>
                </div>

                {/* Related Articles */}
                <div className="mt-8 pt-6 border-t border-[--color-border]">
                  <h5 className="mb-3">Điều khoản liên quan</h5>
                  <div className="space-y-2">
                    {[
                      { article: 'Điều 2', title: 'Áp dụng Bộ luật Dân sự' },
                      { article: 'Điều 3', title: 'Các nguyên tắc cơ bản của pháp luật dân sự' },
                      { article: 'Điều 4', title: 'Cá nhân' }
                    ].map((item, index) => (
                      <button
                        key={index}
                        className="w-full flex items-center justify-between px-4 py-3 bg-[--color-neutral-50] rounded-lg hover:bg-[--color-neutral-100] transition-colors text-left"
                      >
                        <div>
                          <span className="text-sm text-[--color-primary-600]">{item.article}</span>
                          <span className="text-sm text-[--color-text-secondary] ml-2">- {item.title}</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-[--color-text-tertiary]" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div className="mt-6 p-4 bg-[--color-secondary-50] rounded-lg">
                  <h6 className="text-[--color-secondary-900] mb-2">📌 Ghi chú</h6>
                  <p className="text-sm text-[--color-secondary-800]">
                    Điều 1 xác định phạm vi điều chỉnh của Bộ luật Dân sự, bao gồm các quan hệ nhân thân 
                    và quan hệ tài sản. Đây là điều khoản nền tảng giúp xác định các tình huống áp dụng pháp luật dân sự.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
