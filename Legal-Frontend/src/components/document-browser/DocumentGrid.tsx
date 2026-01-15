import React from 'react';
import { DocItem } from './types';

type DocumentGridProps = {
  loading: boolean;
  error: string | null;
  filteredDocs: DocItem[];
  setSelectedDoc: (doc: DocItem) => void;
};

export const DocumentGrid: React.FC<DocumentGridProps> = ({
  loading,
  error,
  filteredDocs,
  setSelectedDoc,
}) =>
{
  if (loading)
  {
    return <div className="text-center py-8 text-white/70">Đang tải danh sách văn bản...</div>;
  }

  if (error)
  {
    return <div className="text-center py-8 text-red-300">{error}</div>;
  }

  return (
    <div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredDocs.map((doc) => (
          <div
            key={doc.id}
            className="rounded-xl border border-white/10 bg-slate-800/50 p-6 hover:bg-slate-800/70 transition-all group cursor-pointer"
            onClick={() => setSelectedDoc(doc)}
          >
            <div className="flex items-start justify-between mb-3">
              <h3 className="text-lg font-semibold text-white group-hover:text-indigo-400 transition-colors">
                {doc.title}
              </h3>
            </div>
            <div className="text-sm text-white/70 mb-3 space-y-1">
              <div>Loại: {doc.type || 'Chưa rõ'}</div>
              {doc.number && <div>Số hiệu: {doc.number}</div>}
              {doc.year && <div>Năm: {doc.year}</div>}
              {doc.authority && <div>Cơ quan: {doc.authority}</div>}
            </div>
            <div className="mt-3 text-xs text-white/50">
              {doc.status || 'Hiệu lực: cập nhật sau'}
            </div>
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
  );
};
