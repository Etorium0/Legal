// Browser Speech API types are not always fully typed in TS standard lib
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: Event) => void;
  onend: (event: Event) => void;
}

// Extend Window interface for SpeechRecognition
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

export class AudioService 
{
  private recognition: SpeechRecognition | null = null;
  private synthesis: SpeechSynthesis = window.speechSynthesis;
  public isListening: boolean = false;
  private listeningTimeout: NodeJS.Timeout | null = null;
  private phraseTimeout: NodeJS.Timeout | null = null;
  private voicesLoaded: boolean = false;

  constructor() 
{
    // Initialize STT
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) 
{
      this.recognition = new SpeechRecognition();
      if (this.recognition) 
{
        this.recognition.continuous = false; // BLOCKING mode như Sophia
        this.recognition.interimResults = true;
        this.recognition.lang = 'vi-VN';
      }
    }

    // Preload voices to ensure Vietnamese voice availability
    if (this.synthesis && this.synthesis.getVoices().length === 0) 
{
      this.synthesis.onvoiceschanged = () => 
{
        this.voicesLoaded = true;
      };
    }
  }

  private async ensureVoicesLoaded(): Promise<void>
  {
    const haveVoices = this.synthesis.getVoices().length > 0;
    if (haveVoices)
    {
      this.voicesLoaded = true;
      return;
    }
    await new Promise<void>((resolve) =>
    {
      const timeout = setTimeout(() =>
      {
        resolve();
      }, 1500);
      this.synthesis.onvoiceschanged = () =>
      {
        clearTimeout(timeout);
        this.voicesLoaded = true;
        resolve();
      };
    });
  }

  /**
   * Start listening with automatic timeout (Sophia-style)
   * - Auto-stops after 10s of silence (global timeout)
   * - Auto-stops after 6s from first speech (phrase timeout)
   */
  public startListening(
    onResult: (text: string, isFinal: boolean) => void,
    onError: (error: string) => void,
    onEnd: () => void
  ): void 
{
    if (!this.recognition) 
{
      onError("Trình duyệt không hỗ trợ nhận diện giọng nói.");
      return;
    }

    // If already listening, don't restart
    if (this.isListening) {return;}

    // Clear any existing timeouts
    this.clearTimeouts();

    let firstSpeechDetected = false;

    this.recognition.onresult = (event: SpeechRecognitionEvent) => 
{
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) 
{
        if (event.results[i].isFinal) 
{
          finalTranscript += event.results[i][0].transcript;
        }
 else 
{
          interimTranscript += event.results[i][0].transcript;
        }
      }

      // Start phrase timeout on first speech (like Sophia's phrase_time_limit)
      if (!firstSpeechDetected && (finalTranscript || interimTranscript)) 
{
        firstSpeechDetected = true;
        this.phraseTimeout = setTimeout(() => 
{
          console.log('[AudioService] Phrase timeout - auto stopping');
          this.stopListening();
        }, 6000); // 6 seconds after first speech
      }

      if (finalTranscript) 
{
        onResult(finalTranscript, true);
        // Auto-stop after getting final result
        this.stopListening();
      }
 else if (interimTranscript) 
{
        onResult(interimTranscript, false);
      }
    };

    this.recognition.onerror = (event: any) => 
{
      this.clearTimeouts();
      // Ignore 'no-speech' errors
      if (event.error !== 'no-speech') 
{
        console.error("Speech recognition error", event.error);
        onError(event.error);
      }
    };

    this.recognition.onend = () => 
{
      this.clearTimeouts();
      this.isListening = false;
      onEnd();
    };

    try 
{
      this.recognition.start();
      this.isListening = true;
      
      // Global timeout - 10s như Sophia
      this.listeningTimeout = setTimeout(() => 
{
        console.log('[AudioService] Global timeout - auto stopping');
        this.stopListening();
      }, 10000); // 10 seconds total
    }
 catch (e) 
{
      console.error(e);
      this.clearTimeouts();
      this.isListening = false;
    }
  }

  private clearTimeouts(): void 
{
    if (this.listeningTimeout) 
{
      clearTimeout(this.listeningTimeout);
      this.listeningTimeout = null;
    }
    if (this.phraseTimeout) 
{
      clearTimeout(this.phraseTimeout);
      this.phraseTimeout = null;
    }
  }

  public stopListening(): void 
{
    this.clearTimeouts();
    if (this.recognition && this.isListening) 
{
      this.recognition.stop();
      this.isListening = false;
    }
  }

public async speak(text: string, onEnd?: () => void): Promise<void> 
{
    if (this.synthesis.speaking) 
{
      this.synthesis.cancel();
    }

    const safeText = (text || '').trim();
    if (safeText.length === 0)
    {
      if (onEnd) {onEnd();}
      return;
    }

    await this.ensureVoicesLoaded();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'vi-VN';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    
    // Attempt to find a Vietnamese voice
    const voices = this.synthesis.getVoices();
    // Try to find Google Vietnamese or Microsoft HoaiMy
    const vnVoice = voices.find(v => v.lang.toLowerCase().includes('vi') || v.name.toLowerCase().includes('vietnam'));
    if (vnVoice) 
{
      utterance.voice = vnVoice;
    }
    else
    {
      const fallback = voices.find(v => v.lang.toLowerCase().startsWith('en') || v.lang.toLowerCase().startsWith('en-'));
      if (fallback)
      {
        utterance.voice = fallback;
      }
    }

    utterance.onend = () => 
{
      if (onEnd) {onEnd();}
    };

    utterance.onerror = (e) => 
{
        console.error("TTS Error", e);
        if (onEnd) {onEnd();}
    };

    try
    {
      this.synthesis.speak(utterance);
    }
    catch
    {
      if (onEnd) {onEnd();}
    }
  }

  public stopSpeaking(): void 
{
    if (this.synthesis.speaking) 
{
      this.synthesis.cancel();
    }
  }
}

export const audioService = new AudioService();
