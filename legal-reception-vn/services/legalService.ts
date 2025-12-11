import { GoogleGenAI, Type } from "@google/genai";
import { Message } from "../types";

// This service manages the connection to the Legal Backend.
// It tries to connect to the Go Backend (localhost:8080).
// If that fails, it falls back to a client-side Gemini simulation.

const BACKEND_URL = 'http://localhost:8080/api/v1/query';
const apiKey = process.env.API_KEY || ''; 
const ai = new GoogleGenAI({ apiKey });

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    answer: {
      type: Type.STRING,
      description: "The direct answer to the user's legal question.",
    },
    sources: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          document: { type: Type.STRING },
          unit: { type: Type.STRING },
          url: { type: Type.STRING },
        },
      },
    },
    triples: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          subject: { type: Type.STRING },
          relation: { type: Type.STRING },
          object: { type: Type.STRING },
          context: { type: Type.STRING },
        },
      },
    },
  },
  required: ["answer", "sources", "triples"],
};

export const queryLegalAssistant = async (query: string): Promise<Partial<Message>> => {
  // 1. Attempt Real Backend Query
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000); // Fast timeout for demo purposes

    const res = await fetch(BACKEND_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: query }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      console.log("Received response from Go Backend:", data);
      return {
        text: data.answer,
        sources: data.sources,
        triples: data.triples,
        role: 'assistant',
        timestamp: new Date(),
      };
    }
  } catch (error) {
    console.warn("Backend unavailable, falling back to Gemini Simulation.", error);
  }

  // 2. Fallback: Gemini Simulation
  try {
    const model = "gemini-2.5-flash"; 
    
    const prompt = `
      Bạn là một trợ lý pháp luật ảo của Việt Nam chuyên nghiệp, tận tâm.
      Câu hỏi của người dùng: "${query}"
      
      Hãy trả lời dựa trên các luật phổ biến của Việt Nam (Bộ luật Hình sự, Dân sự, Luật Giao thông, v.v.).
      Trả về câu trả lời dưới dạng JSON có cấu trúc.
      
      - "answer": Câu trả lời chi tiết, dễ hiểu.
      - "sources": Các văn bản pháp luật tham chiếu (Giả lập link đến thuvienphapluat.vn).
      - "triples": Trích xuất các bộ ba tri thức (Subject - Relation - Object) từ câu trả lời để vẽ biểu đồ.
    `;

    const result = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.3,
      },
    });

    const jsonText = result.text;
    if (!jsonText) throw new Error("No response from AI");

    const parsed = JSON.parse(jsonText);

    return {
      text: parsed.answer,
      sources: parsed.sources,
      triples: parsed.triples,
      role: 'assistant',
      timestamp: new Date(),
    };

  } catch (error) {
    console.error("Legal Query Error:", error);
    return {
      text: "Xin lỗi, hệ thống đang gặp sự cố kết nối với cơ sở dữ liệu pháp luật. Vui lòng thử lại sau.",
      role: 'assistant',
      timestamp: new Date(),
      sources: [],
      triples: []
    };
  }
};

export const getMockDocuments = () => [
  { id: '1', title: 'Nghị định 100/2019/NĐ-CP', type: 'decree', number: '100/2019/NĐ-CP', year: 2019, issued_by: 'Chính phủ', effective_date: '2020-01-01' },
  { id: '2', title: 'Bộ luật Hình sự 2015', type: 'code', number: '100/2015/QH13', year: 2015, issued_by: 'Quốc hội', effective_date: '2016-07-01' },
  { id: '3', title: 'Luật Đất đai 2013', type: 'law', number: '45/2013/QH13', year: 2013, issued_by: 'Quốc hội', effective_date: '2014-07-01' },
];
