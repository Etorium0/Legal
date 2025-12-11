import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { Message } from "../types";

// This service manages the connection to the Legal Backend.
// It tries to connect to the Go Backend (localhost:8080).
// If that fails, it falls back to a client-side Gemini simulation.

const BACKEND_URL = 'http://localhost:8080/api/v1/query';
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || ''; 

const responseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    answer: {
      type: SchemaType.STRING,
      description: "The direct answer to the user's legal question.",
    },
    sources: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          document: { type: SchemaType.STRING },
          unit: { type: SchemaType.STRING },
          url: { type: SchemaType.STRING },
        },
      },
    },
    triples: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          subject: { type: SchemaType.STRING },
          relation: { type: SchemaType.STRING },
          object: { type: SchemaType.STRING },
          context: { type: SchemaType.STRING },
        },
      },
    },
  },
  required: ["answer", "sources", "triples"],
};

export const queryLegalAssistant = async (query: string): Promise<Partial<Message>> => 
{
  // 1. Attempt Real Backend Query
  try 
{
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000); // Fast timeout for demo purposes

    const res = await fetch(BACKEND_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: query }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) 
{
      const data = await res.json();
      console.log("Received response from Go Backend:", data);
      
      // Transform backend response to match our Message type
      const answers = data.answers || [];
      if (answers.length > 0) 
{
        const firstAnswer = answers[0];
        return {
          text: firstAnswer.answer || firstAnswer.text || 'Không tìm thấy câu trả lời.',
          sources: firstAnswer.sources?.map((s: any) => ({
            document: s.document || s.title || 'Tài liệu tham khảo',
            unit: s.unit || s.unit_title || '',
            url: s.url || '#'
          })) || [],
          triples: firstAnswer.triples || [],
          role: 'assistant',
          timestamp: new Date(),
        };
      }
 else if (data.debug?.candidates && data.debug.candidates.length > 0) 
{
        // Backend found concepts but no complete answer
        console.log("Backend found concepts but no triples:", data.debug.candidates);
        const concepts = data.debug.candidates
          .filter((c: any) => c.type === 'subject' || c.type === 'object')
          .map((c: any) => c.name)
          .filter((name: string, index: number, self: string[]) => self.indexOf(name) === index); // unique
        
        return {
          text: `Tôi tìm thấy thông tin liên quan đến: **${concepts.join(', ')}**.\n\nTuy nhiên, hiện tại cơ sở dữ liệu chưa có đủ thông tin chi tiết để trả lời câu hỏi của bạn. Vui lòng thử:\n\n1. Hỏi câu hỏi khác về giao thông đường bộ\n2. Liên hệ quản trị viên để bổ sung dữ liệu pháp luật\n3. Tham khảo trực tiếp tại thuvienphapluat.vn`,
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
    console.warn("Backend unavailable, falling back to Gemini Simulation.", error);
  }

  // 2. Fallback: Simple response when Gemini unavailable
  if (!apiKey) 
{
    console.warn("No Gemini API key found. Set VITE_GEMINI_API_KEY in .env.local");
    return {
      text: "Xin lỗi, hệ thống backend chưa có đủ dữ liệu để trả lời câu hỏi của bạn và Gemini API hiện không khả dụng.\n\nVui lòng:\n1. Kiểm tra lại câu hỏi\n2. Thử hỏi về Nghị định 100/2019 (xử phạt giao thông)\n3. Liên hệ quản trị viên để cập nhật dữ liệu",
      sources: [],
      triples: [],
      role: 'assistant',
      timestamp: new Date(),
    };
  }

  // 3. Try Gemini but handle quota errors gracefully
  try 
{
    const ai = new GoogleGenerativeAI(apiKey);
    const model = ai.getGenerativeModel({ model: "gemini-2.0-flash-exp" }); 
    
    const prompt = `
      Bạn là một trợ lý pháp luật ảo của Việt Nam chuyên nghiệp, tận tâm.
      Câu hỏi của người dùng: "${query}"
      
      Hãy trả lời dựa trên các luật phổ biến của Việt Nam (Bộ luật Hình sự, Dân sự, Luật Giao thông, Nghị định 100/2019 về xử phạt giao thông, v.v.).
      Trả về câu trả lời dưới dạng JSON có cấu trúc.
      
      - "answer": Câu trả lời chi tiết, dễ hiểu, chính xác về pháp luật Việt Nam.
      - "sources": Các văn bản pháp luật tham chiếu (Giả lập link đến thuvienphapluat.vn).
      - "triples": Trích xuất các bộ ba tri thức (Subject - Relation - Object) từ câu trả lời để vẽ biểu đồ.
      
      Hãy trả lời bằng tiếng Việt và cung cấp thông tin pháp lý chính xác.
    `;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.3,
      },
    });

    const jsonText = result.response.text() || '{}';
    const parsed = JSON.parse(jsonText);

    return {
      text: parsed.answer || "Xin lỗi, tôi không thể trả lời câu hỏi này.",
      sources: parsed.sources || [],
      triples: parsed.triples || [],
      role: 'assistant',
      timestamp: new Date(),
    };
  }
 catch (error) 
{
    console.error("Gemini Fallback Error:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Check if it's a quota error
    if (errorMessage.includes('quota') || errorMessage.includes('429')) 
{
      return {
        text: `Xin lỗi, hệ thống AI đang tạm thời quá tải (Gemini API hết quota miễn phí).\n\nHệ thống backend đang hoạt động nhưng cơ sở dữ liệu chưa có đủ thông tin để trả lời câu hỏi của bạn.\n\nBạn có thể:\n1. Thử lại sau ${errorMessage.includes('retry') ? '~1 phút' : 'vài phút'}\n2. Hỏi câu hỏi về Nghị định 100/2019 (xử phạt giao thông)\n3. Liên hệ quản trị viên để nâng cấp API hoặc bổ sung dữ liệu`,
        sources: [],
        triples: [],
        role: 'assistant',
        timestamp: new Date(),
      };
    }
    
    return {
      text: `Xin lỗi, hệ thống đang gặp sự cố kỹ thuật.\n\nChi tiết: ${errorMessage}\n\nVui lòng kiểm tra:\n1. Backend API (http://localhost:8080) có đang chạy không?\n2. Cơ sở dữ liệu có dữ liệu không?\n3. Thử lại sau vài phút`,
      sources: [],
      triples: [],
      role: 'assistant',
      timestamp: new Date(),
    };
  } };
  }
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
