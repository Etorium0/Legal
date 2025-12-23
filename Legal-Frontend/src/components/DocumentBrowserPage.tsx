import React, { useEffect, useMemo, useState } from 'react'
import SimpleLayout from './SimpleLayout'
import { authService } from '../services/authService'

type DocItem = {
  id: string
  title: string
  type: string
  number?: string | null
  year?: number | null
  authority?: string | null
  status?: string | null
  created_at?: string
  updated_at?: string
}

type UnitItem = {
  id: string
  level: string
  code?: string | null
  text: string
  order_index: number
  parent_id?: string | null
  children?: UnitItem[]
}

type CitationItem = {
  id: string
  source_unit_id: string
  target_unit_id: string
  note: string
  peer_code: string
  peer_level: string
  peer_document_id: string
  peer_document: string
  peer_snippet: string
}

const DocumentBrowserPage: React.FC = () => 
{
  const [searchTerm, setSearchTerm] = useState('')
  const [docs, setDocs] = useState<DocItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedDoc, setSelectedDoc] = useState<DocItem | null>(null)
  const [units, setUnits] = useState<UnitItem[]>([])
  const [unitsLoading, setUnitsLoading] = useState(false)
  const [unitsError, setUnitsError] = useState<string | null>(null)

  const [tree, setTree] = useState<UnitItem[]>([])
  const [treeLoading, setTreeLoading] = useState(false)
  const [treeError, setTreeError] = useState<string | null>(null)

  const [selectedUnit, setSelectedUnit] = useState<UnitItem | null>(null)
  const [citationsOut, setCitationsOut] = useState<CitationItem[]>([])
  const [citationsIn, setCitationsIn] = useState<CitationItem[]>([])
  const [citationsLoading, setCitationsLoading] = useState(false)
  const [citationsError, setCitationsError] = useState<string | null>(null)

  const [recoKeyword, setRecoKeyword] = useState('')
  const [recoItems, setRecoItems] = useState<any[]>([])
  const [recoLoading, setRecoLoading] = useState(false)
  const [recoError, setRecoError] = useState<string | null>(null)

  const [docTypeFilter, setDocTypeFilter] = useState('')
  const [yearFrom, setYearFrom] = useState('')
  const [yearTo, setYearTo] = useState('')
  const [authorityFilter, setAuthorityFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [levelsFilter, setLevelsFilter] = useState<string[]>([])

  const runtimeBackend = (typeof window !== 'undefined' && (window as any).__BACKEND_URL__) as string | undefined
  const backendUrl = runtimeBackend || import.meta.env.VITE_BACKEND_URL
  const apiBase = backendUrl ? `${backendUrl}/api/v1` : '/api/v1'

  useEffect(() => {
    try {
      const voiceQuery = localStorage.getItem('voiceDocQuery') || '';
      if (voiceQuery) {
        setSearchTerm(voiceQuery);
        localStorage.removeItem('voiceDocQuery');
      }
    } catch (e) {
      // ignore storage errors
    }
  }, []);

  useEffect(() => {
    const fetchDocs = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (searchTerm) { params.set('search', searchTerm); }
        if (docTypeFilter) { params.append('type', docTypeFilter); }
        if (authorityFilter) { params.set('authority', authorityFilter); }
        if (statusFilter) { params.set('status', statusFilter); }
        if (yearFrom) { params.set('year_from', yearFrom); }
        if (yearTo) { params.set('year_to', yearTo); }
        params.set('limit', '30');
        const token = await authService.getValidAccessToken();
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const res = await fetch(`${apiBase}/query/documents?${params.toString()}`, { headers });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setDocs(data.items || []);
      } catch (err: any) {
        setError(err?.message || 'Không tải được danh sách văn bản');
        setDocs([]);
      } finally {
        setLoading(false);
      }
    };
    fetchDocs();
  }, [apiBase, searchTerm]);

  useEffect(() => {
    if (!selectedDoc) {
      setUnits([]);
      setTree([]);
      setSelectedUnit(null);
      return;
    }
    const fetchUnits = async () => {
      setUnitsLoading(true);
      setUnitsError(null);
      try {
        const token = await authService.getValidAccessToken();
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const res = await fetch(`${apiBase}/query/documents/${selectedDoc.id}/units?limit=200`, { headers });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setUnits(data.items || []);
      } catch (err: any) {
        setUnitsError(err?.message || 'Không tải được các điều/khoản');
        setUnits([]);
      } finally {
        setUnitsLoading(false);
      }
    };
    const fetchTree = async () => {
      setTreeLoading(true);
      setTreeError(null);
      try {
        const token = await authService.getValidAccessToken();
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const res = await fetch(`${apiBase}/query/documents/${selectedDoc.id}/tree`, { headers });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setTree(data.items || []);
      } catch (err: any) {
        setTreeError(err?.message || 'Không tải được cây pháp điển');
        setTree([]);
      } finally {
        setTreeLoading(false);
      }
    };
    fetchUnits();
    fetchTree();
  }, [apiBase, selectedDoc]);

  useEffect(() => {
    if (!selectedUnit) {
      setCitationsOut([]);
      setCitationsIn([]);
      return;
    }
    const fetchCitations = async () => {
      setCitationsLoading(true);
      setCitationsError(null);
      try {
        const token = await authService.getValidAccessToken();
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const res = await fetch(`${apiBase}/query/units/${selectedUnit.id}/citations`, { headers });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setCitationsOut(data.outbound || []);
        setCitationsIn(data.inbound || []);
      } catch (err: any) {
        setCitationsError(err?.message || 'Không tải được trích dẫn');
        setCitationsOut([]);
        setCitationsIn([]);
      } finally {
        setCitationsLoading(false);
      }
    };
    fetchCitations();
  }, [apiBase, selectedUnit]);

  const filteredDocs = useMemo(() => docs, [docs]);

  const fetchRecommend = async () => {
    if (!recoKeyword.trim()) return;
    setRecoLoading(true);
    setRecoError(null);
    try {
      const params = new URLSearchParams({ keyword: recoKeyword, limit: '10' });
      if (docTypeFilter) params.append('doc_type', docTypeFilter);
      if (levelsFilter.length > 0) levelsFilter.forEach(l => params.append('level', l));
      if (yearFrom) params.set('year_from', yearFrom);
      if (yearTo) params.set('year_to', yearTo);
      const token = await authService.getValidAccessToken();
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`${apiBase}/query/recommend?${params.toString()}`, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setRecoItems(data.items || []);
    } catch (err: any) {
      setRecoError(err?.message || 'Không tìm được gợi ý');
      setRecoItems([]);
    } finally {
      setRecoLoading(false);
    }
  };

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
        <div className="mb-6 space-y-3">
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
          <div className="grid gap-3 md:grid-cols-3">
            <input
              type="text"
              placeholder="Loại văn bản (vd: law, decree)"
              value={docTypeFilter}
              onChange={(e) => setDocTypeFilter(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <input
              type="number"
              placeholder="Năm từ"
              value={yearFrom}
              onChange={(e) => setYearFrom(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <input
              type="number"
              placeholder="Năm đến"
              value={yearTo}
              onChange={(e) => setYearTo(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <input
              type="text"
              placeholder="Cơ quan ban hành"
              value={authorityFilter}
              onChange={(e) => setAuthorityFilter(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <input
              type="text"
              placeholder="Tình trạng (active, repealed...)"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div className="flex items-center gap-3 text-white/80 text-sm flex-wrap">
              {['article','clause','point'].map(l => (
                <label key={l} className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={levelsFilter.includes(l)}
                    onChange={(e) => {
                      if (e.target.checked) setLevelsFilter(prev => [...prev, l])
                      else setLevelsFilter(prev => prev.filter(x => x !== l))
                    }}
                  />
                  <span className="capitalize">{l}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Recommendation by keyword */}
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
                    {item.code && <span className="px-2 py-1 bg-indigo-500/20 text-indigo-200 rounded text-xs">{item.code}</span>}
                  </div>
                  <div className="text-white text-sm whitespace-pre-wrap leading-relaxed">{item.snippet}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Status states */}
        {loading && (
          <div className="text-center py-8 text-white/70">Đang tải danh sách văn bản...</div>
        )}
        {error && (
          <div className="text-center py-8 text-red-300">{error}</div>
        )}

        {/* Documents Grid */}
        {!loading && !error && (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredDocs.map(doc => (
                <div
                  key={doc.id}
                  className="rounded-xl border border-white/10 bg-white/5 backdrop-blur p-6 hover:bg-white/10 transition-all group"
                  onClick={() => setSelectedDoc(doc)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-semibold text-white group-hover:text-indigo-400 transition-colors">{doc.title}</h3>
                  </div>
                  <div className="text-sm text-white/70 mb-3 space-y-1">
                    <div>Loại: {doc.type || 'Chưa rõ'}</div>
                    {doc.number && <div>Số hiệu: {doc.number}</div>}
                    {doc.year && <div>Năm: {doc.year}</div>}
                    {doc.authority && <div>Cơ quan: {doc.authority}</div>}
                  </div>
                  <div className="mt-3 text-xs text-white/50">{doc.status || 'Hiệu lực: cập nhật sau'}</div>
                </div>
              ))}
            </div>

            {filteredDocs.length === 0 && (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📄</div>
                <p className="text-white/60">Không tìm thấy tài liệu nào</p>
              </div>
            )}
          </>
        )}

        {/* Units of selected document */}
        {selectedDoc && (
          <div className="mt-10 bg-white/5 border border-white/10 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-2xl font-semibold text-white">{selectedDoc.title}</h3>
                <p className="text-white/60 text-sm">Các đơn vị (điều/khoản/mục) thuộc văn bản</p>
              </div>
              <button
                onClick={() => setSelectedDoc(null)}
                className="text-sm px-3 py-2 bg-white/10 rounded-lg hover:bg-white/20 border border-white/10"
              >
                Đóng
              </button>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-3 max-h-[480px] overflow-y-auto pr-2">
                <div className="text-white/70 text-sm mb-1">Danh sách phẳng</div>
                {unitsLoading && <div className="text-white/70">Đang tải...</div>}
                {unitsError && <div className="text-red-300">{unitsError}</div>}

                {!unitsLoading && !unitsError && (
                  <div className="space-y-3">
                    {units.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => setSelectedUnit(u)}
                        className={`w-full text-left p-4 bg-white/5 border rounded-lg transition-colors ${selectedUnit?.id === u.id ? 'border-indigo-400 bg-indigo-500/10' : 'border-white/10 hover:bg-white/10'}`}
                      >
                        <div className="flex items-center justify-between text-white/80 text-sm mb-2">
                          <span>{u.level || 'unit'}</span>
                          {u.code && <span className={`px-2 py-1 rounded text-xs ${selectedUnit?.id === u.id ? 'bg-indigo-500/40 text-white' : 'bg-indigo-500/20 text-indigo-200'}`}>{u.code}</span>}
                        </div>
                        <div className="text-white/90 text-sm whitespace-pre-wrap leading-relaxed line-clamp-6">{u.text}</div>
                      </button>
                    ))}

                    {units.length === 0 && (
                      <div className="text-white/60 text-center py-4">Chưa có nội dung cho văn bản này.</div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-3 max-h-[480px] overflow-y-auto pr-2">
                <div className="text-white/70 text-sm mb-1">Cây pháp điển</div>
                {treeLoading && <div className="text-white/70">Đang tải cây...</div>}
                {treeError && <div className="text-red-300">{treeError}</div>}
                {!treeLoading && !treeError && tree.length === 0 && (
                  <div className="text-white/60">Chưa có cấu trúc cây cho văn bản này.</div>
                )}
                {!treeLoading && !treeError && tree.length > 0 && (
                  <div className="space-y-2">
                    {tree.map((node) => (
                      <TreeNode key={node.id} node={node} depth={0} onSelect={setSelectedUnit} selectedId={selectedUnit?.id} />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Citations */}
            {selectedUnit && (
              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="text-white text-sm font-semibold">Trích dẫn đi</div>
                      <div className="text-white/50 text-xs">Từ {selectedUnit.code || selectedUnit.level}</div>
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
                          <div className="text-white/80 text-sm line-clamp-4 whitespace-pre-wrap">{c.peer_snippet}</div>
                          {c.note && <div className="text-xs text-white/50 mt-2">Ghi chú: {c.note}</div>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="text-white text-sm font-semibold">Trích dẫn đến</div>
                      <div className="text-white/50 text-xs">Đến {selectedUnit.code || selectedUnit.level}</div>
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
                          <div className="text-white/80 text-sm line-clamp-4 whitespace-pre-wrap">{c.peer_snippet}</div>
                          {c.note && <div className="text-xs text-white/50 mt-2">Ghi chú: {c.note}</div>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </SimpleLayout>
  )
}

const TreeNode: React.FC<{ node: UnitItem; depth: number; onSelect: (u: UnitItem) => void; selectedId?: string }> = ({ node, depth, onSelect, selectedId }) => {
  return (
    <div className={`rounded-lg border p-3 cursor-pointer transition-colors ${selectedId === node.id ? 'border-indigo-400 bg-indigo-500/10' : 'border-white/5 bg-white/5 hover:bg-white/10'}`} style={{ marginLeft: depth * 12 }} onClick={() => onSelect(node)}>
      <div className="flex items-center justify-between text-white/80 text-sm mb-1">
        <span className="font-semibold">{node.code || node.level}</span>
        <span className="text-xs text-white/50">{node.level}</span>
      </div>
      <div className="text-white/90 text-sm whitespace-pre-wrap leading-relaxed line-clamp-4">{node.text}</div>
      {node.children && node.children.length > 0 && (
        <div className="mt-2 space-y-2">
          {node.children.map((child) => (
            <TreeNode key={child.id} node={child} depth={depth + 1} onSelect={onSelect} selectedId={selectedId} />
          ))}
        </div>
      )}
    </div>
  )
}

export default DocumentBrowserPage
