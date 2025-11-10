import axios from 'axios';

// During development you may need to change this to your backend address
// e.g. const api = axios.create({ baseURL: 'http://localhost:8080/api' });
const api = axios.create({ baseURL: '/api' });

export async function sttEndpoint(audioBlob: Blob) {
  // mock: convert audio to text via backend
  const form = new FormData();
  form.append('file', audioBlob, 'record.wav');
  try {
    const res = await api.post('/stt', form, { headers: { 'Content-Type': 'multipart/form-data' } });
    return res.data.text as string;
  } catch (err: any) {
    const msg = err?.response ? `STT error ${err.response.status}: ${JSON.stringify(err.response.data)}` : err.message || String(err);
    throw new Error(msg);
  }
}

export async function queryEndpoint(text: string) {
  try {
    const res = await api.post('/query', { question: text });
    return res.data as { answer: string; references: Array<{ title: string; url: string }> };
  } catch (err: any) {
    const msg = err?.response ? `Query error ${err.response.status}: ${JSON.stringify(err.response.data)}` : err.message || String(err);
    throw new Error(msg);
  }
}

export async function ttsEndpoint(text: string): Promise<{ url: string; blob: Blob }> {
  // Request audio and return both object URL and the Blob to reuse for gesture generation
  try {
    const res = await api.post('/tts', { text }, { responseType: 'arraybuffer' });
    const contentType = res.headers?.['content-type'] || 'audio/mpeg';
    const blob = new Blob([res.data], { type: contentType });
    const url = URL.createObjectURL(blob);
    return { url, blob };
  } catch (err: any) {
    const msg = err?.response ? `TTS error ${err.response.status}: ${JSON.stringify(err.response.data)}` : err.message || String(err);
    throw new Error(msg);
  }
}

export async function gesturesEndpoint(audioBlob: Blob): Promise<{ url: string; type: string }>{
  // Post audio to backend that wraps PantoMatrix and returns a rendered video (mp4)
  const form = new FormData();
  form.append('file', audioBlob, 'speech.wav');
  try {
    const res = await api.post('/gestures', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      responseType: 'arraybuffer'
    });
    // Prefer video/mp4 if provided, fallback to generic
    const contentType = res.headers?.['content-type'] || 'video/mp4';
    // If backend returned JSON with URL, handle that first
    const ct = String(contentType).toLowerCase();
    if (ct.includes('application/json')) {
      const text = new TextDecoder().decode(res.data);
      try {
        const json = JSON.parse(text);
        if (json.videoUrl) return { url: json.videoUrl, type: 'video/mp4' };
      } catch {}
    }
    const blob = new Blob([res.data], { type: contentType });
    const url = URL.createObjectURL(blob);
    return { url, type: contentType };
  } catch (err: any) {
    const msg = err?.response ? `Gestures error ${err.response.status}: ${JSON.stringify(err.response.data)}` : err.message || String(err);
    throw new Error(msg);
  }
}

export default api;
