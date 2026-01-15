import { useState, useEffect, useMemo } from 'react';
import { authService } from '../services/authService';
import { DocItem, UnitItem, CitationItem } from '../components/document-browser/types';

export const useDocumentBrowser = () =>
{
  const [activeTab, setActiveTab] = useState<'vbpl' | 'phapdien'>('vbpl');
  const [searchTerm, setSearchTerm] = useState('');
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<DocItem | null>(null);
  const [units, setUnits] = useState<UnitItem[]>([]);
  const [unitsLoading, setUnitsLoading] = useState(false);
  const [unitsError, setUnitsError] = useState<string | null>(null);

  const [tree, setTree] = useState<UnitItem[]>([]);
  const [treeLoading, setTreeLoading] = useState(false);
  const [treeError, setTreeError] = useState<string | null>(null);
  const [treeSearch, setTreeSearch] = useState('');
  const [filteredTree, setFilteredTree] = useState<UnitItem[]>([]);

  const [selectedUnit, setSelectedUnit] = useState<UnitItem | null>(null);
  const [citationsOut, setCitationsOut] = useState<CitationItem[]>([]);
  const [citationsIn, setCitationsIn] = useState<CitationItem[]>([]);
  const [citationsLoading, setCitationsLoading] = useState(false);
  const [citationsError, setCitationsError] = useState<string | null>(null);

  const [unitDetailText, setUnitDetailText] = useState<string>('');
  const [unitDetailLoading, setUnitDetailLoading] = useState(false);
  const [unitDetailError, setUnitDetailError] = useState<string | null>(null);

  const [recoKeyword, setRecoKeyword] = useState('');
  const [recoItems, setRecoItems] = useState<any[]>([]);
  const [recoLoading, setRecoLoading] = useState(false);
  const [recoError, setRecoError] = useState<string | null>(null);

  const [docTypeFilter, setDocTypeFilter] = useState('');
  const [yearFrom, setYearFrom] = useState('');
  const [yearTo, setYearTo] = useState('');
  const [authorityFilter, setAuthorityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [levelsFilter, setLevelsFilter] = useState<string[]>([]);

  const runtimeBackend = (typeof window !== 'undefined' && (window as any).__BACKEND_URL__) as string | undefined;
  const backendUrl = runtimeBackend || import.meta.env.VITE_BACKEND_URL;
  const apiBase = backendUrl ? `${backendUrl}/api/v1` : '/api/v1';

  useEffect(() =>
  {
    try
    {
      const voiceQuery = localStorage.getItem('voiceDocQuery') || '';
      if (voiceQuery)
      {
        setSearchTerm(voiceQuery);
        localStorage.removeItem('voiceDocQuery');
      }
    }
    catch
    {
      // ignore storage errors
    }
  }, []);

  useEffect(() =>
  {
    const fetchDocs = async () =>
    {
      setLoading(true);
      setError(null);
      try
      {
        const params = new URLSearchParams();
        if (searchTerm)
        {
          params.set('search', searchTerm);
        }
        if (docTypeFilter)
        {
          params.append('type', docTypeFilter);
        }
        if (authorityFilter)
        {
          params.set('authority', authorityFilter);
        }
        if (statusFilter)
        {
          params.set('status', statusFilter);
        }
        if (yearFrom)
        {
          params.set('year_from', yearFrom);
        }
        if (yearTo)
        {
          params.set('year_to', yearTo);
        }
        params.set('limit', '30');
        const token = await authService.getValidAccessToken();
        const headers: Record<string, string> = {};
        if (token)
        {
          headers['Authorization'] = `Bearer ${token}`;
        }
        const res = await fetch(`${apiBase}/query/documents?${params.toString()}`, { headers });
        if (!res.ok)
        {
          throw new Error(`HTTP ${res.status}`);
        }
        const data = await res.json();
        setDocs(data.items || []);
      }
      catch (err: any)
      {
        setError(err?.message || 'Không tải được danh sách văn bản');
        setDocs([]);
      }
      finally
      {
        setLoading(false);
      }
    };
    fetchDocs();
  }, [apiBase, searchTerm, docTypeFilter, authorityFilter, statusFilter, yearFrom, yearTo]);

  useEffect(() =>
  {
    if (!selectedDoc)
    {
      setUnits([]);
      setTree([]);
      setFilteredTree([]);
      setSelectedUnit(null);
      return;
    }
    const fetchUnits = async () =>
    {
      setUnitsLoading(true);
      setUnitsError(null);
      try
      {
        const token = await authService.getValidAccessToken();
        const headers: Record<string, string> = {};
        if (token)
        {
          headers['Authorization'] = `Bearer ${token}`;
        }
        const res = await fetch(`${apiBase}/query/documents/${selectedDoc.id}/units?limit=200`, { headers });
        if (!res.ok)
        {
          throw new Error(`HTTP ${res.status}`);
        }
        const data = await res.json();
        setUnits(data.items || []);
      }
      catch (err: any)
      {
        setUnitsError(err?.message || 'Không tải được các điều/khoản');
        setUnits([]);
      }
      finally
      {
        setUnitsLoading(false);
      }
    };
    const fetchTree = async () =>
    {
      setTreeLoading(true);
      setTreeError(null);
      try
      {
        const token = await authService.getValidAccessToken();
        const headers: Record<string, string> = {};
        if (token)
        {
          headers['Authorization'] = `Bearer ${token}`;
        }
        const res = await fetch(`${apiBase}/query/documents/${selectedDoc.id}/tree`, { headers });
        if (!res.ok)
        {
          throw new Error(`HTTP ${res.status}`);
        }
        const data = await res.json();
        setTree(data.items || []);
      }
      catch (err: any)
      {
        setTreeError(err?.message || 'Không tải được cây pháp điển');
        setTree([]);
      }
      finally
      {
        setTreeLoading(false);
      }
    };
    fetchUnits();
    fetchTree();
  }, [apiBase, selectedDoc]);

  useEffect(() =>
  {
    const term = treeSearch.trim().toLowerCase();
    if (!term)
    {
      setFilteredTree(tree);
      return;
    }
    const matchNode = (n: UnitItem): boolean =>
    {
      const codeText = (n.code || '').toLowerCase();
      const bodyText = (n.text || '').toLowerCase();
      return codeText.includes(term) || bodyText.includes(term);
    };
    const filterNodes = (nodes: UnitItem[]): UnitItem[] =>
    {
      return nodes
        .map((n) =>
        {
          const children = Array.isArray(n.children) ? filterNodes(n.children) : [];
          const selfMatch = matchNode(n);
          if (selfMatch || children.length > 0)
          {
            return { ...n, children };
          }
          return null as unknown as UnitItem;
        })
        .filter(Boolean) as UnitItem[];
    };
    setFilteredTree(filterNodes(tree));
  }, [tree, treeSearch]);

  useEffect(() =>
  {
    if (!selectedUnit)
    {
      setCitationsOut([]);
      setCitationsIn([]);
      setUnitDetailText('');
      setUnitDetailError(null);
      return;
    }
    const fetchCitations = async () =>
    {
      setCitationsLoading(true);
      setCitationsError(null);
      try
      {
        const token = await authService.getValidAccessToken();
        const headers: Record<string, string> = {};
        if (token)
        {
          headers['Authorization'] = `Bearer ${token}`;
        }
        const res = await fetch(`${apiBase}/query/units/${selectedUnit.id}/citations`, { headers });
        if (!res.ok)
        {
          throw new Error(`HTTP ${res.status}`);
        }
        const data = await res.json();
        setCitationsOut(data.outbound || []);
        setCitationsIn(data.inbound || []);
      }
      catch (err: any)
      {
        setCitationsError(err?.message || 'Không tải được trích dẫn');
        setCitationsOut([]);
        setCitationsIn([]);
      }
      finally
      {
        setCitationsLoading(false);
      }
    };
    fetchCitations();
    const fetchUnitDetail = async () =>
    {
      setUnitDetailLoading(true);
      setUnitDetailError(null);
      try
      {
        const token = await authService.getValidAccessToken();
        const headers: Record<string, string> = {};
        if (token)
        {
          headers['Authorization'] = `Bearer ${token}`;
        }
        const res = await fetch(`${apiBase}/query/units/${selectedUnit.id}`, { headers });
        if (!res.ok)
        {
          throw new Error(`HTTP ${res.status}`);
        }
        const data = await res.json();
        const text = data?.unit?.text || '';
        const cleaned = String(text)
          .replace(/\uFFFD/g, '')
          .replace(/\r?\n/g, '\n')
          .replace(/\s+\n/g, '\n')
          .replace(/\n{3,}/g, '\n\n')
          .trim();
        setUnitDetailText(cleaned);
      }
      catch (err: any)
      {
        setUnitDetailError(err?.message || 'Không tải được nội dung đơn vị');
        setUnitDetailText('');
      }
      finally
      {
        setUnitDetailLoading(false);
      }
    };
    fetchUnitDetail();
  }, [apiBase, selectedUnit]);

  const fetchRecommend = async () =>
  {
    if (!recoKeyword.trim())
    {
      return;
    }
    setRecoLoading(true);
    setRecoError(null);
    try
    {
      const params = new URLSearchParams({ keyword: recoKeyword, limit: '10' });
      if (docTypeFilter)
      {
        params.append('doc_type', docTypeFilter);
      }
      if (levelsFilter.length > 0)
      {
        levelsFilter.forEach(l => params.append('level', l));
      }
      if (yearFrom)
      {
        params.set('year_from', yearFrom);
      }
      if (yearTo)
      {
        params.set('year_to', yearTo);
      }
      const token = await authService.getValidAccessToken();
      const headers: Record<string, string> = {};
      if (token)
      {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch(`${apiBase}/query/recommend?${params.toString()}`, { headers });
      if (!res.ok)
      {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      setRecoItems(data.items || []);
    }
    catch (err: any)
    {
      setRecoError(err?.message || 'Không tìm được gợi ý');
      setRecoItems([]);
    }
    finally
    {
      setRecoLoading(false);
    }
  };

  const filteredDocs = useMemo(() => docs, [docs]);

  return {
    activeTab, setActiveTab,
    searchTerm, setSearchTerm,
    docs, loading, error,
    selectedDoc, setSelectedDoc,
    units, unitsLoading, unitsError,
    tree, treeLoading, treeError,
    treeSearch, setTreeSearch, filteredTree,
    selectedUnit, setSelectedUnit,
    citationsOut, citationsIn, citationsLoading, citationsError,
    unitDetailText, unitDetailLoading, unitDetailError,
    recoKeyword, setRecoKeyword,
    recoItems, recoLoading, recoError, fetchRecommend,
    docTypeFilter, setDocTypeFilter,
    yearFrom, setYearFrom,
    yearTo, setYearTo,
    authorityFilter, setAuthorityFilter,
    statusFilter, setStatusFilter,
    levelsFilter, setLevelsFilter,
    filteredDocs,
  };
};
