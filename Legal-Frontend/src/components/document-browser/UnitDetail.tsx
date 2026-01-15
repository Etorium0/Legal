import React from 'react';
import { Link } from 'react-router-dom';
import { UnitItem, CitationItem } from './types';

type UnitDetailProps = {
  selectedUnit: UnitItem;
  unitDetailLoading: boolean;
  unitDetailError: string | null;
  unitDetailText: string;
  citationsLoading: boolean;
  citationsError: string | null;
  citationsOut: CitationItem[];
  citationsIn: CitationItem[];
  onClose?: () => void;
};

export const UnitDetail: React.FC<UnitDetailProps> = ({
  selectedUnit,
  unitDetailLoading,
  unitDetailError,
  unitDetailText,
  citationsLoading,
  citationsError,
  citationsOut,
  citationsIn,
  onClose,
}) =>
{
  return (
    <>
      <div className="mt-6 bg-slate-800 border border-white/10 rounded-xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-white text-base font-semibold">
              {selectedUnit.code || selectedUnit.level}
            </span>
            <span className="text-xs text-white/50 px-2 py-1 bg-white/10 rounded">
              {selectedUnit.level}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to={`/unit/${selectedUnit.id}`}
              className="text-xs px-3 py-2 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-200 hover:bg-indigo-500/30 transition-colors"
            >
              👁️ Mở Viewer
            </Link>
            {onClose && (
              <button
                onClick={onClose}
                className="text-xs px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white/80 hover:bg-white/20 transition-colors"
              >
                ✕ Đóng
              </button>
            )}
          </div>
        </div>
        {unitDetailLoading && <div className="text-white/70">Đang tải nội dung...</div>}
        {unitDetailError && <div className="text-red-300 text-sm">{unitDetailError}</div>}
        {!unitDetailLoading && !unitDetailError && unitDetailText && (
          <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-white whitespace-pre-wrap leading-relaxed">
            {unitDetailText}
          </div>
        )}
      </div>

      {/* Citations */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {/* Outbound Citations */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-white text-sm font-semibold">Trích dẫn đi</div>
              <div className="text-white/50 text-xs">
                Từ {selectedUnit.code || selectedUnit.level}
              </div>
            </div>
          </div>
          {citationsLoading && <div className="text-white/70">Đang tải...</div>}
          {citationsError && <div className="text-red-300 text-sm">{citationsError}</div>}
          {!citationsLoading && !citationsError && citationsOut.length === 0 && (
            <div className="text-white/60 text-sm">Chưa có trích dẫn.</div>
          )}
          {!citationsLoading && !citationsError && citationsOut.length > 0 && (
            <div className="space-y-3">
              {citationsOut.map((c) => (
                <div key={c.id} className="p-3 bg-white/5 border border-white/10 rounded-lg">
                  <div className="flex items-center justify-between text-white/80 text-sm mb-1">
                    <span className="font-semibold">{c.peer_code || c.peer_level}</span>
                    <span className="text-xs text-white/50">{c.peer_document}</span>
                  </div>
                  <div className="text-white/80 text-sm line-clamp-4 whitespace-pre-wrap">
                    {c.peer_snippet}
                  </div>
                  {c.note && <div className="text-xs text-white/50 mt-2">Ghi chú: {c.note}</div>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Inbound Citations */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-white text-sm font-semibold">Trích dẫn đến</div>
              <div className="text-white/50 text-xs">
                Đến {selectedUnit.code || selectedUnit.level}
              </div>
            </div>
          </div>
          {citationsLoading && <div className="text-white/70">Đang tải...</div>}
          {citationsError && <div className="text-red-300 text-sm">{citationsError}</div>}
          {!citationsLoading && !citationsError && citationsIn.length === 0 && (
            <div className="text-white/60 text-sm">Chưa có trích dẫn.</div>
          )}
          {!citationsLoading && !citationsError && citationsIn.length > 0 && (
            <div className="space-y-3">
              {citationsIn.map((c) => (
                <div key={c.id} className="p-3 bg-white/5 border border-white/10 rounded-lg">
                  <div className="flex items-center justify-between text-white/80 text-sm mb-1">
                    <span className="font-semibold">{c.peer_code || c.peer_level}</span>
                    <span className="text-xs text-white/50">{c.peer_document}</span>
                  </div>
                  <div className="text-white/80 text-sm line-clamp-4 whitespace-pre-wrap">
                    {c.peer_snippet}
                  </div>
                  {c.note && <div className="text-xs text-white/50 mt-2">Ghi chú: {c.note}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};
