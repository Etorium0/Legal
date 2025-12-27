import { Message } from "../types";
import { authService } from "./authService";

// This service manages the connection to the Legal Backend.
// It tries to connect to the Go Backend (localhost:8080).
// Nếu backend không khả dụng, trả về thông báo thân thiện, không dùng Gemini fallback.

const runtimeBackend = (typeof window !== 'undefined' && (window as any).__BACKEND_URL__) as string | undefined;
const backendUrl = runtimeBackend || import.meta.env.VITE_BACKEND_URL;
const BACKEND_URL = backendUrl ? `${backendUrl}/api/v1/query` : `/api/v1/query`;

 

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

    const res = await fetch(BACKEND_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({ text: query }),
    });

    if (res.ok) 
{
      const data = await res.json();
      console.log("Received response from Go Backend:", data);
      
      // Transform backend response to match our Message type
      const answers = data.answers || [];
      if (answers.length > 0) 
      {
        const cleanText = (s: string) =>
        {
          return (s || '')
            .replace(/\uFFFD/g, '')
            .replace(/\s+/g, ' ')
            .normalize('NFC')
            .trim();
        };
        const formatDocRef = (ref: string) =>
        {
          const m = (ref || '').match(/^vbpl\s*(\d+)/i);
          if (m)
          {
            return `Văn bản pháp luật #${m[1]}`;
          }
          return ref || 'Nguồn tham khảo';
        };
        const firstAnswer = answers[0];
        const unitId = firstAnswer.unit_id || firstAnswer.UnitID || firstAnswer.unitId;
        const docRef = formatDocRef(firstAnswer.doc_ref || firstAnswer.DocRef || '');
        let sourceLabel = docRef;
        let unitCode = unitId;
        try
        {
          const unitRes = await fetch(`${BACKEND_URL}/units/${unitId}`, { method: 'GET' });
          if (unitRes.ok)
          {
            const unitData = await unitRes.json();
            const level = unitData.level || unitData.UnitLevel || '';
            const code = unitData.code || unitData.UnitCode || '';
            sourceLabel = level ? `${level.toUpperCase()} ${code || ''}`.trim() : sourceLabel;
            unitCode = code || unitId;
          }
        }
        catch (_e)
        {
          // ignore enrichment errors
        }

        return {
          text: cleanText(firstAnswer.snippet || firstAnswer.answer || firstAnswer.text || 'Không tìm thấy câu trả lời.'),
          sources: unitId
            ? [{
                document: sourceLabel,
                unit: unitCode,
                url: `/unit/${unitId}`,
              }]
            : [],
          triples: firstAnswer.triples || [],
          role: 'assistant',
          timestamp: new Date(),
        };
      }
      else if (data.debug?.candidates && data.debug.candidates.length > 0) 
      {
        const concepts = data.debug.candidates
          .filter((c: any) => c.type === 'subject' || c.type === 'object')
          .map((c: any) => c.name)
          .filter((name: string, index: number, self: string[]) => self.indexOf(name) === index);

        return {
          text: `Tôi tìm thấy thông tin liên quan đến: ${concepts.join(', ')}.\nHiện cơ sở dữ liệu chưa đủ để trả lời chi tiết. Vui lòng thử câu hỏi khác hoặc bổ sung dữ liệu.`,
          sources: [],
          triples: [],
          role: 'assistant',
          timestamp: new Date(),
        };
      }
      else 
      {
        console.log("Backend returned empty answers, database may be empty");
      }
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
