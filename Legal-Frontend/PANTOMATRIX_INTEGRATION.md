# 🎭 PantoMatrix Avatar Integration Guide

## Tổng quan

Frontend đã được chuẩn bị sẵn để tích hợp **PantoMatrix** - hệ thống tạo avatar ảo với gestures đồng bộ theo lời nói. Hiện tại đang dùng **mock/placeholder**, cần tích hợp backend thực.

## 🎯 Workflow hiện tại

```
User hỏi câu hỏi
    ↓
Backend trả lời (text)
    ↓
Frontend gọi TTS API (text → audio)
    ↓
Frontend gọi Gestures API (audio → video)
    ↓
Hiển thị avatar video với gestures
```

## 📦 Các component đã có sẵn

### 1. **AssistantPage.tsx**
- ✅ Avatar video player với toggle bật/tắt
- ✅ State management cho avatar
- ✅ Audio playback
- ✅ Loading states
- ✅ Error handling

### 2. **api.ts**
- ✅ `ttsEndpoint()` - Mock TTS (tạo silent audio)
- ✅ `gesturesEndpoint()` - Mock gestures (tạo static image)
- ✅ Sẵn sàng để thay bằng real API calls

## 🔧 Cách tích hợp Backend thực

### Backend cần implement 2 endpoints:

#### 1. **TTS Endpoint** - Text to Speech
```bash
POST http://localhost:8080/api/v1/tts
Content-Type: application/json

Body:
{
  "text": "Câu nói cần chuyển thành giọng"
}

Response:
- Content-Type: audio/mpeg hoặc audio/wav
- Body: Binary audio data
```

**Gợi ý implementation:**
- Google Cloud Text-to-Speech API
- Azure Cognitive Services Speech
- Amazon Polly
- FPT.AI Voice
- Viettel AI Voice

#### 2. **Gestures Endpoint** - PantoMatrix Video Generation
```bash
POST http://localhost:8080/api/v1/gestures
Content-Type: multipart/form-data

Body:
- file: audio file (WAV/MP3)

Response:
- Content-Type: video/mp4
- Body: Binary video data với avatar animation
```

**PantoMatrix Integration:**

1. **Clone PantoMatrix repo:**
```bash
git clone https://github.com/PantoMatrix/PantoMatrix
cd PantoMatrix
```

2. **Setup model:**
```bash
# Install dependencies
pip install -r requirements.txt

# Download pretrained models
# EMAGE, CaMN, DisCo models
```

3. **Tạo API wrapper (Python/FastAPI):**
```python
from fastapi import FastAPI, UploadFile, File
from fastapi.responses import FileResponse
import pantomatrix  # Your PantoMatrix wrapper

app = FastAPI()

@app.post("/generate-gestures")
async def generate_gestures(file: UploadFile = File(...)):
    # 1. Save uploaded audio
    audio_path = f"temp/{file.filename}"
    with open(audio_path, "wb") as f:
        f.write(await file.read())
    
    # 2. Run PantoMatrix model
    video_path = pantomatrix.generate(
        audio_path=audio_path,
        model="EMAGE",  # or CaMN, DisCo
        output_format="mp4"
    )
    
    # 3. Return video
    return FileResponse(
        video_path,
        media_type="video/mp4",
        filename="avatar.mp4"
    )
```

4. **Integrate vào Go backend:**
```go
// internal/avatar/avatar.go
package avatar

import (
    "bytes"
    "io"
    "net/http"
)

const pantomatrixURL = "http://localhost:8000/generate-gestures"

func GenerateGestures(audioData []byte) ([]byte, error) {
    // Forward to PantoMatrix Python service
    resp, err := http.Post(
        pantomatrixURL,
        "audio/wav",
        bytes.NewReader(audioData),
    )
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()
    
    return io.ReadAll(resp.Body)
}

// cmd/api/main.go - Add route
r.Post("/api/v1/gestures", handleGestures)
```

## 🔄 Update Frontend để dùng real APIs

Khi backend đã sẵn sàng, update `src/api.ts`:

