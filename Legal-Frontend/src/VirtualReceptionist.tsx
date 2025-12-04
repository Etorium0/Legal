import React, { useEffect, useRef, useState } from 'react';
import { addHistory } from './components/HistoryStore';
import AssistantAvatar from './components/AssistantAvatar';
import QueryBox from './components/QueryBox';
import ResponseCard from './components/ResponseCard';
import GesturePlayer from './components/GesturePlayer';
import { queryEndpoint, ttsEndpoint, sttEndpoint, gesturesEndpoint } from './api';

type HistoryItem = { question: string; answer: string; references?: Array<{ title: string; url: string }> };

export const VirtualReceptionist: React.FC = () => 
{
  const [state, setState] = useState<'idle' | 'listening' | 'processing' | 'speaking'>('idle');
  const [response, setResponse] = useState<{ answer: string; references?: any[] } | null>(null);
  const [lastSttText, setLastSttText] = useState<string | null>(null);
  const [supportsRecognition, setSupportsRecognition] = useState<boolean>(false);
  const [micPermission, setMicPermission] = useState<string | null>(null);
  const [lastNetworkError, setLastNetworkError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [humanLike, setHumanLike] = useState<boolean>(true);
  const [gestureVideoUrl, setGestureVideoUrl] = useState<string | null>(null);
  const [relatedOpen, setRelatedOpen] = useState<boolean>(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => 
{
    audioRef.current = new Audio();
    // detect capabilities
    const Win: any = window as any;
    setSupportsRecognition(Boolean(Win.SpeechRecognition || Win.webkitSpeechRecognition));
    // check microphone permission status if supported
    if ((navigator as any).permissions && (navigator as any).permissions.query) 
{
      try 
{
        (navigator as any).permissions.query({ name: 'microphone' }).then((p: any) => setMicPermission(p.state)).catch(() => {});
      }
 catch (e) 
{
        // ignore
      }
    }
  }, []);

  async function handleSubmit(text: string) 
{
    if (!text) {return;}
    setState('processing');
    try 
{
      const res = await queryEndpoint(text);
      setResponse(res);
      setHistory((h) => [ { question: text, answer: res.answer, references: res.references || [] }, ...h ].slice(0,5));
      // persist to shared history store
      addHistory({ question: text, answer: res.answer, timestamp: Date.now() });
      // optionally play TTS
      setState('speaking');
      try 
{
        const { url: ttsUrl, blob: ttsBlob } = await ttsEndpoint(res.answer);
        if (audioRef.current) 
{
          audioRef.current.src = ttsUrl;
          await audioRef.current.play();
        }
        // Trigger gesture generation if enabled
        if (humanLike) 
{
          setGestureVideoUrl(null);
          gesturesEndpoint(ttsBlob)
            .then(({ url }) => setGestureVideoUrl(url))
            .catch((ge) => 
{
              console.warn('Gestures generation failed', ge);
              setLastNetworkError((ge as any)?.message || String(ge));
            });
        }
      }
 catch (e) 
{
        // ignore tts failure but log
        console.warn('TTS failed', e);
      }
      setState('idle');
    }
 catch (e) 
{
      const msg = (e as any)?.message || String(e);
      setLastNetworkError(msg);
      setState('idle');
      setResponse({ answer: 'Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại sau.' });
    }
  }

  async function handleStartVoice() 
{
    // Try Web Speech API first (SpeechRecognition / webkitSpeechRecognition)
    const Win: any = window as any;
    const SpeechRecognition = Win.SpeechRecognition || Win.webkitSpeechRecognition;
    if (SpeechRecognition) 
{
      try 
{
        const recognition = new SpeechRecognition();
        recognition.lang = 'vi-VN';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => setState('listening');
        recognition.onerror = (ev: any) => 
{
          console.error('SpeechRecognition error', ev);
          setState('idle');
        };
        recognition.onresult = (ev: any) => 
{
          const text = ev.results[0][0].transcript;
          console.log('SpeechRecognition result:', text);
          setLastSttText(text);
          setState('processing');
          handleSubmit(text).catch(() => {});
        };
        recognition.onend = () => 
{
          // If user didn't speak, go back to idle
          if (state === 'listening') {setState('idle');}
        };

        recognition.start();
        return;
      }
 catch (e) 
{
        console.warn('SpeechRecognition failed', e);
        // fall through to MediaRecorder fallback
      }
    }

    // Fallback: use getUserMedia + MediaRecorder to capture audio and send to /api/stt
    try 
{
      setState('listening');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.start();

      // Stop after a short timeout or let user stop in a more complete UI
      setTimeout(async () => 
{
        mediaRecorder.stop();
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setState('processing');
        try 
{
          const text = await sttEndpoint(blob);
          console.log('STT endpoint returned:', text);
          setLastSttText(text);
          await handleSubmit(text);
        }
 catch (err: any) 
{
          console.error('STT upload failed', err);
          setLastNetworkError(err?.message || String(err));
          setResponse({ answer: 'Không thể chuyển giọng nói thành văn bản. Vui lòng thử lại.' });
          setState('idle');
        }
        stream.getTracks().forEach((t) => t.stop());
      }, 4000);
    }
 catch (err) 
{
      console.error('getUserMedia failed', err);
      setLastNetworkError((err as any)?.message || String(err));
      setResponse({ answer: 'Trình duyệt không cho phép truy cập micro hoặc thiết bị không có micro.' });
      setState('idle');
    }
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-black">
      <div className="mx-auto max-w-7xl px-4">
        <div className={`grid grid-cols-1 gap-4 ${relatedOpen ? 'xl:grid-cols-[1fr_22rem]' : 'xl:grid-cols-1'}`}>

          {/* Chat area with patterned background */}
          <main className="relative bg-neutral-950/80 backdrop-blur rounded-lg border border-white/10">
            <div className="bg-lines rounded-lg p-6">
              {/* Assistant status/avatar small */}
              <div className="flex items-center justify-center py-6">
                <AssistantAvatar state={state} />
              </div>

              {/* Messages */}
              <div className="space-y-4">
                  {/* Last response only; full history lives in Sidebar */}
                  {response && (
                    <div className="flex justify-start">
                      <div className="max-w-[85%]">
                        <ResponseCard answer={response.answer} references={response.references} />
                      </div>
                    </div>
                  )}
              </div>

              {/* Input + controls at bottom styled */}
              <div className="sticky bottom-4 mt-6 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="inline-flex items-center gap-2 text-xs text-white/80">
                    <input type="checkbox" className="w-4 h-4" checked={humanLike} onChange={(e) => setHumanLike(e.target.checked)} />
                    Hiển thị cử chỉ giống con người (PantoMatrix)
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setRelatedOpen((o) => !o)}
                      className="rounded-md px-2 py-1 text-xs border border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
                    >
                      {relatedOpen ? 'Ẩn panel phải' : 'Hiện panel phải'}
                    </button>
                    <div className="text-xs text-white/60">{state.toUpperCase()}</div>
                  </div>
                </div>
                <div className="input-bar-dark">
                  <QueryBox onSubmit={handleSubmit} onStartVoice={handleStartVoice} disabled={state !== 'idle'} />
                </div>
              </div>

              {/* Gesture preview */}
              {humanLike && gestureVideoUrl && (
                <div className="mt-4">
                  <GesturePlayer videoUrl={gestureVideoUrl} onClose={() => setGestureVideoUrl(null)} />
                </div>
              )}

              {/* Debug panel (dark) */}
              <div className="mt-6 rounded-lg bg-white/5 p-3 text-sm text-white/80 shadow-sm">
                <div className="font-semibold text-white mb-2">Debug STT</div>
                <div>SpeechRecognition supported: <span className="font-medium">{supportsRecognition ? 'Yes' : 'No'}</span></div>
                <div>Microphone permission: <span className="font-medium">{micPermission ?? 'unknown'}</span></div>
                <div>Last recognized text: <span className="font-medium">{lastSttText ?? '-'}</span></div>
                <div>Last network/error: <span className="font-medium text-red-400">{lastNetworkError ?? '-'}</span></div>
              </div>
            </div>
          </main>

          {/* Right panel - related documents */}
          <aside
            className={`${relatedOpen ? 'xl:block' : 'xl:hidden'} hidden rounded-lg p-4 bg-neutral-950/80 backdrop-blur border border-white/10`}
            aria-hidden={!relatedOpen}
          >
            <div className="flex items-center justify-between">
              <div className="font-semibold text-white">Văn bản liên quan</div>
              <button onClick={() => setRelatedOpen(false)} className="text-white/70">✖</button>
            </div>
            <div className="mt-3 text-sm text-white/80">
              {response?.references?.length ? (
                <ul className="space-y-2">
                  {response!.references!.map((r: any, idx: number) => (
                    <li key={idx} className="rounded-md border border-white/10 bg-white/5 p-2">
                      <div className="text-sm font-medium text-white/90">{r.title || 'Tài liệu'}</div>
                      {r.url && (
                        <a href={r.url} target="_blank" rel="noreferrer" className="text-xs text-blue-300 hover:text-blue-200">Mở liên kết</a>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <span>Chưa có dữ liệu hiển thị</span>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default VirtualReceptionist;
