# 🤖 Prompt Tái Tạo Dự Án Legal Reception với Google AI Studio

## 📋 Tổng Quan Dự Án

Tôi muốn tái tạo một hệ thống **Lễ Tân Ảo Tư Vấn Pháp Luật Việt Nam** với các tính năng chính:

### 🎯 Mục Tiêu Chính
1. **Backend API** (Go/Python - có thể thay thế): Xử lý truy vấn pháp luật dựa trên Knowledge Graph
2. **Frontend Web** (React + Vite): Giao diện chat tư vấn pháp luật
3. **Trợ Lý Ảo với Cử Chỉ**: Tích hợp speech-to-text, text-to-speech và animation cử chỉ người thật
4. **Crawl Data**: Thu thập dữ liệu pháp luật từ thuvienphapluat.vn
5. **Knowledge Graph**: Lưu trữ tri thức pháp luật dạng triples (Subject-Relation-Object)

---

## 🏗️ Kiến Trúc Hệ Thống

```
┌─────────────────────┐         ┌──────────────────────┐         ┌─────────────────┐
│   React Frontend    │ ◄──────►│   Backend API        │◄───────►│   PostgreSQL    │
│  (Vite + Tailwind)  │  HTTP   │  (Go hoặc Python)    │  SQL    │  (Knowledge DB) │
│                     │         │                      │         │                 │
│  - Chat Interface   │         │  - Query Engine      │         │  - documents    │
│  - STT/TTS          │         │  - Ingest Service    │         │  - units        │
│  - Avatar Animation │         │  - Graph Processing  │         │  - triples      │
│  - Gesture Video    │         │  - Triple Matching   │         │  - concepts     │
└─────────────────────┘         └──────────────────────┘         │  - relations    │
         │                               │                         └─────────────────┘
         │                               │
         ▼                               ▼
┌─────────────────────┐         ┌──────────────────────┐
│   PantoMatrix       │         │   Data Crawler       │
│   Gesture Service   │         │   thuvienphapluat.vn │
│  (Audio→Video)      │         │   (Selenium)         │
└─────────────────────┘         └──────────────────────┘
```

---

## 📦 Chi Tiết Các Component

### 1. **Backend API (Query Engine)**

#### Chức năng chính:
- **Ingest API**: Nhận dữ liệu pháp luật (JSON), trích xuất triples và lưu vào database
- **Query API**: Nhận câu hỏi tự nhiên, trích xuất terms, tìm kiếm concepts/relations, ghép triples và trả về câu trả lời
- **Health Check**: Endpoint kiểm tra trạng thái

#### Data Model (PostgreSQL):

```sql
-- Documents: Văn bản pháp luật
CREATE TABLE documents (
    id UUID PRIMARY KEY,
    title TEXT,
    doc_type VARCHAR(50),  -- law, decree, regulation
    number VARCHAR(50),
    year INTEGER,
    issued_by TEXT,
    effective_date DATE,
    status VARCHAR(20)
);

-- Units: Điều, khoản, điểm trong văn bản
CREATE TABLE units (
    id UUID PRIMARY KEY,
    document_id UUID REFERENCES documents(id),
    parent_id UUID REFERENCES units(id),
    unit_type VARCHAR(20),  -- article, clause, point
    number VARCHAR(20),
    title TEXT,
    content TEXT,
    path TEXT  -- hierachy path
);

-- Concepts: Khái niệm pháp lý (entities)
CREATE TABLE concepts (
    id UUID PRIMARY KEY,
    name VARCHAR(255) UNIQUE,
    synonyms TEXT[],  -- array of synonyms
    concept_type VARCHAR(50),  -- entity, action, condition, penalty
    definition TEXT
);

-- Relations: Các loại quan hệ
CREATE TABLE relations (
    id UUID PRIMARY KEY,
    name VARCHAR(100) UNIQUE,
    relation_type VARCHAR(50),  -- requires, prohibits, penalizes, defines
    description TEXT
);

-- Triples: Bộ ba tri thức (S-R-O)
CREATE TABLE triples (
    id UUID PRIMARY KEY,
    subject_id UUID REFERENCES concepts(id),
    relation_id UUID REFERENCES relations(id),
    object_id UUID REFERENCES concepts(id),
    unit_id UUID REFERENCES units(id),
    document_id UUID REFERENCES documents(id),
    context TEXT,
    confidence FLOAT
);
```

