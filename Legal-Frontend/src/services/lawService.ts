import { authService } from "./authService";

const runtimeBackend = (typeof window !== 'undefined' && (window as any).__BACKEND_URL__) as string | undefined;
const backendUrl = runtimeBackend || import.meta.env.VITE_BACKEND_URL || '';
const API_URL = `${backendUrl}/api/v1/query`;

export interface Document {
  id: string;
  title: string;
  type: string;
  number?: string;
  authority?: string;
  status?: string;
  year?: number;
  created_at?: string;
}

export interface Unit {
  id: string;
  document_id: string;
  level: string; // 'chapter', 'article', etc.
  code?: string;
  text: string;
  order_index?: number;
  children?: Unit[];
}

export interface DocumentFilter {
  search?: string;
  type?: string;
  authority?: string;
  status?: string;
  year_from?: number;
  year_to?: number;
  page?: number;
  limit?: number;
}

class LawService 
{
  private async fetchWithAuth(url: string, options: RequestInit = {}) 
{
    const token = await authService.getValidAccessToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };
    
    if (token) 
{
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(url, { ...options, headers });
    if (!res.ok) 
{
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    return res.json();
  }

  async getDocuments(filter: DocumentFilter) 
{
    const params = new URLSearchParams();
    if (filter.search) {params.set('search', filter.search);}
    if (filter.type) {params.append('type', filter.type);}
    if (filter.authority) {params.set('authority', filter.authority);}
    if (filter.status) {params.set('status', filter.status);}
    if (filter.year_from) {params.set('year_from', filter.year_from.toString());}
    if (filter.year_to) {params.set('year_to', filter.year_to.toString());}
    
    const limit = filter.limit || 10;
    const offset = ((filter.page || 1) - 1) * limit;
    
    params.set('limit', limit.toString());
    params.set('offset', offset.toString());

    return this.fetchWithAuth(`${API_URL}/documents?${params.toString()}`);
  }

  async getDocument(id: string): Promise<Document> 
{
    return this.fetchWithAuth(`${API_URL}/documents/${id}`);
  }

  async getDocumentTree(id: string): Promise<Unit[]> 
{
    const res = await this.fetchWithAuth(`${API_URL}/documents/${id}/tree`);
    return res.items || [];
  }

  async getUnits(documentId: string, limit = 200, offset = 0): Promise<{items: Unit[], total: number}> 
{
    return this.fetchWithAuth(`${API_URL}/documents/${documentId}/units?limit=${limit}&offset=${offset}`);
  }
}

export const lawService = new LawService();
