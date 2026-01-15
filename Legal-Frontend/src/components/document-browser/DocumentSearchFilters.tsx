import React from 'react';

interface DocumentSearchFiltersProps {
  searchTerm: string;
  setSearchTerm: (val: string) => void;
  docTypeFilter: string;
  setDocTypeFilter: (val: string) => void;
  yearFrom: string;
  setYearFrom: (val: string) => void;
  yearTo: string;
  setYearTo: (val: string) => void;
  authorityFilter: string;
  setAuthorityFilter: (val: string) => void;
  statusFilter: string;
  setStatusFilter: (val: string) => void;
  levelsFilter: string[];
  setLevelsFilter: React.Dispatch<React.SetStateAction<string[]>>;
}

export const DocumentSearchFilters: React.FC<DocumentSearchFiltersProps> = ({
  searchTerm,
  setSearchTerm,
  docTypeFilter,
  setDocTypeFilter,
  yearFrom,
  setYearFrom,
  yearTo,
  setYearTo,
  authorityFilter,
  setAuthorityFilter,
  statusFilter,
  setStatusFilter,
  levelsFilter,
  setLevelsFilter,
}) => 
{
  return (
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
          {['article', 'clause', 'point'].map(l => (
            <label key={l} className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={levelsFilter.includes(l)}
                onChange={(e) => 
{
                  if (e.target.checked) 
{
                    setLevelsFilter(prev => [...prev, l]);
                  }
 else 
{
                    setLevelsFilter(prev => prev.filter(x => x !== l));
                  }
                }}
              />
              <span className="capitalize">{l}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
};
