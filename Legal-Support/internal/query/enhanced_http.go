package query

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"

	"example.com/legallaw/internal/config"
	"example.com/legallaw/internal/graph"
)

// EnhancedHTTP provides enhanced query endpoints with streaming and chat history
type EnhancedHTTP struct {
	*HTTP
	enhancedQA *graph.EnhancedQAProvider
	cfg        config.Config
}

// NewEnhancedHTTP creates enhanced HTTP handler
func NewEnhancedHTTP(base *HTTP, cfg config.Config) *EnhancedHTTP {
	// Create enhanced QA provider
	enhancedQA := graph.NewEnhancedQAProvider(graph.EnhancedQAConfig{
		OpenAIKey:               cfg.EmbeddingAPIKey,
		GeminiKey:               "", // Add from config if needed
		Model:                   cfg.QAModel,
		CohereAPIKey:            cfg.RerankAPIKeys,
		GoogleSearchAPIKey:      cfg.GoogleSearchAPIKey,
		GoogleSearchEngineID:    cfg.GoogleSearchEngineID,
		LocalRerankerEndpoint:   cfg.LocalRerankerEndpoint,
		CrossEncoderEndpoint:    cfg.CrossEncoderEndpoint,
		MaxChatHistory:          cfg.MaxChatHistory,
		ChatHistoryTTL:          cfg.GetChatHistoryTTL(),
		EnableWebSearchFallback: cfg.EnableWebSearchFallback,
		EnableStreaming:         cfg.EnableStreaming,
	})

	return &EnhancedHTTP{
		HTTP:       base,
		enhancedQA: enhancedQA,
		cfg:        cfg,
	}
}

// EnhancedRoutes returns routes for enhanced endpoints
func (h *EnhancedHTTP) EnhancedRoutes() chi.Router {
	r := chi.NewRouter()

	// Chat endpoint with session support
	r.Post("/chat", h.handleChat)

	// Streaming chat endpoint
	r.Post("/chat/stream", h.handleChatStream)

	// Chat history management
	r.Get("/chat/history/{session_id}", h.handleGetChatHistory)
	r.Delete("/chat/history/{session_id}", h.handleClearChatHistory)

	// Web search endpoint
	r.Post("/search/web", h.handleWebSearch)

	return r
}

// ChatRequest represents a chat request
type ChatRequest struct {
	SessionID string `json:"session_id"`
	Question  string `json:"question"`
	TopK      int    `json:"top_k,omitempty"`
	Stream    bool   `json:"stream,omitempty"`
}

// ChatResponse represents a chat response
type ChatResponse struct {
	Answer    string                   `json:"answer"`
	Source    string                   `json:"source"`
	SessionID string                   `json:"session_id"`
	Context   []map[string]interface{} `json:"context,omitempty"`
	Debug     map[string]interface{}   `json:"debug,omitempty"`
}

// handleChat processes chat requests with session support
func (h *EnhancedHTTP) handleChat(w http.ResponseWriter, r *http.Request) {
	var req ChatRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	if strings.TrimSpace(req.Question) == "" {
		http.Error(w, "question is required", http.StatusBadRequest)
		return
	}

	// Generate session ID if not provided
	sessionID := req.SessionID
	if sessionID == "" {
		sessionID = generateSessionID()
	}

	ctx := r.Context()

	// Classify query first
	queryType, _ := h.enhancedQA.ClassifyQuery(ctx, req.Question)

	// Handle different query types
	switch queryType {
	case 0: // Greeting
		json.NewEncoder(w).Encode(ChatResponse{
			Answer:    h.enhancedQA.GetGreetingResponse(),
			Source:    "greeting",
			SessionID: sessionID,
		})
		return

	case 2: // Invalid
		json.NewEncoder(w).Encode(ChatResponse{
			Answer:    h.enhancedQA.GetInvalidResponse(),
			Source:    "invalid",
			SessionID: sessionID,
		})
		return
	}

	// Legal query - get context from database
	topK := req.TopK
	if topK <= 0 {
		topK = 10
	}

	// Get embedding and search
	contextStr := ""
	var contextItems []map[string]interface{}

	if h.embedder != nil {
		emb, err := h.embedder.Embed(ctx, req.Question)
		if err == nil {
			filter := graph.UnitSearchFilter{Limit: topK}
			results, _, _ := h.repo.SearchUnitsByEmbedding(ctx, emb, filter)

			for _, u := range results {
				snippet := u.Text
				if len(snippet) > 800 {
					snippet = snippet[:800] + "..."
				}
				contextStr += snippet + "\n\n"
				contextItems = append(contextItems, map[string]interface{}{
					"unit_id":        u.ID,
					"document_title": u.DocumentTitle,
					"code":           u.Code,
					"level":          u.Level,
					"snippet":        snippet[:min(200, len(snippet))],
				})
			}
		}
	}

	// Generate answer with fallback
	answer, source, err := h.enhancedQA.AnswerWithFallback(ctx, sessionID, req.Question, contextStr)
	if err != nil {
		http.Error(w, "Failed to generate answer: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	json.NewEncoder(w).Encode(ChatResponse{
		Answer:    answer,
		Source:    source,
		SessionID: sessionID,
		Context:   contextItems,
	})
}

