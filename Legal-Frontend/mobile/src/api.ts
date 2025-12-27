import axios from 'axios';

const api = axios.create({ baseURL: 'http://10.45.163.236:8080/api' });

export async function queryEndpoint(text: string) {
  const res = await api.post('/query', { question: text });
  return res.data as { answer: string; references: Array<{ title: string; url: string }> };
}

export async function ttsEndpoint(text: string) {
  const res = await api.post('/tts', { text }, { responseType: 'arraybuffer' });
  const blob = new Blob([res.data], { type: 'audio/mpeg' });
  return URL.createObjectURL(blob);
}

export default api;
