export class PantoMatrixService 
{
  private baseUrl = 'http://localhost:8081/api';

  /**
   * Generates a gesture video from text by converting to audio and sending to PantoMatrix service.
   * Flow:
   * 1. Convert text to audio using Web Speech API (TTS)
   * 2. Send audio to PantoMatrix Python service
   * 3. Receive video URL
   * 4. Fallback to mock video if service unavailable
   */
  async generateGestureVideo(text: string): Promise<string | null> 
{
    try 
{
      console.log("[PantoMatrix] Generating gesture video for:", text);

      // Check if service is available
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      
      try 
{
        const health = await fetch(`${this.baseUrl}/../healthz`, { 
          signal: controller.signal 
        });
        clearTimeout(timeoutId);

        if (!health.ok) 
{
          throw new Error('Service unavailable');
        }

        // Convert text to audio using TTS
        const audioBlob = await this.textToAudio(text);
        
        if (!audioBlob) 
{
          console.warn("Failed to generate audio from text, using fallback");
          return this.getFallbackVideo();
        }

        // Send audio to PantoMatrix service
        const formData = new FormData();
        formData.append('audio', audioBlob, 'speech.wav');

        const response = await fetch(`${this.baseUrl}/generate`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) 
{
          throw new Error(`PantoMatrix API error: ${response.status}`);
        }

        const result = await response.json();
        
        if (result.status === 'success' || result.video_url) 
{
          console.log("[PantoMatrix] Video generated:", result.video_url);
          return result.video_url;
        }

        // If status is 'mock', service is running but PantoMatrix not installed
        if (result.status === 'mock') 
{
          console.warn("[PantoMatrix] Service running in mock mode");
          return this.getFallbackVideo();
        }

        throw new Error('Invalid response from PantoMatrix service');

      }
 catch (fetchError) 
{
        clearTimeout(timeoutId);
        console.warn("[PantoMatrix] Service unavailable:", fetchError);
        return this.getFallbackVideo();
      }

    }
 catch (error) 
{
      console.error("[PantoMatrix] Error:", error);
      return this.getFallbackVideo();
    }
  }

  /**
   * Convert text to audio using Web Speech API
   * Returns audio blob in WAV format
   */
  private async textToAudio(text: string): Promise<Blob | null> 
{
    return new Promise((resolve) => 
{
      try 
{
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'vi-VN';
        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        // Find Vietnamese voice
        const voices = window.speechSynthesis.getVoices();
        const vnVoice = voices.find(v => v.lang.includes('vi'));
        if (vnVoice) 
{
          utterance.voice = vnVoice;
        }

        // Use MediaRecorder to capture audio
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        const audioContext = new AudioContext();
        const destination = audioContext.createMediaStreamDestination();
        
        const mediaRecorder = new MediaRecorder(destination.stream);
        const chunks: Blob[] = [];

        mediaRecorder.ondataavailable = (e) => 
{
          if (e.data.size > 0) 
{
            chunks.push(e.data);
          }
        };

        mediaRecorder.onstop = () => 
{
          const blob = new Blob(chunks, { type: 'audio/wav' });
          audioContext.close();
          resolve(blob);
        };

        utterance.onend = () => 
{
          setTimeout(() => 
{
            mediaRecorder.stop();
          }, 500);
        };

        utterance.onerror = () => 
{
          mediaRecorder.stop();
          audioContext.close();
          resolve(null);
        };

        mediaRecorder.start();
        window.speechSynthesis.speak(utterance);

        // Timeout after 30 seconds
        setTimeout(() => 
{
          if (mediaRecorder.state === 'recording') 
{
            mediaRecorder.stop();
            audioContext.close();
            resolve(null);
          }
        }, 30000);

      }
 catch (error) 
{
        console.error('[PantoMatrix] TTS error:', error);
        resolve(null);
      }
    });
  }

  /**
   * Get fallback video URL when service is unavailable
   */
  private getFallbackVideo(): string 
{
    // Use a sample gesture video
    return "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4";
  }
}

export const pantoMatrixService = new PantoMatrixService();
