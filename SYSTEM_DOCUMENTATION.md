# 📚 TÀI LIỆU HỆ THỐNG TRỢ LÝ PHÁP LUẬT VIỆT NAM

> **Phiên bản:** 1.0  
> **Ngày cập nhật:** 11/01/2026  
> **Mô tả:** Tài liệu tổng hợp toàn bộ logic và hệ thống hoạt động của Frontend, Backend, Database (Neon/Railway)

---

## 📋 MỤC LỤC

1. [Tổng Quan Hệ Thống](#1-tổng-quan-hệ-thống)
2. [Kiến Trúc Hệ Thống](#2-kiến-trúc-hệ-thống)
3. [Frontend (Legal-Frontend)](#3-frontend-legal-frontend)
4. [Backend (Legal-Support)](#4-backend-legal-support)
5. [Database Schema](#5-database-schema)
6. [Deployment (Railway & Neon)](#6-deployment-railway--neon)
7. [Luồng Dữ Liệu & API](#7-luồng-dữ-liệu--api)
8. [Các Services Chi Tiết](#8-các-services-chi-tiết)
9. [Configuration](#9-configuration)

---

## 1. TỔNG QUAN HỆ THỐNG

### 1.1 Mục đích
Hệ thống Trợ lý Pháp luật Việt Nam (Vietnam Legal Assistant) là một ứng dụng AI hỗ trợ tra cứu và tư vấn pháp luật Việt Nam, bao gồm:
- **Chatbot AI** trả lời câu hỏi pháp luật
- **Knowledge Graph** lưu trữ tri thức pháp luật dạng triple (Subject-Relation-Object)
- **RAG (Retrieval Augmented Generation)** tìm kiếm ngữ nghĩa
- **Voice Interface** hỗ trợ giọng nói (STT/TTS)

### 1.2 Công nghệ sử dụng

| Thành phần | Công nghệ |
|-----------|-----------|
| Frontend | React 18, TypeScript, Vite, TailwindCSS, Ant Design |
| Backend | Go 1.23, Chi Router, pgx (PostgreSQL driver) |
| Database | PostgreSQL 15 + pgvector (Neon Database) |
| AI/LLM | Google Gemini, Groq (LLaMA), OpenAI |
| Embedding | Google Gemini Embedding, OpenAI text-embedding-3-small |
| NLP | Vietnamese NLP Service (FastAPI + PyVi) |
| Deployment | Railway (Backend), Vercel/Local (Frontend) |
| Mobile | Android WebView (Capacitor) |

---

## 2. KIẾN TRÚC HỆ THỐNG

```
┌──────────────────────────────────────────────────────────────────────────┐
│                           CLIENT LAYER                                    │
├──────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐       │
│  │   Web Browser   │    │  Android App    │    │   Admin Panel   │       │
│  │  (React + Vite) │    │   (WebView)     │    │  (React Routes) │       │
│  └────────┬────────┘    └────────┬────────┘    └────────┬────────┘       │
│           │                      │                      │                │
└───────────┼──────────────────────┼──────────────────────┼────────────────┘
            │                      │                      │
            └──────────────────────┼──────────────────────┘
                                   │ HTTPS
                                   ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                         GATEWAY LAYER (Railway)                          │
├──────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    API Gateway (:8000)                           │    │
│  │  - Route /api/v1/query/*     → API Service                      │    │
│  │  - Route /api/v1/auth/*      → Auth Service                     │    │
│  │  - Route /api/v1/law/*       → Law Service                      │    │
│  │  - Route /api/v1/query/recommend → Recommendation Service       │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────────┘
                                   │
            ┌──────────────────────┼──────────────────────┐
            │                      │                      │
            ▼                      ▼                      ▼
┌────────────────────┐ ┌────────────────────┐ ┌────────────────────┐
│   API Service      │ │   Auth Service     │ │   Law Service      │
│   (:8080)          │ │   (:8083)          │ │   (:8084)          │
│                    │ │                    │ │                    │
│ - Query Processing │ │ - Login/Register   │ │ - Document CRUD    │
│ - RAG Search       │ │ - JWT Token        │ │ - Unit Management  │
│ - Chat History     │ │ - Refresh Token    │ │ - VBPL Integration │
│ - Streaming        │ │ - User Management  │ │                    │
└─────────┬──────────┘ └─────────┬──────────┘ └─────────┬──────────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                        DATA LAYER (Neon Database)                         │
├──────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │              PostgreSQL 15 + pgvector Extension                  │    │
│  │                                                                  │    │
│  │  Tables:                                                         │    │
│  │  - users, refresh_tokens (Auth)                                  │    │
│  │  - documents, units (Legal Content)                              │    │
│  │  - concepts, relations, triples (Knowledge Graph)                │    │
│  │  - unit_embeddings (Vector Search)                               │    │
│  │  - citations (Document Relations)                                │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                         AI/NLP SERVICES                                   │
├──────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐       │
│  │  NLP Service     │  │  Embedding       │  │  LLM Provider    │       │
│  │  (FastAPI:8090)  │  │  (Gemini/OpenAI) │  │  (Groq/Gemini)   │       │
│  │                  │  │                  │  │                  │       │
│  │ - Tokenize VN    │  │ - text-embedding │  │ - llama-3.3-70b  │       │
│  │ - Classify Query │  │ - embedding-001  │  │ - gemini-1.5     │       │
│  │ - Extract Entity │  │                  │  │ - gpt-4o-mini    │       │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘       │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 3. FRONTEND (Legal-Frontend)

### 3.1 Cấu trúc thư mục

```
Legal-Frontend/
├── src/
│   ├── App.tsx                 # Main router
│   ├── api.ts                  # Legacy API calls
│   ├── config.ts               # Backend URL configuration
│   ├── main.tsx                # Entry point
│   ├── types.ts                # TypeScript types
│   │
│   ├── components/
│   │   ├── AssistantPageEnhanced.tsx  # Main chat interface
│   │   ├── AuthContext.tsx            # Authentication context
│   │   ├── ProtectedRoute.tsx         # Route protection
│   │   ├── LoginPage.tsx              # Login form
│   │   ├── DashboardPage.tsx          # Dashboard
│   │   ├── DocumentBrowserPage.tsx    # Document viewer
│   │   ├── KnowledgeGraphPage.tsx     # Graph visualization
│   │   └── assistant/                 # Chat components
│   │       ├── ChatLayout.tsx
│   │       ├── WelcomeScreen.tsx
│   │       └── ...
│   │
│   ├── hooks/
│   │   ├── useAssistantChat.ts        # Chat logic hook
│   │   ├── useAndroidBridge.ts        # Android WebView bridge
│   │   ├── useSpeechRecognition.ts    # Voice input
│   │   ├── useAvatarAudio.ts          # TTS output
│   │   └── useNavigationIntent.ts     # Navigation detection
│   │
│   ├── services/
│   │   ├── authService.ts             # Authentication API
│   │   ├── lawService.ts              # Legal documents API
│   │   ├── legalService.ts            # Query/RAG API
│   │   └── audioService.ts            # Audio handling
│   │
│   └── pages/
│       ├── PhapDienPage.tsx           # Pháp điển viewer
│       ├── VBPLPage.tsx               # VBPL documents
│       └── UsersPage.tsx              # User management
│
├── .env.production              # Production config (Railway)
├── package.json
├── vite.config.ts
└── tailwind.config.cjs
```

### 3.2 Routes & Pages

```typescript
// App.tsx - Main Routes
<Routes>
  <Route element={<AppLayout />}>
    <Route path="/" element={<Navigate to="/assistant" replace />} />
    <Route path="/assistant" element={<ProtectedRoute><AssistantPageEnhanced /></ProtectedRoute>} />
    <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
    <Route path="/phapdien" element={<ProtectedRoute><PhapDienPage /></ProtectedRoute>} />
    <Route path="/vbpl" element={<ProtectedRoute><VBPLPage /></ProtectedRoute>} />
    <Route path="/documents" element={<ProtectedRoute><DocumentBrowserPage /></ProtectedRoute>} />
    <Route path="/graph" element={<ProtectedRoute><KnowledgeGraphPage /></ProtectedRoute>} />
    <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
    <Route path="/users" element={<ProtectedRoute requiredRole="admin"><UsersPage /></ProtectedRoute>} />
  </Route>
  <Route path="/login" element={<LoginPage />} />
</Routes>
```

### 3.3 Backend URL Configuration

```typescript
// config.ts
// Railway production backend URL (for mobile app)
const RAILWAY_BACKEND_URL = 'https://legal-production-c091.up.railway.app';

// Docker/Local development backend URL (for web)
const LOCAL_BACKEND_URL = 'http://localhost:8080';

export const getBackendUrl = (): string => {
    // 1. Runtime override from Android native
    if (typeof window !== 'undefined' && (window as any).__BACKEND_URL__) {
        return (window as any).__BACKEND_URL__;
    }

    const platform = getPlatform();
    const envUrl = import.meta.env.VITE_BACKEND_URL;

    // 2. On Android/mobile, ALWAYS use Railway production
    if (platform === 'android') {
        return RAILWAY_BACKEND_URL;
    }

    // 3. Use env variable or default to local
    return envUrl || LOCAL_BACKEND_URL;
};
```

### 3.4 Authentication Flow

```typescript
// authService.ts
type TokenBundle = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at: number;
};

// Login flow
async login({ email, password }) {
  const res = await fetch(`${AUTH_BASE}/login`, {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  return saveTokens(data); // Store in localStorage
}

// Auto-refresh expired tokens
async getValidAccessToken(): Promise<string | null> {
  const tokens = loadTokens();
  if (!tokens) return null;
  
  if (tokens.expires_at > Date.now()) {
    return tokens.access_token;
  }
  
  // Token expired, refresh it
  const refreshed = await this.refresh();
  return refreshed.access_token;
}
```

### 3.5 Chat Assistant Logic

```typescript
// useAssistantChat.ts - Main chat hook
const handleSendMessage = async (textOverride?: string) => {
  const textToSend = textOverride || inputText;
  
  // 1. Check for navigation intent
  const navResult = checkNavigationIntent(textToSend);
  if (navResult.isNavigation) {
    // Handle map navigation
    setNavigationDestination(navResult.location);
    return;
  }

  // 2. Send to backend
  const response = await queryLegalAssistant(textToSend);
  
  // 3. Display response
  const botMsg: Message = {
    id: Date.now().toString(),
    role: 'assistant',
    text: response.text,
    sources: response.sources,
    triples: response.triples
  };
  setMessages(prev => [...prev, botMsg]);

  // 4. Text-to-Speech
  speak(botMsg.text);
};
```

### 3.6 Legal Service (RAG Query)

```typescript
// legalService.ts
export const queryLegalAssistant = async (query: string) => {
  const res = await fetch(`${BASE_URL}/query/rag`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ 
      question: query, 
      top_k: 15, 
      answer: true  // Request LLM-generated answer
    }),
  });

  const data = await res.json();
  // data.answer = LLM response
  // data.items = Retrieved context documents
  
  return {
    text: data.answer,
    sources: extractSources(data.items)
  };
};
```

---

## 4. BACKEND (Legal-Support)

### 4.1 Cấu trúc thư mục

```
Legal-Support/
├── cmd/
│   ├── api/main.go              # Main API service
│   ├── gateway/main.go          # API Gateway
│   ├── auth/main.go             # Auth service
│   ├── law/main.go              # Law service
│   └── recommendation/main.go   # Recommendation service
│
├── internal/
│   ├── ai/
│   │   ├── embedding/           # Embedding providers
│   │   │   ├── gemini.go
│   │   │   └── openai.go
│   │   ├── llm/                 # LLM providers
│   │   │   ├── groq.go
│   │   │   ├── gemini.go
│   │   │   └── openai.go
│   │   ├── nlp/                 # NLP client
│   │   │   └── client.go
│   │   ├── search/              # Reranking
│   │   │   └── hybrid_reranker.go
│   │   └── prompt/              # Prompt management
│   │       └── manager.go
│   │
│   ├── auth/
│   │   ├── handler.go           # HTTP handlers
│   │   ├── service.go           # Business logic
│   │   ├── repository.go        # DB operations
│   │   └── middleware.go        # JWT middleware
│   │
│   ├── config/
│   │   └── config.go            # Configuration loader
│   │
│   ├── db/
│   │   └── db.go                # PostgreSQL connection
│   │
│   ├── model/
│   │   └── models.go            # Data models
│   │
│   ├── query/
│   │   ├── http.go              # Query HTTP handlers
│   │   └── enhanced_http.go     # Streaming handlers
│   │
│   ├── repository/
│   │   └── repository.go        # Main repository (1297 lines)
│   │
│   └── service/
│       ├── chat/
│       │   └── service.go       # Chat with history
│       ├── query/
│       │   └── service.go       # Query processing
│       └── ingest/
│           └── service.go       # Data ingestion
│
├── migrations/
│   ├── 0001_init.sql            # Users table
│   ├── 0002_legal.sql           # Legal schema
│   ├── 0003_auth.sql            # Auth schema
│   └── 0005_embeddings.sql      # Vector embeddings
│
├── nlp-service/
│   ├── main.py                  # FastAPI NLP service
│   └── requirements.txt
│
├── docker-compose.yml
└── go.mod
```

### 4.2 API Gateway

```go
// cmd/gateway/main.go
func main() {
    apiTarget := getenv("API_URL", "http://api:8080")
    recTarget := getenv("RECOMMEND_URL", "http://recommendation:8080")
    authTarget := getenv("AUTH_URL", "http://auth:8080")
    lawTarget := getenv("LAW_URL", "http://law:8080")

    mux := http.NewServeMux()

    // Route mapping
    mux.HandleFunc("/api/v1/query/recommend", recProxy.ServeHTTP)
    mux.HandleFunc("/api/v1/auth/", authProxy.ServeHTTP)
    mux.HandleFunc("/api/v1/law/", lawProxy.ServeHTTP)
    mux.HandleFunc("/", apiProxy.ServeHTTP)  // Fallback to main API

    http.ListenAndServe(":8000", mux)
}
```

### 4.3 Main API Service

```go
// cmd/api/main.go
func main() {
    cfg := config.Load()
    pool, _ := db.Connect(ctx, cfg.DatabaseURL)

    // Initialize providers
    embedder := embedding.NewGeminiEmbeddingProvider(cfg.EmbeddingAPIKey, cfg.EmbeddingModel)
    
    switch cfg.QAProvider {
    case "groq":
        qa = llm.NewGroqQAProvider(cfg.GroqAPIKey, cfg.QAModel)
    case "openai":
        qa = llm.NewOpenAIQAProvider(cfg.EmbeddingAPIKey, cfg.QAModel)
    default:
        qa = llm.NewGeminiQAProvider(cfg.EmbeddingAPIKey, cfg.QAModel)
    }

    // Routes
    r := chi.NewRouter()
    r.Use(middleware.Logger, corsMiddleware())
    
    auth.RegisterChiRoutes(r, authService)
    r.Mount("/api/v1/query", queryHTTP.Routes())
    r.Mount("/api/v2/chat", enhancedHTTP.EnhancedRoutes())
}
```

### 4.4 Query Processing Pipeline

```go
// internal/service/query/service.go
func (s *Service) ProcessQuery(ctx context.Context, queryText string, includeDebug bool) (*model.QueryResult, error) {
    
    // Step 0a: Classify Query (greeting/legal/invalid)
    classification, _ := s.classifyQuery(ctx, queryText)
    if classification.Category == 0 {
        return greetingResponse(), nil
    }

    // Step 0b: Extract entities (year, doc_type, keywords)
    entities, _ := s.nlpClient.ExtractEntities(ctx, queryText)

    // Step 0c: Rewrite Query (expand variations)
    queries, _ := s.qaProvider.RewriteQuery(ctx, queryText)
    // Also expand using NLP service
    expanded, _ := s.nlpClient.ExpandQuery(ctx, queryText, 3)

    // Step 1: Extract key terms (Vietnamese tokenization)
    terms := s.extractQueryTermsWithNLP(ctx, queryText)

    // Step 2: Find concept candidates
    candidates, _ := s.findAllCandidates(ctx, terms)

    // Step 3: Build query stars (S-R-O patterns)
    stars := s.buildQueryStars(candidates)

    // Step 4: Execute stars to find matching triples
    for i := range stars {
        triples, _ := s.repo.FindTriplesByStar(ctx, stars[i])
        stars[i].MatchingTriples = triples
    }

    // Step 5: Combine and rank results
    answers := s.combineAndRankResults(stars, queryText)

    // Step 6: AI Reranking (Cohere/Local)
    if s.reranker != nil {
        rerankResults, _ := s.reranker.Rerank(ctx, queryText, docs)
        // Re-sort by relevance score
    }

    return &model.QueryResult{Answers: answers}, nil
}
```

### 4.5 RAG (Retrieval Augmented Generation)

```go
// internal/query/http.go - RAG endpoint
func (h *HTTP) handleRAG(w http.ResponseWriter, r *http.Request) {
    var req model.RagRequest
    json.NewDecoder(r.Body).Decode(&req)

    // 1. Generate embedding for question
    embedding, _ := h.embedder.Embed(ctx, req.Question)

    // 2. Semantic search using pgvector
    results, _ := h.repo.SemanticSearch(ctx, embedding, req.TopK, filters)

    // 3. Generate answer using LLM (if requested)
    if req.Answer {
        context := buildContext(results)
        answer, _ := h.qa.Answer(ctx, req.Question, context)
        response.Answer = answer
    }

    json.NewEncoder(w).Encode(response)
}
```

### 4.6 Authentication System

```go
// internal/auth/service.go
type Service interface {
    Register(ctx context.Context, req RegisterRequest) (*AuthResponse, error)
    Login(ctx context.Context, req LoginRequest) (*AuthResponse, error)
    Refresh(ctx context.Context, refreshToken string) (*AuthResponse, error)
}

// JWT Token generation
func (s *service) generateTokens(user *User) (*AuthResponse, error) {
    claims := jwt.MapClaims{
        "sub":   user.ID.String(),
        "email": user.Email,
        "role":  user.Role,
        "exp":   time.Now().Add(15 * time.Minute).Unix(),
    }
    
    accessToken := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
    access, _ := accessToken.SignedString([]byte(s.jwtSecret))

    refresh := uuid.New().String()
    s.repo.CreateRefreshToken(ctx, refresh, user.ID, 7*24*time.Hour)

    return &AuthResponse{
        AccessToken:  access,
        RefreshToken: refresh,
        ExpiresIn:    900,
    }, nil
}
```

### 4.7 LLM Providers

```go
// Groq Provider (LLaMA 3.3 70B)
type GroqQAProvider struct {
    client *openai.Client
    model  string  // "llama-3.3-70b-versatile"
}

func (p *GroqQAProvider) Answer(ctx context.Context, question, context string) (string, error) {
    resp, _ := p.client.CreateChatCompletion(ctx, openai.ChatCompletionRequest{
        Model: p.model,
        Messages: []openai.ChatCompletionMessage{
            {Role: "system", Content: LegalAnswerSystemPrompt},
            {Role: "user", Content: buildPrompt(question, context)},
        },
        Temperature: 0.2,
        MaxTokens:   2000,
    })
    return resp.Choices[0].Message.Content, nil
}

// Gemini Provider
type GeminiQAProvider struct {
    apiKey string
    model  string  // "gemini-1.5-flash"
}

// OpenAI Provider
type OpenAIQAProvider struct {
    client *openai.Client
    model  string  // "gpt-4o-mini"
}
```

### 4.8 NLP Service (Vietnamese)

```python
# nlp-service/main.py
from fastapi import FastAPI
from pyvi import ViTokenizer

app = FastAPI(title="Vietnamese NLP Service")

@app.post("/tokenize")
async def tokenize(request: TokenizeRequest):
    """Tokenize Vietnamese text using pyvi"""
    tokenized = ViTokenizer.tokenize(request.text)
    return {"tokens": tokenized.split()}

@app.post("/classify")
async def classify_query(request: ClassifyRequest):
    """Classify query as greeting/legal/invalid"""
    query_lower = request.query.lower()
    
    # Check greeting keywords
    for kw in GREETING_KEYWORDS:
        if kw in query_lower:
            return {"category": 0, "confidence": 0.9}
    
    # Check legal keywords
    for kw in LEGAL_KEYWORDS:
        if kw in query_lower:
            return {"category": 1, "confidence": 0.8}
    
    return {"category": 2, "confidence": 0.5}

@app.post("/extract_entities")
async def extract_entities(request: ExtractEntitiesRequest):
    """Extract legal entities from query"""
    # Extract year, document type, article numbers, etc.
    return {
        "year": extract_year(query),
        "document_type": extract_doc_type(query),
        "article": extract_article(query),
        "keywords": extract_keywords(query)
    }
```

---

## 5. DATABASE SCHEMA

### 5.1 Overview

```
┌──────────────────────────────────────────────────────────────────────────┐
│                      NEON DATABASE (PostgreSQL 15)                        │
│                         + pgvector extension                              │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────────────┐        │
│  │   users     │     │  documents  │────▶│       units         │        │
│  │             │     │             │     │                     │        │
│  │ - id (UUID) │     │ - id        │     │ - id                │        │
│  │ - email     │     │ - title     │     │ - document_id (FK)  │        │
│  │ - password  │     │ - type      │     │ - level             │        │
│  │ - role      │     │ - number    │     │ - code              │        │
│  └──────┬──────┘     │ - year      │     │ - text              │        │
│         │            │ - authority │     │ - parent_id         │        │
│         │            │ - status    │     └──────────┬──────────┘        │
│         ▼            └─────────────┘                │                   │
│  ┌─────────────┐                                    │                   │
│  │  refresh_   │                                    ▼                   │
│  │  tokens     │            ┌─────────────────────────────────────┐     │
│  │             │            │           unit_embeddings           │     │
│  │ - token     │            │                                     │     │
│  │ - user_id   │            │ - unit_id (FK)                      │     │
│  │ - expires   │            │ - embedding vector(768)             │     │
│  └─────────────┘            │ - model                             │     │
│                             └─────────────────────────────────────┘     │
│                                                                          │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────────────┐        │
│  │  concepts   │     │  relations  │     │       triples       │        │
│  │             │     │             │     │                     │        │
│  │ - id        │◀────│ - id        │────▶│ - subject_id (FK)   │        │
│  │ - name      │     │ - name      │     │ - relation_id (FK)  │        │
│  │ - synonyms  │     │ - keywords  │     │ - object_id (FK)    │        │
│  │ - keywords  │     │ - type      │     │ - unit_id (FK)      │        │
│  │ - type      │     │             │     │ - doc_ref           │        │
│  └─────────────┘     └─────────────┘     │ - confidence        │        │
│                                          │ - tfidf             │        │
│                                          └─────────────────────┘        │
└──────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Table Definitions

```sql
-- 0001_init.sql: Users
CREATE TABLE users(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  password_hash TEXT,
  role TEXT DEFAULT 'user',  -- 'user' | 'admin'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 0002_legal.sql: Legal Documents
CREATE TABLE documents(
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  type TEXT NOT NULL,      -- law, decree, circular, etc.
  number TEXT,             -- document number (e.g., "45/2019/QH14")
  year INTEGER,
  authority TEXT,          -- issuing authority
  status TEXT DEFAULT 'active',  -- active, superseded, repealed
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Legal Units (articles, clauses)
CREATE TABLE units(
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  level TEXT NOT NULL,     -- article, clause, point, section
  code TEXT,               -- "Điều 15", "Khoản 1", "Điểm a"
  text TEXT NOT NULL,      -- actual legal text content
  parent_id UUID REFERENCES units(id),  -- hierarchical structure
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Knowledge Graph: Concepts
CREATE TABLE concepts(
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  synonyms TEXT[] DEFAULT '{}',
  keywords TEXT[] DEFAULT '{}',
  concept_type TEXT DEFAULT 'general',  -- entity, action, condition, penalty
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Knowledge Graph: Relations
CREATE TABLE relations(
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  keywords TEXT[] DEFAULT '{}',
  relation_type TEXT DEFAULT 'general',  -- requires, prohibits, defines, penalizes
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Knowledge Graph: Triples (S-R-O)
CREATE TABLE triples(
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_id UUID REFERENCES concepts(id) ON DELETE CASCADE,
  relation_id UUID REFERENCES relations(id) ON DELETE CASCADE,
  object_id UUID REFERENCES concepts(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES units(id) ON DELETE CASCADE,
  doc_ref TEXT NOT NULL,           -- human readable reference
  confidence REAL DEFAULT 1.0,     -- confidence score
  tfidf REAL DEFAULT 0.0,          -- TF-IDF ranking score
  is_blacklisted BOOLEAN DEFAULT FALSE,
  context TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 0005_embeddings.sql: Vector Embeddings
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE unit_embeddings (
  unit_id UUID PRIMARY KEY REFERENCES units(id) ON DELETE CASCADE,
  embedding vector(768) NOT NULL,  -- 768-dimensional vector
  model TEXT NOT NULL,             -- embedding model used
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- IVFFlat index for fast similarity search
CREATE INDEX idx_unit_embeddings_embedding 
  ON unit_embeddings USING ivfflat (embedding vector_cosine_ops) 
  WITH (lists = 100);
```

### 5.3 Key Indexes

```sql
-- Full-text search
CREATE INDEX idx_units_text_search ON units USING gin(to_tsvector('english', text));

-- Trigram similarity for fuzzy matching
CREATE INDEX idx_concepts_name_trgm ON concepts USING gin (name gin_trgm_ops);
CREATE INDEX idx_concepts_name_lower_trgm ON concepts USING gin (LOWER(name) gin_trgm_ops);

-- Array search for synonyms/keywords
CREATE INDEX idx_concepts_synonyms ON concepts USING gin(synonyms);
CREATE INDEX idx_concepts_keywords ON concepts USING gin(keywords);

-- Triple lookups
CREATE INDEX idx_triples_sro ON triples(subject_id, relation_id, object_id);
CREATE INDEX idx_triples_tfidf ON triples(tfidf DESC NULLS LAST);
```

---

## 6. DEPLOYMENT (Railway & Neon)

### 6.1 Railway Deployment

```
┌──────────────────────────────────────────────────────────────────────────┐
│                           RAILWAY PLATFORM                                │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Production URL: https://legal-production-c091.up.railway.app            │
│                                                                          │
│  Services:                                                               │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  gateway        → Port 8000 (Public)                            │    │
│  │  api            → Port 8080 (Internal)                          │    │
│  │  auth           → Port 8083 (Internal)                          │    │
│  │  law            → Port 8084 (Internal)                          │    │
│  │  recommendation → Port 8082 (Internal)                          │    │
│  │  nlp-service    → Port 8090 (Internal)                          │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  Environment Variables (Railway):                                        │
│  - DATABASE_URL: postgres://...@ep-xxx.neon.tech/legaldb                │
│  - EMBEDDING_API_KEY: <Google AI API Key>                               │
│  - EMBEDDING_MODEL: embedding-001                                        │
│  - EMBEDDING_PROVIDER: gemini                                            │
│  - QA_MODEL: llama-3.3-70b-versatile                                    │
│  - QA_PROVIDER: groq                                                     │
│  - GROQ_API_KEY: <Groq API Key>                                         │
│  - JWT_SECRET: <secret>                                                  │
│  - NLP_SERVICE_URL: http://nlp-service:8090                             │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Neon Database

```
┌──────────────────────────────────────────────────────────────────────────┐
│                           NEON DATABASE                                   │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Connection String:                                                      │
│  postgres://legaluser:****@ep-xxx.neon.tech/legaldb?sslmode=require     │
│                                                                          │
│  Features:                                                               │
│  - PostgreSQL 15                                                         │
│  - pgvector extension (vector similarity search)                         │
│  - pg_trgm extension (trigram similarity)                               │
│  - uuid-ossp extension (UUID generation)                                │
│  - Automatic scaling (serverless)                                        │
│  - Connection pooling                                                    │
│                                                                          │
│  Extensions enabled:                                                     │
│  - CREATE EXTENSION IF NOT EXISTS "uuid-ossp";                          │
│  - CREATE EXTENSION IF NOT EXISTS "pg_trgm";                            │
│  - CREATE EXTENSION IF NOT EXISTS vector;                               │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### 6.3 Docker Compose (Local Development)

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: pgvector/pgvector:0.8.0-pg15
    environment:
      POSTGRES_DB: legaldb
      POSTGRES_USER: legaluser
      POSTGRES_PASSWORD: legalpass
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./migrations:/docker-entrypoint-initdb.d
    ports:
      - "5433:5432"

  nlp-service:
    build: ./nlp-service
    ports:
      - "8090:8090"

  api:
    build: .
    environment:
      DATABASE_URL: postgres://legaluser:legalpass@postgres:5432/legaldb
      EMBEDDING_PROVIDER: gemini
      QA_PROVIDER: groq
      NLP_SERVICE_URL: http://nlp-service:8090
    ports:
      - "8080:8080"
    depends_on:
      - postgres
      - nlp-service

  gateway:
    build:
      dockerfile: Dockerfile.gateway
    environment:
      API_URL: http://api:8080
      AUTH_URL: http://auth:8080
      LAW_URL: http://law:8080
    ports:
      - "8000:8000"
```

---

## 7. LUỒNG DỮ LIỆU & API

### 7.1 Authentication Flow

```
┌─────────┐                    ┌─────────┐                    ┌─────────┐
│ Frontend│                    │ Gateway │                    │  Auth   │
│         │                    │         │                    │ Service │
└────┬────┘                    └────┬────┘                    └────┬────┘
     │                              │                              │
     │  POST /api/v1/auth/login    │                              │
     │  {email, password}          │                              │
     │────────────────────────────▶│                              │
     │                              │  Proxy to auth service      │
     │                              │────────────────────────────▶│
     │                              │                              │
     │                              │                              │ Validate credentials
     │                              │                              │ Generate JWT + Refresh
     │                              │                              │
     │                              │  {access_token, refresh_token, expires_in}
     │                              │◀────────────────────────────│
     │  {access_token, refresh_token}                             │
     │◀────────────────────────────│                              │
     │                              │                              │
     │  Store in localStorage       │                              │
     │                              │                              │
```

### 7.2 Query Processing Flow

```
┌─────────┐        ┌─────────┐        ┌─────────┐        ┌─────────┐        ┌─────────┐
│ Frontend│        │ Gateway │        │   API   │        │   NLP   │        │Database │
│         │        │         │        │ Service │        │ Service │        │ (Neon)  │
└────┬────┘        └────┬────┘        └────┬────┘        └────┬────┘        └────┬────┘
     │                  │                  │                  │                  │
     │  POST /api/v1/query/rag            │                  │                  │
     │  {question, top_k, answer}         │                  │                  │
     │─────────────────▶│                  │                  │                  │
     │                  │─────────────────▶│                  │                  │
     │                  │                  │                  │                  │
     │                  │                  │  Classify query  │                  │
     │                  │                  │─────────────────▶│                  │
     │                  │                  │◀─────────────────│                  │
     │                  │                  │                  │                  │
     │                  │                  │  Extract entities│                  │
     │                  │                  │─────────────────▶│                  │
     │                  │                  │◀─────────────────│                  │
     │                  │                  │                  │                  │
     │                  │                  │  Generate embedding                 │
     │                  │                  │  (Gemini API)    │                  │
     │                  │                  │                  │                  │
     │                  │                  │  Semantic search (pgvector)         │
     │                  │                  │─────────────────────────────────────▶│
     │                  │                  │◀─────────────────────────────────────│
     │                  │                  │                  │                  │
     │                  │                  │  Rerank results  │                  │
     │                  │                  │  (Cohere/Local)  │                  │
     │                  │                  │                  │                  │
     │                  │                  │  Generate answer │                  │
     │                  │                  │  (Groq LLaMA)    │                  │
     │                  │                  │                  │                  │
     │  {answer, items} │                  │                  │                  │
     │◀─────────────────│◀─────────────────│                  │                  │
     │                  │                  │                  │                  │
```

### 7.3 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| **Auth** |
| POST | `/api/v1/auth/register` | Register new user |
| POST | `/api/v1/auth/login` | Login and get tokens |
| POST | `/api/v1/auth/refresh` | Refresh access token |
| **Query** |
| POST | `/api/v1/query` | Knowledge graph query |
| POST | `/api/v1/query/rag` | RAG semantic search |
| GET | `/api/v1/query/recommend` | Get recommendations |
| GET | `/api/v1/query/units/{id}` | Get unit detail |
| GET | `/api/v1/query/units/{id}/citations` | Get unit citations |
| **Documents** |
| GET | `/api/v1/query/documents` | List documents |
| GET | `/api/v1/query/documents/{id}/units` | List units in document |
| GET | `/api/v1/query/documents/{id}/tree` | Get document hierarchy |
| **Ingest** |
| POST | `/api/v1/query/ingest` | Ingest legal content |
| **Chat (v2)** |
| POST | `/api/v2/chat/query` | Chat with history |
| POST | `/api/v2/chat/stream` | Streaming chat response |

---

## 8. CÁC SERVICES CHI TIẾT

### 8.1 Embedding Service

```go
// Gemini Embedding
type GeminiEmbeddingProvider struct {
    apiKey string
    model  string  // "embedding-001"
    client *http.Client
}

func (p *GeminiEmbeddingProvider) Embed(ctx context.Context, input string) ([]float32, error) {
    url := "https://generativelanguage.googleapis.com/v1beta/models/" + 
           p.model + ":embedContent?key=" + p.apiKey
    
    // Returns 768-dimensional vector
    return embedding, nil
}
```

### 8.2 Hybrid Reranker

```go
type HybridReranker struct {
    cohereAPIKey string
    cohereModel  string
    useRRF       bool  // Reciprocal Rank Fusion
}

func (r *HybridReranker) Rerank(ctx context.Context, query string, documents []string) ([]RerankResult, error) {
    // 1. Try Cohere API first
    if r.cohereAPIKey != "" {
        return r.cohereRerank(ctx, query, documents)
    }
    
    // 2. Fallback to RRF (Reciprocal Rank Fusion)
    return r.rrfRerank(documents)
}
```

### 8.3 Chat History Manager

```go
type ChatHistoryManager struct {
    sessions map[string]*ChatSession
    maxMsgs  int
    ttl      time.Duration
}

type ChatSession struct {
    Messages  []ChatMessage
    CreatedAt time.Time
    UpdatedAt time.Time
}

func (m *ChatHistoryManager) AddMessage(sessionID string, role, content string) {
    session := m.getOrCreate(sessionID)
    session.Messages = append(session.Messages, ChatMessage{
        Role:    role,
        Content: content,
        Time:    time.Now(),
    })
    
    // Trim to max messages
    if len(session.Messages) > m.maxMsgs {
        session.Messages = session.Messages[len(session.Messages)-m.maxMsgs:]
    }
}
```

### 8.4 Knowledge Graph Query

```go
// FindTriplesByStar finds triples matching a Subject-Relation-Object pattern
func (r *Repository) FindTriplesByStar(ctx context.Context, star QueryStar) ([]TripleView, error) {
    query := `
        SELECT t.*, 
               s.name as subject_name,
               rel.name as relation_name,
               o.name as object_name,
               u.text as unit_text,
               d.title as document_title
        FROM triples t
        JOIN concepts s ON t.subject_id = s.id
        JOIN relations rel ON t.relation_id = rel.id
        JOIN concepts o ON t.object_id = o.id
        JOIN units u ON t.unit_id = u.id
        JOIN documents d ON u.document_id = d.id
        WHERE t.is_blacklisted = false
          AND (
            ($1::uuid IS NULL OR t.subject_id = $1)
            AND ($2::uuid IS NULL OR t.relation_id = $2)
            AND ($3::uuid IS NULL OR t.object_id = $3)
          )
        ORDER BY t.tfidf DESC, t.confidence DESC
        LIMIT 50`
    
    return r.queryTriples(ctx, query, star.SubjectID, star.RelationID, star.ObjectID)
}
```

---

## 9. CONFIGURATION

### 9.1 Backend Configuration (config.go)

```go
type Config struct {
    // Server
    HTTPPort    string  // default: "8080"
    DatabaseURL string  // Neon connection string
    JWTSecret   string
    
    // Embedding
    EmbeddingEnabled  bool    // default: true
    EmbeddingAPIKey   string  // Google AI API key
    EmbeddingModel    string  // "embedding-001"
    EmbeddingProvider string  // "gemini" | "openai"
    
    // LLM
    QAModel    string  // "llama-3.3-70b-versatile"
    QAProvider string  // "groq" | "gemini" | "openai"
    GroqAPIKey string
    
    // Reranking
    RerankAPIKeys string  // Cohere API key
    RerankModel   string  // "rerank-v3.5"
    
    // NLP
    NLPServiceURL string  // "http://nlp-service:8090"
    
    // Enhanced Features
    EnableStreaming         bool  // default: true
    EnableWebSearchFallback bool  // default: false
    MaxChatHistory          int   // default: 20
    ChatHistoryTTLMinutes   int   // default: 120
    
    // External APIs
    GoogleSearchAPIKey   string
    GoogleSearchEngineID string
}
```

### 9.2 Frontend Environment Variables

```env
# .env.local (Development)
VITE_BACKEND_URL=http://localhost:8080

# .env.production (Production)
VITE_BACKEND_URL=https://legal-production-c091.up.railway.app
```

### 9.3 LLM Prompt Configuration

```yaml
# prompts.yaml
legal_answer_system: |
  ### ROLE:
  Bạn là Trợ lý Pháp luật Việt Nam với hơn 30 năm kinh nghiệm chuyên môn.

  ### TASKS:
  Trả lời câu hỏi của người dùng về pháp luật Việt Nam dựa trên nội dung tham khảo.

  ### HƯỚNG DẪN:
  1. **TRẢ LỜI TRỰC TIẾP VÀO VẤN ĐỀ**
  2. Nếu hỏi về tội phạm → Nêu rõ MỨC HÌNH PHẠT
  3. Trích dẫn nguồn: Ghi rõ (Điều X, Luật Y)
  4. Nếu context không đủ: "Xin lỗi bạn. Kiến thức này nằm ngoài phạm vi..."

query_rewrite_system: |
  ### ROLE:
  Bạn là trợ lý AI chuyên về pháp luật Việt Nam.

  ### TASKS:
  Từ câu hỏi gốc, tạo ra **3 câu truy vấn mới** để cải thiện khả năng tìm kiếm.
```

---

## 10. TỔNG KẾT

### 10.1 Tech Stack Summary

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + TypeScript + Vite + TailwindCSS |
| Mobile | Android WebView (Capacitor) |
| Backend | Go 1.23 + Chi Router |
| Database | PostgreSQL 15 + pgvector (Neon) |
| LLM | Groq (LLaMA 3.3 70B) / Google Gemini |
| Embedding | Google Gemini embedding-001 |
| NLP | FastAPI + PyVi (Vietnamese tokenization) |
| Reranking | Cohere rerank-v3.5 |
| Deployment | Railway (Backend), Vercel (Frontend) |

### 10.2 Key Features

1. **Knowledge Graph Query** - S-R-O triple matching
2. **RAG (Retrieval Augmented Generation)** - Semantic search + LLM
3. **Chat with History** - Session-based conversation
4. **Voice Interface** - STT/TTS support
5. **Vietnamese NLP** - Tokenization, entity extraction
6. **Multi-provider LLM** - Groq, Gemini, OpenAI
7. **Hybrid Reranking** - Cohere + RRF fallback

### 10.3 API Summary

```
Authentication:  POST /api/v1/auth/{login,register,refresh}
Query:          POST /api/v1/query, POST /api/v1/query/rag
Documents:      GET  /api/v1/query/documents
Units:          GET  /api/v1/query/units/{id}
Chat:           POST /api/v2/chat/query (with streaming)
```

---

**© 2026 Vietnam Legal Assistant System**
