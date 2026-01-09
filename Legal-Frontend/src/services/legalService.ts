import { Message } from "../types";
import { authService } from "./authService";
import { API_BASE_URL } from "../config";

// This service manages the connection to the Legal Backend.
// It tries to connect to the Go Backend (localhost:8080).
// Nếu backend không khả dụng, trả về thông báo thân thiện, không dùng Gemini fallback.

const BASE_URL = API_BASE_URL;
const QUERY_URL = `${BASE_URL}/query/rag`; // Use RAG endpoint for better accuracy

export const queryLegalAssistant = async (query: string): Promise<Partial<Message>> => {
  // 1. Attempt Real Backend Query
  try {
    const token = await authService.getValidAccessToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json; charset=utf-8' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(QUERY_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({ question: query, top_k: 15, answer: true }),
    });

    if (res.ok) {
      const data = await res.json();
      console.log("Received response from Go Backend (RAG):", data);

      const answerText = data.answer || "Tôi đã tìm thấy một số thông tin nhưng không thể tổng hợp câu trả lời chi tiết.";
      const items = data.items || [];

      // Extract article numbers mentioned in the answer
      const mentionedArticles = new Set<string>();
      
      // Match patterns like: Điều 123, Điều 16.1.LQ.51, Điều 51, khoản 1 Điều 123
      const articlePatterns = [
        /Điều\s+(\d+(?:\.\d+)?(?:\.LQ\.?\d*)?)/gi,
        /điều\s+(\d+(?:\.\d+)?(?:\.LQ\.?\d*)?)/gi,
        /(\d+\.\d+\.LQ\.\d+)/g,
      ];
      
      for (const pattern of articlePatterns) {
        const matches = answerText.matchAll(pattern);
        for (const match of matches) 
        {
          // Extract just the main article number (e.g., "123" from "16.1.LQ.123" or "Điều 123")
          const fullMatch = match[1];
          mentionedArticles.add(fullMatch);
          
          // Also extract the last number part for simple matching
          const lastNum = fullMatch.match(/(\d+)$/);
          if (lastNum) 
          {
            mentionedArticles.add(lastNum[1]);
          }
        }
      }
      
      console.log("[LegalService] Articles mentioned in answer:", Array.from(mentionedArticles));

      const allSources = items.map((item: any) => {
        // Fallback for missing title
        let docTitle = item.document_title;
        // Check if title is useless (like just an ID or empty)
        if (!docTitle || docTitle.trim() === '' || /^\d+$/.test(docTitle)) 
        {
           docTitle = item.code ? `Văn bản ${item.code}` : "Văn bản pháp luật";
        }
        
        // Ensure unit_id exists
        const unitId = item.unit_id || item.id;
        
        // Extract article number from snippet for matching
        let articleNum = '';
        let simpleArticleNum = '';
        const snippetMatch = item.snippet?.match(/Điều\s+(\d+(?:\.\d+)?(?:\.LQ\.?\d*)?)/i);
        if (snippetMatch) 
        {
          articleNum = snippetMatch[1];
          // Extract simple number (e.g., "123" from "16.1.LQ.123")
          const simpleMatch = articleNum.match(/\.(\d+)$/) || articleNum.match(/^(\d+)$/);
          if (simpleMatch) 
          {
            simpleArticleNum = simpleMatch[1];
          }
        }
        
        return {
          document: docTitle,
          unit: `${item.level ? item.level + ' ' : ''}${item.code || ''}`.trim(),
          url: unitId ? `/unit/${unitId}` : '#',
          articleNum,
          simpleArticleNum,
          snippet: item.snippet || '',
          distance: item.distance || 1,
        };
      });

      // Filter sources: only show those actually mentioned in the answer
      // OR top 3 most relevant if none are explicitly mentioned
      let filteredSources = allSources.filter((s: any) => 
      {
        if (mentionedArticles.size === 0) return false;
        
        for (const mentioned of mentionedArticles) 
        {
          // Check various matching strategies
          // 1. Exact match on articleNum
          if (s.articleNum && s.articleNum === mentioned) return true;
          // 2. Simple number match (e.g., "123" matches "16.1.LQ.123")
          if (s.simpleArticleNum && s.simpleArticleNum === mentioned) return true;
          // 3. articleNum ends with mentioned number
          if (s.articleNum && s.articleNum.endsWith(`.${mentioned}`)) return true;
          // 4. Snippet contains the article reference
          if (s.snippet && s.snippet.includes(`Điều ${mentioned}`)) return true;
          if (s.snippet && s.snippet.includes(`.${mentioned}.`)) return true;
        }
        return false;
      });

      // If no sources match mentions, take top 3 by relevance
      if (filteredSources.length === 0) 
      {
        filteredSources = allSources.slice(0, 3);
      }

      // Clean up internal fields before returning
      const sources = filteredSources.map(({ document, unit, url }: any) => ({
        document,
        unit,
        url,
      }));

      console.log("[LegalService] Filtered sources:", sources);

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
