import React from 'react';

type RecommendationBoxProps = {
  recoKeyword: string;
  setRecoKeyword: (keyword: string) => void;
  fetchRecommend: () => void;
  recoLoading: boolean;
  recoError: string | null;
  recoItems: any[];
};

export const RecommendationBox: React.FC<RecommendationBoxProps> = ({
  recoKeyword,
  setRecoKeyword,
  fetchRecommend,
  recoLoading,
  recoError,
  recoItems,
}) =>
{
  return (
    <div className="mb-8 p-4 border border-white/10 bg-white/5 rounded-xl">
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <input
          type="text"
          placeholder="Nhập từ khóa để gợi ý điều/khoản..."
          value={recoKeyword}
          onChange={(e) => setRecoKeyword(e.target.value)}
          className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          onClick={fetchRecommend}
          className="px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors"
        >
          Gợi ý
        </button>
      </div>
      {recoLoading && <div className="text-white/70 mt-3">Đang tìm gợi ý...</div>}
      {recoError && <div className="text-red-300 mt-3">{recoError}</div>}
      {!recoLoading && !recoError && recoItems.length > 0 && (
        <div className="mt-4 space-y-3">
          {recoItems.map((item, idx) => (
            <div key={idx} className="p-3 bg-white/5 border border-white/10 rounded-lg">
              <div className="flex items-center justify-between text-white/80 text-sm mb-1">
                <span>{item.document_title || 'Tài liệu'}</span>
                {item.code && (
                  <span className="px-2 py-1 bg-indigo-500/20 text-indigo-200 rounded text-xs">
                    {item.code}
                  </span>
                )}
              </div>
              <div className="text-white text-sm whitespace-pre-wrap leading-relaxed">
                {item.snippet}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
