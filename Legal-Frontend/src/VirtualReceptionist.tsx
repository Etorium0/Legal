import React, { useEffect, useRef, useState } from 'react';
import AssistantAvatar from './components/AssistantAvatar';
import QueryBox from './components/QueryBox';
import ResponseCard from './components/ResponseCard';
import GesturePlayer from './components/GesturePlayer';
import { queryEndpoint, ttsEndpoint, sttEndpoint, gesturesEndpoint } from './api';

type HistoryItem = { question: string; answer: string; references?: Array<{ title: string; url: string }> };

export const VirtualReceptionist: React.FC = () => {
  const [state, setState] = useState<'idle' | 'listening' | 'processing' | 'speaking'>('idle');
  const [response, setResponse] = useState<{ answer: string; references?: any[] } | null>(null);
  const [lastSttText, setLastSttText] = useState<string | null>(null);
  const [supportsRecognition, setSupportsRecognition] = useState<boolean>(false);
  const [micPermission, setMicPermission] = useState<string | null>(null);
  const [lastNetworkError, setLastNetworkError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [humanLike, setHumanLike] = useState<boolean>(true);
  const [gestureVideoUrl, setGestureVideoUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio();
    // detect capabilities
    const Win: any = window as any;
    setSupportsRecognition(Boolean(Win.SpeechRecognition || Win.webkitSpeechRecognition));
    // check microphone permission status if supported
    if ((navigator as any).permissions && (navigator as any).permissions.query) {
      try {
        (navigator as any).permissions.query({ name: 'microphone' }).then((p: any) => setMicPermission(p.state)).catch(() => {});
      } catch (e) {
        // ignore
      }
    }
  }, []);

  async function handleSubmit(text: string) {
    if (!text) return;
    setState('processing');
    try {
      const res = await queryEndpoint(text);
      setResponse(res);
      setHistory((h) => [ { question: text, answer: res.answer, references: res.references || [] }, ...h ].slice(0,5));
      // optionally play TTS
      setState('speaking');
      try {
        const { url: ttsUrl, blob: ttsBlob } = await ttsEndpoint(res.answer);
        if (audioRef.current) {
          audioRef.current.src = ttsUrl;
          await audioRef.current.play();
        }
        // Trigger gesture generation if enabled
        if (humanLike) {
          setGestureVideoUrl(null);
          gesturesEndpoint(ttsBlob)
            .then(({ url }) => setGestureVideoUrl(url))
            .catch((ge) => {
              console.warn('Gestures generation failed', ge);
              setLastNetworkError((ge as any)?.message || String(ge));
            });
        }
      } catch (e) {
        // ignore tts failure but log
        console.warn('TTS failed', e);
      }
      setState('idle');
    } catch (e) {
      const msg = (e as any)?.message || String(e);
      setLastNetworkError(msg);
      setState('idle');
      setResponse({ answer: 'Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại sau.' });
    }
  }

  async function handleStartVoice() {
    // Try Web Speech API first (SpeechRecognition / webkitSpeechRecognition)
    const Win: any = window as any;
    const SpeechRecognition = Win.SpeechRecognition || Win.webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.lang = 'vi-VN';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => setState('listening');
        recognition.onerror = (ev: any) => {
          console.error('SpeechRecognition error', ev);
          setState('idle');
        };
        recognition.onresult = (ev: any) => {
          const text = ev.results[0][0].transcript;
          console.log('SpeechRecognition result:', text);
          setLastSttText(text);
          setState('processing');
          handleSubmit(text).catch(() => {});
        };
        recognition.onend = () => {
          // If user didn't speak, go back to idle
          if (state === 'listening') setState('idle');
        };

        recognition.start();
        return;
      } catch (e) {
        console.warn('SpeechRecognition failed', e);
        // fall through to MediaRecorder fallback
      }
    }

    // Fallback: use getUserMedia + MediaRecorder to capture audio and send to /api/stt
    try {
      setState('listening');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.start();

      // Stop after a short timeout or let user stop in a more complete UI
      setTimeout(async () => {
        mediaRecorder.stop();
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setState('processing');
        try {
          const text = await sttEndpoint(blob);
          console.log('STT endpoint returned:', text);
          setLastSttText(text);
          await handleSubmit(text);
        } catch (err: any) {
          console.error('STT upload failed', err);
          setLastNetworkError(err?.message || String(err));
          setResponse({ answer: 'Không thể chuyển giọng nói thành văn bản. Vui lòng thử lại.' });
          setState('idle');
        }
        stream.getTracks().forEach((t) => t.stop());
      }, 4000);
    } catch (err) {
      console.error('getUserMedia failed', err);
      setLastNetworkError((err as any)?.message || String(err));
      setResponse({ answer: 'Trình duyệt không cho phép truy cập micro hoặc thiết bị không có micro.' });
      setState('idle');
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col items-center gap-6">
          <AssistantAvatar state={state} />
          <div className="w-full max-w-3xl -mb-3 flex items-center justify-between">
            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" className="w-4 h-4" checked={humanLike} onChange={(e) => setHumanLike(e.target.checked)} />
              Hiển thị cử chỉ giống con người (PantoMatrix)
            </label>
          </div>
          <QueryBox onSubmit={handleSubmit} onStartVoice={handleStartVoice} disabled={state !== 'idle'} />
          {response && <ResponseCard answer={response.answer} references={response.references} />}
          {humanLike && gestureVideoUrl && (
            <GesturePlayer videoUrl={gestureVideoUrl} onClose={() => setGestureVideoUrl(null)} />
          )}

          <div className="w-full max-w-3xl mt-6">
            <div className="text-sm font-semibold text-gray-600">Lịch sử gần nhất</div>
            <div className="mt-2 grid grid-cols-1 gap-3">
              {history.map((h, i) => (
                <div key={i} className="bg-white p-3 rounded-lg shadow-sm flex justify-between items-start">
                  <div>
                    <div className="text-xs text-gray-500">Q</div>
                    <div className="text-sm text-gray-800">{h.question}</div>
                    <div className="mt-2 text-xs text-gray-600">A: {h.answer.slice(0,120)}{h.answer.length>120?'...':''}</div>
                  </div>
                  <div className="text-xs text-gray-400">{i+1}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Debug panel - helpful while developing STT */}
          <div className="w-full max-w-3xl mt-6 bg-white p-3 rounded-lg shadow-sm text-sm text-gray-700">
            <div className="font-semibold text-gray-600 mb-2">Debug STT</div>
            <div>SpeechRecognition supported: <span className="font-medium">{supportsRecognition ? 'Yes' : 'No'}</span></div>
            <div>Microphone permission: <span className="font-medium">{micPermission ?? 'unknown'}</span></div>
            <div>Last recognized text: <span className="font-medium">{lastSttText ?? '-'}</span></div>
            <div>Last network/error: <span className="font-medium text-red-500">{lastNetworkError ?? '-'}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VirtualReceptionist;
