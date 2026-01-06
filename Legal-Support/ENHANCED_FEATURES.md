# Legal-Support Enhanced RAG System

## 🚀 Tính Năng Mới (Phase 2)

Dự án đã được nâng cấp với các tính năng tương đương **Agentic-RAG**:

### 1. 📝 YAML Prompt Configuration
- File cấu hình: `internal/graph/prompts.yaml`
- Dễ dàng chỉnh sửa prompts mà không cần rebuild
- Hỗ trợ template variables với `{variable}` syntax

### 2. 💬 Chat History (Session Support)
- Lưu trữ lịch sử hội thoại theo session
- Tự động cleanup sessions hết hạn
- API quản lý history: GET/DELETE `/api/v2/chat/history/{session_id}`

### 3. 🌐 Web Search Fallback
- Tự động tìm kiếm Google/DuckDuckGo khi DB không có kết quả
- Cấu hình qua biến môi trường:
  - `GOOGLE_SEARCH_API_KEY`
  - `GOOGLE_SEARCH_ENGINE_ID`
  - `ENABLE_WEB_SEARCH_FALLBACK=true`

### 4. ⚡ Streaming Response
- Real-time streaming qua Server-Sent Events (SSE)
- Endpoint: `POST /api/v2/chat/stream`
- Giảm latency cho user experience tốt hơn

### 5. 🔄 Multi-Strategy Reranker
- **Cohere API**: rerank-multilingual-v3.0
- **Local Model**: Hỗ trợ fine-tuned Vietnamese models
- **Cross-Encoder**: Sentence Transformers compatible
- **RRF (Reciprocal Rank Fusion)**: Combine multiple rankings

---

## 📡 API Endpoints

### API v1 (Legacy)
```
POST /api/v1/query           - Standard query
POST /api/v1/query/rag       - RAG semantic search
GET  /api/v1/query/documents - List documents
GET  /api/v1/query/recommend - Keyword search
```

### API v2 (Enhanced)
```
POST   /api/v2/chat                     - Chat with session
POST   /api/v2/chat/stream              - Streaming chat
GET    /api/v2/chat/history/{session}   - Get chat history
DELETE /api/v2/chat/history/{session}   - Clear history
POST   /api/v2/chat/search/web          - Web search
```

---

## 🔧 Environment Variables

### Core Config
```env
HTTP_PORT=8080
DATABASE_URL=postgres://user:pass@host:5432/db
EMBEDDING_API_KEY=your-api-key
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_PROVIDER=openai|gemini
QA_MODEL=gpt-4o-mini
```

### NLP Service
```env
NLP_SERVICE_URL=http://nlp-service:8090
```

### Enhanced Features
```env
# Web Search Fallback
GOOGLE_SEARCH_API_KEY=your-google-api-key
GOOGLE_SEARCH_ENGINE_ID=your-search-engine-id
ENABLE_WEB_SEARCH_FALLBACK=true

# Streaming
ENABLE_STREAMING=true

# Chat History
MAX_CHAT_HISTORY=20
CHAT_HISTORY_TTL_MINUTES=120

# Multi-Strategy Reranker
RERANK_API_KEYS=cohere-api-key
LOCAL_RERANKER_ENDPOINT=http://localhost:8081/rerank
CROSS_ENCODER_ENDPOINT=http://localhost:8082/rerank

# Prompts
PROMPTS_FILE_PATH=prompts.yaml
```

---

## 📋 Request/Response Examples

### Chat Request
```json
POST /api/v2/chat
{
  "session_id": "optional-session-id",
  "question": "Thủ tục thành lập công ty như thế nào?",
  "top_k": 10,
  "stream": false
}
```

### Chat Response
```json
{
  "answer": "Để thành lập công ty, bạn cần...",
  "source": "database",
  "session_id": "20240115143022-abc12345",
  "context": [
    {
      "unit_id": "uuid",
      "document_title": "Luật Doanh nghiệp 2020",
      "code": "Điều 19",
      "snippet": "..."
    }
  ]
}
```

### Streaming Response (SSE)
```
data: {"content":"SESSION:20240115143022-abc12345\n"}
data: {"content":"Để "}
data: {"content":"thành lập "}
data: {"content":"công ty..."}
data: {"content":"","done":true}
```

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend                                │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   API Gateway (Go)                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ API v1       │  │ API v2       │  │ Auth Service     │   │
│  │ (Legacy)     │  │ (Enhanced)   │  │                  │   │
│  └──────────────┘  └──────────────┘  └──────────────────┘   │
└───────────────────────────┬─────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│ NLP Service   │   │ PostgreSQL    │   │ External APIs │
│ (Vietnamese)  │   │ + pgvector    │   │ - OpenAI      │
│ - Tokenize    │   │               │   │ - Gemini      │
│ - Classify    │   │               │   │ - Cohere      │
│ - Extract     │   │               │   │ - Google      │
└───────────────┘   └───────────────┘   └───────────────┘
```

---

## 🚀 Quick Start

```bash
# 1. Copy environment file
cp .env.example .env

# 2. Configure API keys in .env
nano .env

# 3. Start all services
docker-compose up -d

# 4. Test API
curl -X POST http://localhost:8080/api/v2/chat \
  -H "Content-Type: application/json" \
  -d '{"question": "Điều kiện kết hôn theo pháp luật Việt Nam?"}'
```

---

## 📊 So Sánh với Các Dự Án Khác

| Feature | Legal-Support | VN-Law-Advisor | Agentic-RAG |
|---------|--------------|----------------|-------------|
| Vietnamese Tokenizer | ✅ pyvi | ❌ | ✅ underthesea |
| Query Rewrite | ✅ LLM-based | ❌ | ✅ |
| Query Classification | ✅ | ❌ | ✅ |
| Entity Extraction | ✅ | ❌ | ✅ |
| Reranking | ✅ Multi-strategy | ❌ | ✅ Cohere |
| RRF Fusion | ✅ | ❌ | ✅ |
| Chat History | ✅ | ❌ | ✅ |
| Web Search Fallback | ✅ | ❌ | ✅ Google |
| Streaming Response | ✅ | ❌ | ✅ |
| YAML Prompts | ✅ | ❌ | ✅ |
| Fine-tuned Models | ✅ Support | ❌ | ✅ |

---

## 📝 License

MIT License
