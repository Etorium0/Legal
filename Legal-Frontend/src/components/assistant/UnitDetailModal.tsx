import React from 'react';
import { X, FileText, ExternalLink } from 'lucide-react';

import { UnitDetail } from '../document-browser/types';

interface UnitDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  loading: boolean;
  unitDetail: UnitDetail | null;
}

export const UnitDetailModal: React.FC<UnitDetailModalProps> = ({
  isOpen,
  onClose,
  loading,
  unitDetail
}) =>
{
  if (!isOpen)
  {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 animate-in fade-in duration-200">
      <div className="bg-[#1E293B] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-2 text-blue-400">
            <FileText className="w-5 h-5" />
            <h3 className="font-semibold text-lg">Chi tiết điều luật</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 text-gray-200">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-gray-400">Đang tải nội dung...</p>
            </div>
          ) : unitDetail ? (
            <div className="space-y-6">
              {unitDetail.document.title && (
                <div>
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Văn bản</h4>
                  <p className="text-blue-300 font-medium leading-relaxed bg-blue-500/10 p-3 rounded-lg border border-blue-500/20">
                    {unitDetail.document.title}
                  </p>
                </div>
              )}
              
              {unitDetail.unit.text && (
                <div>
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Nội dung</h4>
                  <div className="bg-white/5 p-4 rounded-xl border border-white/5 leading-relaxed whitespace-pre-wrap font-serif text-lg">
                    {unitDetail.unit.text}
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                 <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition-colors">
                    <ExternalLink className="w-4 h-4" />
                    Xem văn bản gốc
                 </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              Không tìm thấy dữ liệu
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
