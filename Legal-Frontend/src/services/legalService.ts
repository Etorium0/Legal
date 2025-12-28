import { Message } from "../types";
import { authService } from "./authService";

// This service manages the connection to the Legal Backend.
// It tries to connect to the Go Backend (localhost:8080).
// Nếu backend không khả dụng, trả về thông báo thân thiện, không dùng Gemini fallback.

const runtimeBackend = (typeof window !== 'undefined' && (window as any).__BACKEND_URL__) as string | undefined;
const backendUrl = runtimeBackend || import.meta.env.VITE_BACKEND_URL;
const BASE_URL = backendUrl ? `${backendUrl}/api/v1` : `/api/v1`;
const QUERY_URL = `${BASE_URL}/query/rag`; // Use RAG endpoint for better accuracy

export const queryLegalAssistant = async (query: string): Promise<Partial<Message>> => 
{
  // 1. Attempt Real Backend Query
  try 
  {
    const token = await authService.getValidAccessToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token)
    {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(QUERY_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({ question: query, top_k: 5, answer: true }),
    });

    if (res.ok) 
    {
      const data = await res.json();
      console.log("Received response from Go Backend (RAG):", data);
      
      const answerText = data.answer || "Tôi đã tìm thấy một số thông tin nhưng không thể tổng hợp câu trả lời chi tiết.";
      const items = data.items || [];
      
      const sources = items.map((item: any) => 
      {
        // Fallback for missing title
        let docTitle = item.document_title;
        // Check if title is useless (like just an ID or empty)
        if (!docTitle || docTitle.trim() === '' || /^\d+$/.test(docTitle)) 
        {
           docTitle = item.code ? `Văn bản ${item.code}` : "Văn bản pháp luật";
        }
        
        // Ensure unit_id exists
        const unitId = item.unit_id || item.id;
        
        return {
          document: docTitle,
          unit: `${item.level ? item.level + ' ' : ''}${item.code || ''}`.trim(),
          url: unitId ? `/unit/${unitId}` : '#',
        };
      });

      console.log("[LegalService] Processed sources:", sources);

      return {
        text: answerText,
        sources: sources,
        triples: [], // RAG doesn't return triples currently
        role: 'assistant',
        timestamp: new Date(),
      };
    }
  }
 catch (error) 
{
    console.warn("Backend không khả dụng hoặc hết thời gian chờ.", error);
  }

  // 2. Fallback: Thông báo thân thiện, không gọi Gemini
  return {
    text: "Xin lỗi, hệ thống đang bận hoặc chưa đủ dữ liệu để trả lời câu hỏi này. Vui lòng thử lại sau vài phút hoặc hỏi về Nghị định 100/2019 (xử phạt giao thông).",
    sources: [],
    triples: [],
    role: 'assistant',
    timestamp: new Date(),
  };
};

// Mock documents for the Documents view
export const getMockDocuments = () => 
{
  return [
    {
      id: '1',
      title: 'Quy định xử phạt vi phạm hành chính về trật tự, an toàn giao thông',
      type: 'decree',
      number: '100/2019/NĐ-CP',
      year: 2019,
      issued_by: 'Chính phủ',
      effective_date: ''
    },
    {
      id: '2',
      title: 'Bộ luật Hình sự',
      type: 'law',
      number: '100/2015/QH13',
      year: 2015,
      issued_by: 'Quốc hội',
      effective_date: '2016-01-01'
    },
    {
      id: '3',
      title: 'Bộ luật Dân sự',
      type: 'law',
      number: '91/2015/QH13',
      year: 2015,
      issued_by: 'Quốc hội',
      effective_date: '2017-01-01'
    }
  ];
};
