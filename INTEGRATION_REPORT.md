# 🚀 Tích Hợp Legal-Reception-VN vào Legal-Frontend & Legal-Supporter

## ✅ Đã Hoàn Thành

### 1. **Frontend - Legal-Frontend**

#### Các File Mới Được Tạo:
- ✅ `src/types.ts` - Định nghĩa TypeScript interfaces (Message, Triple, Source, GraphNode, GraphLink, AppView)
- ✅ `src/services/audioService.ts` - Speech-to-Text, Text-to-Speech với wake word detection
- ✅ `src/services/legalService.ts` - Query backend với Gemini fallback
- ✅ `src/services/pantoMatrixService.ts` - Gesture video generation service
- ✅ `src/components/AvatarView.tsx` - Siri-like orb animation và video player
- ✅ `src/components/GraphView.tsx` - D3.js knowledge graph visualization
- ✅ `src/components/AssistantPageEnhanced.tsx` - Chat interface với wake word, STT/TTS, avatar
- ✅ `.env.local.example` - Environment variables template

#### Tính Năng Mới:
1. **Wake Word Detection** - Nói "Hey Legal", "Trợ lý", "Ơi" để kích hoạt
2. **Speech-to-Text** - Nhận diện giọng nói tiếng Việt
3. **Text-to-Speech** - Đọc câu trả lời bằng giọng Việt
4. **Siri-like Orb Animation** - Avatar động với animation đẹp mắt
5. **PantoMatrix Video** - Hiển thị video gesture từ audio
6. **Gemini Fallback** - Sử dụng Gemini API khi backend offline
7. **Knowledge Graph Visualization** - Biểu đồ D3.js hiển thị triples
8. **Welcome Screen** - Màn hình chào mừng bypass autoplay policy
9. **Passive Listening Mode** - Lắng nghe thụ động wake word liên tục

#### Dependencies Đã Thêm:
```json
{
  "@google/genai": "^0.21.0",
  "d3": "^7.9.0",
  "lucide-react": "^0.469.0",
  "@types/d3": "^7.4.3"
}
```

### 2. **Backend - Legal-Supporter**

#### Các Thay Đổi:
- ✅ Cập nhật CORS middleware để frontend có thể connect
- ✅ Thêm `Access-Control-Allow-Origin: *` headers
- ✅ Fix healthz endpoint trả về status 200 OK

#### File Đã Sửa:
- `cmd/api/main.go` - CORS middleware và health check endpoint

---

## 📋 Hướng Dẫn Chạy

### 1. Backend (Go)

```powershell
cd Legal-Supporter

# Install dependencies
go mod download

# Start PostgreSQL (nếu chưa chạy)
docker-compose up -d postgres

# Run backend
go run cmd/api/main.go
# Backend sẽ chạy tại: http://localhost:8080
```

### 2. Frontend (React + Vite)

```powershell
cd Legal-Frontend

# Install dependencies
npm install

# Tạo file .env.local từ template
cp .env.local.example .env.local

# Thêm Gemini API key vào .env.local
# VITE_GEMINI_API_KEY=your_api_key_here

# Run frontend
npm run dev
# Frontend sẽ chạy tại: http://localhost:5173
```

### 3. PantoMatrix Service (Optional)

```powershell
cd PantoMatrix

# Install dependencies
pip install -r requirements.txt

# Run service (nếu có)
python panto_matrix/service.py
# Service sẽ chạy tại: http://localhost:8081
```

---

## 🎯 Flow Hoạt Động

### 1. Welcome Screen
- Người dùng bấm "Bắt đầu Tư vấn"
- Kích hoạt microphone và speaker permissions
- TTS chào mừng: "Xin chào, tôi là trợ lý pháp luật..."

### 2. Wake Word Mode (Passive Listening)
- Hệ thống lắng nghe thụ động từ khóa: "Legal", "Trợ lý", "Ơi", "Hey"
- Hiển thị badge "Nghe thụ động" màu xanh
- Khi phát hiện wake word → chuyển sang Active Listening

### 3. Active Listening
- Overlay màn hình với biểu tượng mic đỏ
- Hiển thị transcript real-time
- Khi người dùng nói xong (final result) → auto submit

### 4. Query Processing
- Gửi câu hỏi đến Backend (Go)
- Nếu backend offline → Fallback Gemini API
- Nhận response với: answer, sources, triples

### 5. Response Display
- Hiển thị câu trả lời trong chat bubble
- Hiển thị sources (văn bản pháp luật tham khảo)
- Update Knowledge Graph với triples mới

### 6. TTS & Avatar Generation
- **Option 1**: Nếu PantoMatrix service online
  - Generate gesture video từ text
  - Hiển thị video trong AvatarView
  - Khi video kết thúc → quay lại Wake Word Mode
  
- **Option 2**: Nếu PantoMatrix offline
  - Sử dụng browser TTS (Web Speech API)
  - Hiển thị Siri orb animation
  - Khi TTS kết thúc → quay lại Wake Word Mode

