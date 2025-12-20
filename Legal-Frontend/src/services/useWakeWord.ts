import { useEffect, useRef } from "react";

export function useWakeWord({
  wakeWords = ["hey legal", "trợ lý ơi", "assistant", "hey assistant"],
  onWake,
  lang = "vi-VN",
}) 
{
  const recRef = useRef<any>(null);
  const enabledRef = useRef(true);
  const isTriggeringRef = useRef(false);
  const restartingRef = useRef(false);

  useEffect(() => 
{
    const Win: any = window;
    const SR = Win.SpeechRecognition || Win.webkitSpeechRecognition;
    if (!SR) {return;}

    const start = () => 
{
      if (restartingRef.current) {return;}

      const rec = new SR();
      recRef.current = rec;

      rec.lang = lang;
      rec.continuous = true;
      rec.interimResults = true;

      rec.onresult = (ev: any) => 
{
        if (!enabledRef.current) {return;}
        if (isTriggeringRef.current) {return;} // tránh gọi lặp

        const transcript = Array.from(ev.results)
          .map((r: any) => r[0].transcript)
          .join(" ")
          .toLowerCase();

        if (!transcript.trim()) {return;}

        const detected = wakeWords.some((w) => transcript.includes(w));
        if (!detected) {return;}

        isTriggeringRef.current = true;

        onWake?.(); // gọi callback (bắt đầu STT chính)

        // Allow wake again sau 1.5s
        setTimeout(() => 
{
          isTriggeringRef.current = false;
        }, 1500);
      };

      rec.onerror = () => 
{
        if (!enabledRef.current) {return;}
        restart();
      };

      rec.onend = () => 
{
        if (!enabledRef.current) {return;}
        restart();
      };

      try 
{
        rec.start();
      }
 catch {}
    };

    const restart = () => 
{
      restartingRef.current = true;
      setTimeout(() => 
{
        restartingRef.current = false;
        try 
{
          recRef.current?.start();
        }
 catch {}
      }, 600);
    };

    // start wake listener
    const delay = setTimeout(start, 800);

    return () => 
{
      enabledRef.current = false;
      try 
{
        recRef.current?.stop();
      }
 catch {}
      clearTimeout(delay);
    };
  }, []);

  return {
    stop: () => 
{
      enabledRef.current = false;
      try 
{
        recRef.current?.stop();
      }
 catch {}
    },
    start: () => 
{
      enabledRef.current = true;
      try 
{
        recRef.current?.start();
      }
 catch {}
    },
  };
}