```typescript
export async function ttsEndpoint(text: string): Promise<{ url: string; blob: Blob }> 
{
  try 
  {
    // Call real backend TTS
    const res = await api.post('/tts', { text }, { 
      responseType: 'arraybuffer' 
    })
    
    const contentType = res.headers?.['content-type'] || 'audio/mpeg'
    const blob = new Blob([res.data], { type: contentType })
    const url = URL.createObjectURL(blob)
    return { url, blob }
  }
  catch (err: any) 
  {
    const msg = err?.response 
      ? `TTS error ${err.response.status}: ${JSON.stringify(err.response.data)}` 
      : err.message || String(err)
    throw new Error(msg)
  }
}

export async function gesturesEndpoint(audioBlob: Blob): Promise<{ url: string; type: string }>
{
  const form = new FormData()
  form.append('file', audioBlob, 'speech.wav')
  
  try 
  {
    // Call real backend PantoMatrix
    const res = await api.post('/gestures', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      responseType: 'arraybuffer'
    })
    
    const contentType = res.headers?.['content-type'] || 'video/mp4'
    const blob = new Blob([res.data], { type: contentType })
    const url = URL.createObjectURL(blob)
    return { url, type: contentType }
  }
  catch (err: any) 
  {
    const msg = err?.response 
      ? `Gestures error ${err.response.status}: ${JSON.stringify(err.response.data)}` 
      : err.message || String(err)
    throw new Error(msg)
  }
}
```

## 🎨 UI Features đã có sẵn

### Avatar Player
- ✅ Responsive video/image player
- ✅ Aspect ratio 16:9
- ✅ Auto-play khi có video mới
- ✅ Loading indicator
- ✅ Placeholder khi chưa có video

### Controls
- ✅ Toggle bật/tắt avatar
- ✅ Tự động dừng audio khi tắt
- ✅ Status indicators (đang tạo, đã sẵn sàng)

### Integration với Chat
- ✅ Tự động generate avatar khi có response mới
- ✅ Không block UI (async)
- ✅ Graceful fallback nếu generation thất bại

## 📊 Performance Considerations

### Caching
```typescript
// Cache generated videos để tránh generate lại
const videoCache = new Map<string, string>() // text → videoUrl

export async function gesturesEndpointCached(
  audioBlob: Blob, 
  text: string
): Promise<{ url: string; type: string }> {
  // Check cache first
  if (videoCache.has(text)) {
    return { 
      url: videoCache.get(text)!, 
      type: 'video/mp4' 
    }
  }
  
  // Generate new
  const result = await gesturesEndpoint(audioBlob)
  videoCache.set(text, result.url)
  return result
}
```

### Optimization
- Preload avatar model khi app khởi động
- Stream video thay vì đợi toàn bộ
- Progressive loading
- Queue multiple requests

## 🔍 Testing

### Test với mock data:
```bash
# Frontend đang chạy với mock
# Avatar sẽ hiển thị placeholder image
# Audio sẽ silent
```

### Test với real backend:
```bash
# 1. Start PantoMatrix service
cd pantomatrix-service
uvicorn main:app --port 8000

# 2. Start Go backend
cd Legal-Supporter
docker-compose up -d

# 3. Test endpoint
curl -X POST http://localhost:8080/api/v1/tts \
  -H "Content-Type: application/json" \
  -d '{"text":"Xin chào"}' \
  --output test.mp3

curl -X POST http://localhost:8080/api/v1/gestures \
  -F "file=@test.mp3" \
  --output test.mp4
```

## 📝 Next Steps

1. **Setup PantoMatrix backend service**
   - Clone repo
   - Install models
   - Create API wrapper

2. **Implement Go backend endpoints**
   - `/api/v1/tts` - TTS service
   - `/api/v1/gestures` - PantoMatrix wrapper

3. **Update frontend api.ts**
   - Replace mock với real API calls
   - Add error handling
   - Add retry logic

4. **Optimize performance**
   - Implement caching
   - Add streaming
   - Preload models

5. **Testing**
   - Unit tests
   - Integration tests
   - Performance tests
   - User acceptance testing

## 🎯 Status

- ✅ Frontend UI ready
- ✅ Mock APIs working
- ⏳ Backend TTS endpoint (cần implement)
- ⏳ Backend Gestures endpoint (cần implement)
- ⏳ PantoMatrix integration (cần implement)

## 📚 Resources

- [PantoMatrix GitHub](https://github.com/PantoMatrix/PantoMatrix)
- [EMAGE Paper](https://arxiv.org/abs/2304.11276)
- [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
- [FastAPI Docs](https://fastapi.tiangolo.com/)

---

**Kết luận:** Frontend đã sẵn sàng 100%, chỉ cần backend implement 2 endpoints là có thể chạy avatar với gestures thực!