### 7. Loop
- Quay lại Wake Word Mode
- Lắng nghe thụ động wake word tiếp theo

---

## 🔧 Cấu Hình Môi Trường

### `.env.local` (Frontend)

```env
# Required: Gemini API Key cho fallback
VITE_GEMINI_API_KEY=AIza...

# Optional: Override backend URL
VITE_BACKEND_URL=http://localhost:8080

# Optional: Override PantoMatrix URL
VITE_PANTOMATRIX_URL=http://localhost:8081
```

### `.env` (Backend)

```env
DATABASE_URL=postgres://legaluser:legalpass@localhost:5432/legaldb
HTTP_PORT=8080
```

---

## 🎨 UI Components

### AvatarView
- **Idle State**: Siri-like orb với gradient animation
- **Listening State**: Ripple effects màu đỏ
- **Speaking State**: Zap icon bounce
- **Video State**: Full-screen video player

### ChatInterface
- **Dark Theme**: bg-darker (#0C0F14)
- **Glass Morphism**: backdrop-blur effects
- **Smooth Animations**: fade-in, slide-up, pulse
- **Responsive**: Mobile & desktop layouts

### GraphView
- **D3 Force Simulation**: Auto layout
- **Node Colors**: Blue (subject), Green (object)
- **Draggable Nodes**: Interactive exploration
- **Relation Labels**: Edge labels hiển thị quan hệ

---

## 📊 API Endpoints

### Backend (Go)

```
GET  /healthz
     → Response: "ok" (200 OK)

POST /api/v1/query
     Body: { "text": "câu hỏi", "debug": false }
     → Response: { 
         "answers": [{
           "answer": "...",
           "sources": [...],
           "triples": [...]
         }]
       }

POST /api/v1/query/ingest
     Body: { document, units, triples }
     → Response: { "document_id": "...", "units_created": 4 }
```

### PantoMatrix (Python - Optional)

```
GET  /healthz
     → Response: "ok"

POST /api/gestures
     Body: FormData { file: audio.wav }
     → Response: video/mp4 binary
```

---

## 🐛 Troubleshooting

### 1. Microphone không hoạt động
- Kiểm tra browser permissions
- Chỉ hoạt động trên HTTPS hoặc localhost
- Chrome/Edge tốt hơn Firefox cho Web Speech API

### 2. Backend connection failed
- Kiểm tra backend đang chạy: `curl http://localhost:8080/healthz`
- Kiểm tra CORS headers
- Xem browser console cho errors

### 3. Gemini API không hoạt động
- Kiểm tra `VITE_GEMINI_API_KEY` trong `.env.local`
- Verify API key tại: https://aistudio.google.com/apikey
- Check quota limits

### 4. TTS không có giọng Việt
- Kiểm tra browser có Vietnamese voice: `window.speechSynthesis.getVoices()`
- Cài đặt Vietnamese language pack trong OS
- Google Chrome thường có sẵn Vietnamese voices

### 5. Wake Word không phản hồi
- Nói rõ ràng: "Hey Legal" hoặc "Trợ lý ơi"
- Kiểm tra interim results trong audio service
- Check console logs cho wake word detection

---

## 🚀 Next Steps

### Cải Tiến Có Thể Làm:

1. **Backend Integration**
   - Implement real TTS endpoint trong Go backend
   - Tích hợp PantoMatrix vào backend microservice
   - Cache Gemini responses trong database

2. **UI/UX Enhancements**
   - Thêm settings page để configure wake word
   - Lưu conversation history vào localStorage
   - Export chat to PDF/Word

3. **Advanced Features**
   - Multi-language support (English, Japanese)
   - Voice cloning với ElevenLabs
   - Real-time collaboration chat

4. **Performance**
   - Lazy load D3 visualization
   - Optimize avatar video streaming
   - Implement service worker cho offline mode

---

## 📚 Tech Stack Summary

**Frontend:**
- React 18 + TypeScript
- Vite 5
- Tailwind CSS 3
- D3.js 7 (Visualization)
- Framer Motion (Animations)
- Lucide React (Icons)
- Google Gemini API (Fallback LLM)
- Web Speech API (STT/TTS)

**Backend:**
- Go 1.22+
- Chi Router
- PostgreSQL 15
- pgx (Database driver)

**Optional:**
- PantoMatrix (Gesture Generation)
- Python FastAPI (Microservice)

---

## 🎉 Kết Luận

Đã tích hợp thành công **Legal-Reception-VN** vào hệ thống với đầy đủ tính năng:
- ✅ Wake word detection
- ✅ STT/TTS tiếng Việt
- ✅ Siri-like avatar animation
- ✅ Knowledge graph visualization
- ✅ Gemini fallback
- ✅ PantoMatrix video support
- ✅ Welcome screen & passive listening
- ✅ CORS enabled backend

Hệ thống sẵn sàng để demo và phát triển thêm!
