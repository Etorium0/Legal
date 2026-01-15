import React from 'react';
import { Link } from 'react-router-dom';
import { DocItem, UnitItem, CitationItem } from './types';
import { TreeNode } from './TreeNode';
import { UnitDetail } from './UnitDetail';

type DocumentDetailProps = {
  selectedDoc: DocItem;
  setSelectedDoc: (doc: DocItem | null) => void;
  unitsLoading: boolean;
  unitsError: string | null;
  units: UnitItem[];
  selectedUnit: UnitItem | null;
  setSelectedUnit: (unit: UnitItem | null) => void;
  treeLoading: boolean;
  treeError: string | null;
  tree: UnitItem[];
  filteredTree: UnitItem[];
  treeSearch: string;
  setTreeSearch: (term: string) => void;
  unitDetailLoading: boolean;
  unitDetailError: string | null;
  unitDetailText: string;
  citationsLoading: boolean;
  citationsError: string | null;
  citationsOut: CitationItem[];
  citationsIn: CitationItem[];
};

export const DocumentDetail: React.FC<DocumentDetailProps> = ({
  selectedDoc,
  setSelectedDoc,
  unitsLoading,
  unitsError,
  units,
  selectedUnit,
  setSelectedUnit,
  treeLoading,
  treeError,
  tree,
  filteredTree,
  treeSearch,
  setTreeSearch,
  unitDetailLoading,
  unitDetailError,
  unitDetailText,
  citationsLoading,
  citationsError,
  citationsOut,
  citationsIn,
}) =>
{
  const [viewMode, setViewMode] = React.useState<'list' | 'tree'>('list');
  const renderHighlighted = (text: string, term: string) => 
{
    const t = term.trim();
    if (!t) {return text;}
    const idx = text.toLowerCase().indexOf(t.toLowerCase());
    if (idx === -1) {return text;}
    const before = text.slice(0, idx);
    const match = text.slice(idx, idx + t.length);
    const after = text.slice(idx + t.length);
    return (
      <>
        {before}
        <span className="bg-yellow-500/30 text-yellow-200 px-0.5 rounded">{match}</span>
        {after}
      </>
    );
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4 overflow-y-auto bg-[#0a0a0a]"
      onClick={() => setSelectedDoc(null)}
    >
      <div
        className="bg-slate-900 border border-white/10 shadow-2xl w-full max-w-6xl h-full sm:h-auto max-h-[100vh] sm:max-h-[85vh] overflow-hidden flex flex-col my-0 sm:my-auto rounded-none sm:rounded-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-white/10 flex-shrink-0">
          <div>
            <h3 className="text-2xl font-semibold text-white">{selectedDoc.title}</h3>
            <p className="text-white/60 text-sm mt-1">Các đơn vị (điều/khoản/mục) thuộc văn bản</p>
          </div>
          <button
            onClick={() => setSelectedDoc(null)}
            className="text-sm px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 border border-white/10 transition-colors"
          >
            ✕ Đóng
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Tab Navigation */}
          <div className="flex gap-2 px-6 pt-4 border-b border-white/10">
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 font-medium transition-all ${
                viewMode === 'list'
                  ? 'text-white border-b-2 border-indigo-500'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              📋 Danh sách phẳng
            </button>
            <button
              onClick={() => setViewMode('tree')}
              className={`px-4 py-2 font-medium transition-all ${
                viewMode === 'tree'
                  ? 'text-white border-b-2 border-indigo-500'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              🌲 Cây pháp điển
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            {viewMode === 'list' && (
              <div className="space-y-4">
                {unitsLoading && <div className="text-white/70">Đang tải...</div>}
                {unitsError && <div className="text-red-300">{unitsError}</div>}

                {!unitsLoading && !unitsError && (
                  <>
                    {units.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => setSelectedUnit(u)}
                        className={`w-full text-left p-5 bg-white/5 border rounded-xl transition-all hover:shadow-lg ${
                          selectedUnit?.id === u.id
                            ? 'border-indigo-400 bg-indigo-500/10 shadow-indigo-500/20'
                            : 'border-white/10 hover:bg-white/10 hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-start justify-between text-white/80 text-sm mb-3 gap-3">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className="flex-shrink-0 font-medium">{u.level || 'unit'}</span>
                            {u.code && (
                              <span
                                className={`px-2 py-1 rounded text-xs font-mono truncate max-w-[100px] ${
                                  selectedUnit?.id === u.id
                                    ? 'bg-indigo-500/40 text-white'
                                    : 'bg-indigo-500/20 text-indigo-200'
                                }`}
                                title={u.code}
                              >
                                {u.code}
                              </span>
                            )}
                          </div>
                          <Link
                            to={`/unit/${u.id}`}
                            className="text-xs px-3 py-1.5 rounded-md bg-indigo-500/20 border border-indigo-500/30 text-indigo-200 hover:bg-indigo-500/30 transition-colors whitespace-nowrap flex-shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            👁️ Xem
                          </Link>
                        </div>
                        <div className="text-white/90 text-sm whitespace-pre-wrap leading-relaxed line-clamp-4">
                          {u.text}
                        </div>
                      </button>
                    ))}

                    {units.length === 0 && (
                      <div className="text-white/60 text-center py-8">
                        Chưa có nội dung cho văn bản này.
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {viewMode === 'tree' && (
              <div className="-mt-6 -mx-6">
                <div className="sticky top-0 bg-slate-900 px-6 py-4 border-b border-white/10 z-10">
                  <input
                    type="text"
                    placeholder="🔍 Tìm trong cây..."
                    value={treeSearch}
                    onChange={(e) => setTreeSearch(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-lg"
                  />
                </div>
                <div className="px-6 pt-4 space-y-2">

                {treeLoading && <div className="text-white/70">Đang tải cây...</div>}
                {treeError && <div className="text-red-300">{treeError}</div>}

                {!treeLoading &&
                  !treeError &&
                  (treeSearch ? filteredTree.length === 0 : tree.length === 0) && (
                    <div className="text-white/60 text-center py-8">
                      Chưa có cấu trúc cây cho văn bản này.
                    </div>
                  )}

                {!treeLoading &&
                  !treeError &&
                  (treeSearch ? filteredTree.length > 0 : tree.length > 0) && (
                    <div className="space-y-2">
                      {(treeSearch ? filteredTree : tree).map((node) => (
                        <TreeNode
                          key={node.id}
                          node={node}
                          depth={0}
                          onSelect={setSelectedUnit}
                          selectedId={selectedUnit?.id}
                          term={treeSearch}
                          renderHighlighted={renderHighlighted}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

        {selectedUnit && (
          <UnitDetail
            selectedUnit={selectedUnit}
            unitDetailLoading={unitDetailLoading}
            unitDetailError={unitDetailError}
            unitDetailText={unitDetailText}
            citationsLoading={citationsLoading}
            citationsError={citationsError}
            citationsOut={citationsOut}
            citationsIn={citationsIn}
            onClose={() => setSelectedUnit(null)}
          />
        )}
        </div>
      </div>
    </div>
  );
};
