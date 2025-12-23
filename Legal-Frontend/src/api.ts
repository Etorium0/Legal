import axios from 'axios';

const win = window as any;
const runtimeBackend = typeof win !== 'undefined' ? win.__BACKEND_URL__ : undefined;
const backendUrl = runtimeBackend || import.meta.env.VITE_BACKEND_URL;
const apiBase = backendUrl ? `${backendUrl}/api/v1` : '/api/v1';
const api = axios.create({ baseURL: apiBase });

export async function sttEndpoint(audioBlob: Blob) 
{
  // mock: convert audio to text via backend
  const form = new FormData();
  form.append('file', audioBlob, 'record.wav');
  try 
{
    const res = await api.post('/stt', form, { headers: { 'Content-Type': 'multipart/form-data' } });
    return res.data.text as string;
  }
 catch (err: any) 
{
    const msg = err?.response ? `STT error ${err.response.status}: ${JSON.stringify(err.response.data)}` : err.message || String(err);
    throw new Error(msg);
  }
}

export async function queryEndpoint(text: string) 
{
  try 
  {
    // Backend expects "text" field, not "question"
    const res = await api.post('/query', { text });

    // Backend returns { answers: [...] }
    const answers = res.data?.answers || [];

    if (answers.length > 0) 
    {
      const first = answers[0];
      const unitId = first.unit_id || first.UnitID || first.unitId;
      const docRef = first.doc_ref || first.DocRef || 'Tài liệu tham khảo';

      return {
        answer: first.snippet || first.answer || 'Không tìm thấy câu trả lời.',
        references: unitId
          ? [
              {
                title: docRef,
                url: `${apiBase}/query/units/${unitId}`,
              },
            ]
          : [],
      };
    }

    return {
      answer: 'Xin lỗi, tôi không tìm thấy thông tin liên quan trong cơ sở dữ liệu.',
      references: [],
    };
  }
  catch (err: any) 
  {
    const msg = err?.response ? `Query error ${err.response.status}: ${JSON.stringify(err.response.data)}` : err.message || String(err);
    throw new Error(msg);
  }
}

export async function ttsEndpoint(text: string): Promise<{ url: string; blob: Blob }> 
{
  // Mock TTS - tạo silent audio blob
  // Trong production, gọi backend TTS service (Google TTS, Azure TTS, etc)
  try 
{
    // Create a short silent audio for demo
    const duration = Math.max(2, text.length * 0.05) // estimate duration
    const sampleRate = 44100
    const numChannels = 1
    const numSamples = Math.floor(duration * sampleRate)
    
    // Create silent WAV file
    const buffer = new ArrayBuffer(44 + numSamples * 2)
    const view = new DataView(buffer)
    
    // WAV header
    const writeString = (offset: number, string: string) => 
{
      for (let i = 0; i < string.length; i++) 
{
        view.setUint8(offset + i, string.charCodeAt(i))
      }
    }
    
    writeString(0, 'RIFF')
    view.setUint32(4, 36 + numSamples * 2, true)
    writeString(8, 'WAVE')
    writeString(12, 'fmt ')
    view.setUint32(16, 16, true)
    view.setUint16(20, 1, true)
    view.setUint16(22, numChannels, true)
    view.setUint32(24, sampleRate, true)
    view.setUint32(28, sampleRate * 2, true)
    view.setUint16(32, 2, true)
    view.setUint16(34, 16, true)
    writeString(36, 'data')
    view.setUint32(40, numSamples * 2, true)
    
    const blob = new Blob([buffer], { type: 'audio/wav' })
    const url = URL.createObjectURL(blob)
    return { url, blob }
  }
 catch (err: any) 
{
    const msg = err?.response ? `TTS error ${err.response.status}: ${JSON.stringify(err.response.data)}` : err.message || String(err)
    throw new Error(msg)
  }
}

export async function gesturesEndpoint(audioBlob: Blob): Promise<{ url: string; type: string }>
{
  // Mock gesture video generation using PantoMatrix approach
  // In production, this would call backend that runs PantoMatrix/EMAGE model
  try 
{
    // For demo: create a placeholder video showing avatar placeholder
    // Real implementation would:
    // 1. Send audio to backend
    // 2. Backend runs PantoMatrix model to generate gesture sequences
    // 3. Backend returns rendered video of avatar with gestures
    
    // Create canvas-based animation as placeholder
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const ctx = canvas.getContext('2d')
    
    if (!ctx) 
{
      throw new Error('Canvas context not available')
    }
    
    // Draw simple avatar placeholder
    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    
    // Draw avatar head
    ctx.fillStyle = '#4a5568'
    ctx.beginPath()
    ctx.arc(256, 200, 80, 0, Math.PI * 2)
    ctx.fill()
    
    // Draw eyes
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.arc(230, 190, 10, 0, Math.PI * 2)
    ctx.arc(282, 190, 10, 0, Math.PI * 2)
    ctx.fill()
    
    // Draw mouth
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(256, 210, 30, 0, Math.PI, false)
    ctx.stroke()
    
    // Add text
    ctx.fillStyle = '#a0aec0'
    ctx.font = '14px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('PantoMatrix Avatar', 256, 350)
    ctx.fillText('(Placeholder - Cần backend)', 256, 370)
    
    // Convert canvas to blob
    return new Promise((resolve, reject) => 
{
      canvas.toBlob((blob) => 
{
        if (blob) 
{
          const url = URL.createObjectURL(blob)
          resolve({ url, type: 'image/png' })
        }
 else 
{
          reject(new Error('Failed to create blob'))
        }
      }, 'image/png')
    })
  }
 catch (err: any) 
{
    const msg = err?.response ? `Gestures error ${err.response.status}: ${JSON.stringify(err.response.data)}` : err.message || String(err)
    throw new Error(msg)
  }
}

export default api;