#### API Endpoints:

```
POST /api/v1/query
Body: {
    "text": "Phạt bao nhiêu nếu không đội mũ bảo hiểm?",
    "debug": false
}
Response: {
    "answers": [
        {
            "text": "Phạt từ 400,000đ đến 600,000đ",
            "confidence": 0.92,
            "source": {
                "document": "Nghị định 100/2019/NĐ-CP",
                "unit": "Điều 6, Khoản 1",
                "url": "https://..."
            },
            "triples": [
                {
                    "subject": "không đội mũ bảo hiểm",
                    "relation": "bị phạt",
                    "object": "400,000-600,000đ"
                }
            ]
        }
    ]
}

POST /api/v1/query/ingest
Body: {
    "document": {
        "title": "Nghị định 100/2019/NĐ-CP",
        "type": "decree",
        "number": "100/2019/NĐ-CP",
        "year": 2019
    },
    "units": [
        {
            "type": "article",
            "number": "6",
            "content": "...",
            "triples": [
                {
                    "subject": "người điều khiển xe mô tô",
                    "relation": "phải",
                    "object": "đội mũ bảo hiểm",
                    "context": "khi tham gia giao thông"
                }
            ]
        }
    ]
}

GET /healthz
Response: "ok"
```

#### Query Processing Pipeline:

1. **Term Extraction**: Tách các từ khóa quan trọng từ câu hỏi
2. **Candidate Search**: Tìm concepts phù hợp (dùng synonyms, fuzzy matching)
3. **Star Pattern Matching**: Tìm triples liên quan đến concepts
4. **Ranking & Aggregation**: Sắp xếp theo confidence score
5. **Answer Generation**: Format kết quả trả về

---

### 2. **Frontend (React + Vite + Tailwind CSS)**

#### Chức năng:
- **Chat Interface**: Nhập câu hỏi văn bản hoặc giọng nói
- **Speech-to-Text**: Microphone button → gửi audio → nhận text
- **Text-to-Speech**: Đọc câu trả lời
- **Avatar Animation**: Hiển thị video cử chỉ (từ PantoMatrix)
- **Response Display**: Card hiển thị câu trả lời + nguồn tham chiếu

#### Routes:
```javascript
- /assistant → Chat với trợ lý (main page)
- /home → Landing page
- /documents → Danh sách văn bản pháp luật
- /graph → Visualize Knowledge Graph
- /settings → Cài đặt
- /login → Đăng nhập
```

#### Key Components:

```typescript
// AssistantPage.tsx - Main chat interface
interface Message {
    id: string;
    role: 'user' | 'assistant';
    text: string;
    timestamp: Date;
    sources?: Source[];
}

interface Source {
    document: string;
    unit: string;
    url: string;
}

// QueryBox.tsx - Input với mic button
const QueryBox = () => {
    const [isRecording, setIsRecording] = useState(false);
    const handleMicClick = async () => {
        // Record audio → POST /api/stt → setText()
    };
};

// ResponseCard.tsx - Display answer
const ResponseCard = ({ message }: { message: Message }) => {
    return (
        <div className="card">
            <p>{message.text}</p>
            {message.sources?.map(s => (
                <a href={s.url}>{s.document} - {s.unit}</a>
            ))}
        </div>
    );
};

// AssistantAvatar.tsx - Animated avatar
const AssistantAvatar = ({ videoUrl }: { videoUrl?: string }) => {
    return videoUrl ? (
        <video src={videoUrl} autoPlay />
    ) : (
        <div className="avatar-placeholder">🤖</div>
    );
};
```

#### API Integration:

