// Client-side command handler focused on in-app navigation and voice-driven document search.

function playTone(frequency: number, durationMs: number, volume = 0.2) {
  try {
    const AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = frequency;
    gain.gain.value = volume;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + durationMs / 1000);
    osc.onended = () => ctx.close();
  } catch (e) {
    // ignore audio failures silently
  }
}

export function playStartSound() {
  playTone(660, 180, 0.25);
  setTimeout(() => playTone(880, 140, 0.22), 120);
}

export function playClickSound() {
  playTone(520, 90, 0.25);
}

function speak(text: string) {
  try {
    const synth = window.speechSynthesis;
    if (!synth) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'vi-VN';
    const voices = synth.getVoices();
    const vn = voices.find((v) => v.lang.includes('vi') || v.name.toLowerCase().includes('vietnam'));
    if (vn) utterance.voice = vn;
    synth.speak(utterance);
  } catch (e) {
    // ignore TTS failures
  }
}

function navigateTo(path: string) {
  try {
    window.location.assign(path);
  } catch (e) {
    // ignore
  }
}

const ROUTE_MAP: Record<string, string> = {
  'trò chuyện': '/assistant',
  'assistant': '/assistant',
  'chat': '/assistant',
  'trang chủ': '/home',
  'home': '/home',
  'dashboard': '/dashboard',
  'bảng điều khiển': '/dashboard',
  'tài liệu': '/documents',
  'documents': '/documents',
  'biểu đồ': '/graph',
  'biểu đồ tri thức': '/graph',
  'graph': '/graph',
  'cài đặt': '/settings',
  'settings': '/settings',
};

function handleNavigation(command: string) {
  const lower = command.toLowerCase();
  const navMatch = /(đến|mở|chuyển|go to|open)\s+(tab|trang)?\s*(trò chuyện|assistant|chat|trang chủ|home|dashboard|bảng điều khiển|tài liệu|documents|biểu đồ tri thức|biểu đồ|graph|cài đặt|settings)/i.exec(lower);
  if (!navMatch) return null;
  const key = navMatch[3].trim();
  const path = ROUTE_MAP[key] || ROUTE_MAP[key.replace(/\s+/g, ' ')];
  if (path) {
    navigateTo(path);
    return `Đang chuyển tới ${key}.`;
  }
  return null;
}

function handleDocSearch(command: string) {
  // e.g., "tìm nghị định 100", "tìm tài liệu xử phạt", "search document abc"
  const match = /(tìm|search)\s+(văn bản|tài liệu|nghị định|luật|document)?\s*(.+)/i.exec(command);
  if (!match) return null;
  const term = (match[3] || '').trim();
  if (!term) return null;
  try {
    localStorage.setItem('voiceDocQuery', term);
  } catch (e) {
    // ignore storage errors
  }
  navigateTo('/documents');
  return `Đang mở Tài liệu và tìm “${term}”.`;
}

export function processVoiceCommand(text: string): { handled: boolean; message?: string } {
  const lower = text.toLowerCase();

  const nav = handleNavigation(lower);
  if (nav) {
    speak(nav);
    return { handled: true, message: nav };
  }

  const doc = handleDocSearch(lower);
  if (doc) {
    speak(doc);
    return { handled: true, message: doc };
  }

  return { handled: false };
}
