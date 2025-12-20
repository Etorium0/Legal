import { useRef } from "react";

export function useVoiceSTT({
  onText,
  lang = "vi-VN",
  onComplete,
}) 
{
  const recRef = useRef<any>(null);

  const start = () => 
{
    const Win: any = window;
    const SR = Win.SpeechRecognition || Win.webkitSpeechRecognition;
    if (!SR) {return;}

    const rec = new SR();
    recRef.current = rec;

    rec.lang = lang;
    rec.continuous = false;
    rec.interimResults = true;

    rec.onresult = (ev: any) => 
{
      const transcript = Array.from(ev.results)
        .map((r: any) => r[0].transcript)
        .join(" ");
      onText?.(transcript);
    };

    rec.onend = () => 
{
      onComplete?.();
    };

    try 
{
      rec.start();
    }
 catch {}
  };

  const stop = () => 
{
    try 
{
      recRef.current?.stop();
    }
 catch {}
  };

  return { start, stop };
}