// handleChatStream handles streaming chat requests
func (h *EnhancedHTTP) handleChatStream(w http.ResponseWriter, r *http.Request) {
	var req ChatRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	if strings.TrimSpace(req.Question) == "" {
		http.Error(w, "question is required", http.StatusBadRequest)
		return
	}

	sessionID := req.SessionID
	if sessionID == "" {
		sessionID = generateSessionID()
	}

	ctx := r.Context()

	// Create stream writer
	streamWriter, err := graph.NewHTTPStreamWriter(w)
	if err != nil {
		http.Error(w, "Streaming not supported", http.StatusInternalServerError)
		return
	}

	// Send session ID first
	streamWriter.Write(graph.StreamChunk{Content: "SESSION:" + sessionID + "\n"})

	// Get context
	topK := req.TopK
	if topK <= 0 {
		topK = 10
	}

	contextStr := ""
	if h.embedder != nil {
		emb, err := h.embedder.Embed(ctx, req.Question)
		if err == nil {
			filter := graph.UnitSearchFilter{Limit: topK}
			results, _, _ := h.repo.SearchUnitsByEmbedding(ctx, emb, filter)
			for _, u := range results {
				snippet := u.Text
				if len(snippet) > 800 {
					snippet = snippet[:800] + "..."
				}
				contextStr += snippet + "\n\n"
			}
		}
	}

	// Stream the answer
	if err := h.enhancedQA.AnswerStream(ctx, sessionID, req.Question, contextStr, streamWriter); err != nil {
		streamWriter.Write(graph.StreamChunk{Error: err.Error(), Done: true})
	}
}

// handleGetChatHistory returns chat history for a session
func (h *EnhancedHTTP) handleGetChatHistory(w http.ResponseWriter, r *http.Request) {
	sessionID := chi.URLParam(r, "session_id")
	if sessionID == "" {
		http.Error(w, "session_id is required", http.StatusBadRequest)
		return
	}

	limit := parseIntDefault(r.URL.Query().Get("limit"), 20)
	history := h.enhancedQA.GetChatHistory(sessionID, limit)

	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"session_id": sessionID,
		"messages":   history,
	})
}

// handleClearChatHistory clears chat history for a session
func (h *EnhancedHTTP) handleClearChatHistory(w http.ResponseWriter, r *http.Request) {
	sessionID := chi.URLParam(r, "session_id")
	if sessionID == "" {
		http.Error(w, "session_id is required", http.StatusBadRequest)
		return
	}

	h.enhancedQA.ClearChatHistory(sessionID)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":    true,
		"session_id": sessionID,
	})
}

// WebSearchRequest represents a web search request
type WebSearchRequest struct {
	Query      string `json:"query"`
	NumResults int    `json:"num_results,omitempty"`
}

// handleWebSearch performs web search
func (h *EnhancedHTTP) handleWebSearch(w http.ResponseWriter, r *http.Request) {
	var req WebSearchRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	if strings.TrimSpace(req.Query) == "" {
		http.Error(w, "query is required", http.StatusBadRequest)
		return
	}

	results, err := h.enhancedQA.SearchWeb(r.Context(), req.Query)
	if err != nil {
		http.Error(w, "Search failed: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"query":   req.Query,
		"results": results,
	})
}

// generateSessionID generates a unique session ID
func generateSessionID() string {
	return time.Now().Format("20060102150405") + "-" + randomString(8)
}

// randomString generates a random string of given length
func randomString(n int) string {
	const letters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	b := make([]byte, n)
	for i := range b {
		b[i] = letters[time.Now().UnixNano()%int64(len(letters))]
		time.Sleep(1 * time.Nanosecond)
	}
	return string(b)
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