```typescript
// api.ts
const API_BASE = 'http://localhost:8080/api/v1';

export const queryLegalQuestion = async (text: string) => {
    const response = await fetch(`${API_BASE}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, debug: false })
    });
    return response.json();
};

export const speechToText = async (audioBlob: Blob) => {
    const formData = new FormData();
    formData.append('file', audioBlob);
    const response = await fetch(`${API_BASE}/stt`, {
        method: 'POST',
        body: formData
    });
    return response.json(); // { text: "..." }
};

export const textToSpeech = async (text: string) => {
    const response = await fetch(`${API_BASE}/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
    });
    return response.blob(); // audio file
};

export const generateGesture = async (audioBlob: Blob) => {
    const formData = new FormData();
    formData.append('file', audioBlob);
    const response = await fetch(`${API_BASE}/gestures`, {
        method: 'POST',
        body: formData
    });
    return response.blob(); // video/mp4
};
```

---

### 3. **Data Crawler (Python + Selenium)**

#### Mục đích:
Thu thập dữ liệu tư vấn pháp luật từ **thuvienphapluat.vn**

#### Script mẫu:

```python
# crawl_thuvienphapluat.py
import undetected_chromedriver as uc
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import pandas as pd
import time
import random

def crawl_legal_qa(query: str, max_pages: int = 3):
    """Cào Q&A pháp luật từ thuvienphapluat.vn"""
    
    options = uc.ChromeOptions()
    options.add_argument('--headless')
    driver = uc.Chrome(options=options)
    
    data = []
    base_url = f"https://thuvienphapluat.vn/phap-luat-thuong-thuc/tim-hieu-phap-luat?keyword={query}"
    
    try:
        driver.get(base_url)
        time.sleep(random.uniform(2, 4))
        
        for page in range(max_pages):
            # Scroll để load content
            driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
            time.sleep(2)
            
            # Extract Q&A
            items = driver.find_elements(By.CSS_SELECTOR, '.legal-qa-item')
            for item in items:
                try:
                    question = item.find_element(By.CSS_SELECTOR, '.question').text
                    answer = item.find_element(By.CSS_SELECTOR, '.answer').text
                    source = item.find_element(By.CSS_SELECTOR, '.source').text
                    url = item.find_element(By.CSS_SELECTOR, 'a').get_attribute('href')
                    
                    data.append({
                        'question': question,
                        'answer': answer,
                        'source': source,
                        'url': url
                    })
                except Exception as e:
                    print(f"Error extracting item: {e}")
                    continue
            
            # Next page
            try:
                next_btn = driver.find_element(By.CSS_SELECTOR, '.pagination .next')
                next_btn.click()
                time.sleep(random.uniform(2, 4))
            except:
                break
                
    finally:
        driver.quit()
    
    df = pd.DataFrame(data)
    df.to_csv(f'{query}_data.csv', index=False, encoding='utf-8-sig')
    return df

# Usage
if __name__ == '__main__':
    df = crawl_legal_qa('tử hình', max_pages=5)
    print(f"Crawled {len(df)} items")
```

#### Extract Triples từ Crawled Data:

```python
# extract_triples_gemini.py
import google.generativeai as genai
import json

def extract_triples_with_gemini(text: str, api_key: str):
    """Sử dụng Gemini để trích xuất triples từ text"""
    
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-pro')
    
    prompt = f"""
Từ đoạn văn bản pháp luật sau, hãy trích xuất các bộ ba tri thức (subject-relation-object).

Văn bản: {text}

Trả về JSON format:
{{
    "triples": [
        {{
            "subject": "...",
            "relation": "...",
            "object": "...",
            "context": "..."
        }}
    ]
}}

Quan hệ phải là một trong: requires, prohibits, penalizes, defines, exempts, allows.
"""
    
    response = model.generate_content(prompt)
    return json.loads(response.text)

# Usage
with open('legal_texts.json') as f:
    docs = json.load(f)

all_triples = []
for doc in docs:
    result = extract_triples_with_gemini(doc['content'], 'YOUR_GEMINI_API_KEY')
    all_triples.extend(result['triples'])

with open('triples_extracted.json', 'w', encoding='utf-8') as f:
    json.dump(all_triples, f, ensure_ascii=False, indent=2)
```

---

### 4. **PantoMatrix Integration (Gesture Animation)**

#### Chức năng:
Nhận audio TTS → Tạo video animation cử chỉ người thật

#### FastAPI Wrapper:

```python
# gesture_service.py
from fastapi import FastAPI, UploadFile, File
from fastapi.responses import FileResponse
import uvicorn
import os
import tempfile
import subprocess
import shutil

app = FastAPI()

@app.post("/api/gestures")
async def generate_gesture_video(file: UploadFile = File(...)):
    """
    Input: Audio file (wav/mp3)
    Output: Video with gesture animation (mp4)
    """
    
    with tempfile.TemporaryDirectory() as tmpdir:
        # Save uploaded audio
        audio_path = os.path.join(tmpdir, "input.wav")
        with open(audio_path, 'wb') as f:
            shutil.copyfileobj(file.file, f)
        
        output_dir = os.path.join(tmpdir, "output")
        os.makedirs(output_dir, exist_ok=True)
        
        # Call PantoMatrix EMAGE
        subprocess.check_call([
            "python", "test_emage_audio.py",
            "--audio_folder", tmpdir,
            "--save_folder", output_dir,
            "--visualization"
        ], cwd="/path/to/PantoMatrix")
        
        # Find generated video
        videos = [f for f in os.listdir(output_dir) if f.endswith('.mp4')]
        if not videos:
            return {"error": "No video generated"}
        
        video_path = os.path.join(output_dir, videos[0])
        return FileResponse(video_path, media_type="video/mp4")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8081)
```

---

## 🚀 Deployment & Running

### 1. Backend (Docker Compose):

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: legaldb
      POSTGRES_USER: legaluser
      POSTGRES_PASSWORD: legalpass
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  api:
    build: ./Legal-Supporter
    ports:
      - "8080:8080"
    environment:
      DATABASE_URL: postgres://legaluser:legalpass@postgres:5432/legaldb
      PORT: 8080
    depends_on:
      - postgres

  gesture-service:
    build: ./PantoMatrix
    ports:
      - "8081:8081"
    volumes:
      - ./PantoMatrix:/app

volumes:
  postgres_data:
```

### 2. Frontend:

```bash
cd Legal-Frontend
npm install
npm run dev  # http://localhost:5173
```

### 3. Sample Commands:

```powershell
# Start all services
docker-compose up -d

# Ingest sample data
curl -X POST http://localhost:8080/api/v1/query/ingest -H "Content-Type: application/json" -d @sample_data.json

# Query
$body = '{"text":"Phạt bao nhiêu nếu không đội mũ bảo hiểm?"}';
Invoke-WebRequest -Method POST -Uri "http://localhost:8080/api/v1/query" -Body $body -ContentType "application/json"
```

---

## 🎨 UI/UX Design

### Theme:
- **Dark Mode**: Background #1a1a1a, Text #ffffff
- **Primary Color**: Blue #3b82f6
- **Accent**: Green #10b981

### Layout:
```
┌─────────────────────────────────────────────────────────┐
│  [Logo] Legal Assistant          [Settings] [Logout]    │
├─────────┬───────────────────────────────────────────────┤
│         │                                               │
│  Menu   │         ┌──────────────────┐                 │
│         │         │  Avatar/Video    │                 │
│  🏠 Home│         └──────────────────┘                 │
│  💬 Chat│                                               │
│  📄 Docs│    User: "Phạt bao nhiêu nếu không đội      │
│  🕸  Graph│           mũ bảo hiểm?"                    │
│  ⚙️ Settings│                                          │
│         │    AI: "Phạt từ 400,000đ - 600,000đ theo    │
│         │         Nghị định 100/2019"                  │
│         │         [Source: Điều 6, Khoản 1]           │
│         │                                               │
│         │    ┌────────────────────────────┐            │
│         │    │  [🎤] Nhập câu hỏi... [📤] │            │
│         │    └────────────────────────────┘            │
└─────────┴───────────────────────────────────────────────┘
```

---

## 📝 Sample Data Format

### Input for Ingest API:

```json
{
  "document": {
    "title": "Nghị định 100/2019/NĐ-CP về xử phạt vi phạm hành chính trong lĩnh vực giao thông đường bộ",
    "type": "decree",
    "number": "100/2019/NĐ-CP",
    "year": 2019,
    "issued_by": "Chính phủ",
    "effective_date": "2020-01-01"
  },
  "units": [
    {
      "type": "article",
      "number": "6",
      "title": "Xử phạt người điều khiển xe mô tô, xe gắn máy",
      "content": "Phạt tiền từ 400.000 đồng đến 600.000 đồng đối với người điều khiển xe mô tô, xe gắn máy không đội mũ bảo hiểm khi tham gia giao thông.",
      "clauses": [
        {
          "type": "clause",
          "number": "1",
          "content": "Phạt tiền từ 400.000 đồng đến 600.000 đồng đối với người điều khiển xe không đội mũ bảo hiểm.",
          "triples": [
            {
              "subject": "người điều khiển xe mô tô",
              "relation": "requires",
              "object": "đội mũ bảo hiểm",
              "context": "khi tham gia giao thông"
            },
            {
              "subject": "không đội mũ bảo hiểm",
              "relation": "penalizes",
              "object": "400,000-600,000 đồng",
              "context": "người điều khiển xe mô tô"
            }
          ]
        }
      ]
    }
  ]
}
```

---

## 🔧 Technologies Stack

### Backend:
- **Language**: Go 1.22+ hoặc Python 3.10+
- **Framework**: chi (Go) hoặc FastAPI (Python)
- **Database**: PostgreSQL 15
- **ORM**: pgx (Go) hoặc SQLAlchemy (Python)

### Frontend:
- **Framework**: React 18 + Vite 5
- **Styling**: Tailwind CSS 3
- **Animation**: Framer Motion
- **HTTP**: Axios
- **State**: React Hooks (useState, useEffect)

### AI/ML:
- **LLM**: Google Gemini API (extract triples, answer generation)
- **STT**: Web Speech API hoặc Google Cloud Speech-to-Text
- **TTS**: Web Speech Synthesis API hoặc Google Cloud Text-to-Speech
- **Gesture**: PantoMatrix (EMAGE model)

### Data Collection:
- **Crawler**: Selenium + undetected_chromedriver
- **Processing**: pandas, BeautifulSoup4

---

## 🎯 Implementation Steps

### Phase 1: Core Backend (1 week)
1. Setup PostgreSQL database schema
2. Implement Ingest API (nhận JSON → lưu triples)
3. Implement Query API (basic keyword matching)
4. Test với sample data (Nghị định 100/2019)

### Phase 2: Frontend Basic (1 week)
5. Setup React + Vite project
6. Create chat interface
7. Integrate Query API
8. Add basic styling with Tailwind

### Phase 3: Data Collection (1 week)
9. Write crawler for thuvienphapluat.vn
10. Extract triples using Gemini API
11. Batch ingest crawled data

### Phase 4: Advanced Features (2 weeks)
12. Implement STT/TTS
13. Integrate PantoMatrix gesture service
14. Add Knowledge Graph visualization
15. Improve query algorithm (synonyms, fuzzy match)

### Phase 5: Polish & Deploy (1 week)
16. Error handling & logging
17. Performance optimization
18. Docker deployment
19. Documentation

---

## 🧪 Testing Scenarios

### Backend Tests:

```bash
# Test 1: Ingest document
curl -X POST http://localhost:8080/api/v1/query/ingest \
  -H "Content-Type: application/json" \
  -d @sample_nghidinh100.json

# Test 2: Query về mũ bảo hiểm
curl -X POST http://localhost:8080/api/v1/query \
  -H "Content-Type: application/json" \
  -d '{"text":"Không đội mũ bảo hiểm bị phạt bao nhiêu?"}'

# Test 3: Query về nồng độ cồn
curl -X POST http://localhost:8080/api/v1/query \
  -H "Content-Type: application/json" \
  -d '{"text":"Uống rượu lái xe bị xử lý thế nào?"}'

# Test 4: Debug mode
curl -X POST http://localhost:8080/api/v1/query \
  -H "Content-Type: application/json" \
  -d '{"text":"Phạt nguội là gì?","debug":true}'
```

### Frontend Tests:
1. Mở http://localhost:5173
2. Nhập câu hỏi văn bản
3. Test microphone button (STT)
4. Kiểm tra hiển thị source references
5. Test gesture video playback

---

## 📚 Resources & References

### Documentation:
- PostgreSQL Docs: https://www.postgresql.org/docs/15/
- React Docs: https://react.dev
- Tailwind CSS: https://tailwindcss.com
- Google Gemini API: https://ai.google.dev/docs
- PantoMatrix: https://github.com/PantoMatrix/PantoMatrix

### Sample Legal Documents:
- Nghị định 100/2019/NĐ-CP (Giao thông)
- Bộ luật Hình sự 2015
- Bộ luật Dân sự 2015

### APIs to Implement:
```
Backend:
- POST /api/v1/query
- POST /api/v1/query/ingest
- GET  /healthz
- POST /api/v1/stt (speech-to-text)
- POST /api/v1/tts (text-to-speech)
- POST /api/v1/gestures (audio → gesture video)

Frontend Routes:
- /assistant (main chat)
- /home
- /documents
- /graph
- /settings
```

---

## ⚠️ Important Notes

1. **Gemini API Usage**: 
   - Dùng để extract triples từ raw text
   - Có thể dùng để enhance query understanding
   - Free tier: 60 requests/minute

2. **PantoMatrix Requirements**:
   - Cần GPU để chạy inference nhanh
   - Models: EMAGE (full body + face)
   - Input: WAV audio file
   - Output: MP4 video with SMPLX skeleton

3. **Database Indexes**:
   ```sql
   CREATE INDEX idx_concepts_name ON concepts USING gin(to_tsvector('vietnamese', name));
   CREATE INDEX idx_triples_subject ON triples(subject_id);
   CREATE INDEX idx_triples_relation ON triples(relation_id);
   CREATE INDEX idx_units_document ON units(document_id);
   ```

4. **Security**:
   - Add authentication middleware
   - Rate limiting cho API
   - Validate input để tránh SQL injection
   - CORS config cho frontend

---

## 🎓 Learning Path

Nếu bạn chưa quen với stack này:

1. **Go Backend**: Học chi router, pgx, context
2. **React**: Hooks (useState, useEffect, useRef)
3. **PostgreSQL**: JSON operations, full-text search
4. **Docker**: docker-compose, multi-stage builds
5. **Selenium**: Crawling with headless browser

---

## 🚀 Quick Start Commands

```powershell
# 1. Clone repo template (or create new)
git clone <your-repo-url>
cd Legal_reception

# 2. Start database
docker run -d --name legal-db \
  -e POSTGRES_DB=legaldb \
  -e POSTGRES_USER=legaluser \
  -e POSTGRES_PASSWORD=legalpass \
  -p 5432:5432 \
  postgres:15-alpine

# 3. Run backend
cd Legal-Supporter
go mod download
go run cmd/api/main.go

# 4. Run frontend
cd Legal-Frontend
npm install
npm run dev

# 5. Access
# - Backend: http://localhost:8080
# - Frontend: http://localhost:5173
```

---

## 📦 Deliverables

1. ✅ Backend API (Go/Python) với PostgreSQL
2. ✅ Frontend React app với chat interface
3. ✅ Data crawler scripts
4. ✅ Sample legal data (Nghị định 100/2019)
5. ✅ Docker compose setup
6. ✅ Documentation (README, API docs)
7. ⚠️ Optional: PantoMatrix integration
8. ⚠️ Optional: Knowledge Graph visualization

---

Hãy sử dụng prompt này để yêu cầu Google AI Studio (Gemini) giúp bạn tạo code cho từng component! 🎉
