package query

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"

	"example.com/legallaw/internal/ai/llm"
	"example.com/legallaw/internal/config"
	"example.com/legallaw/internal/service/chat"
)

// EnhancedHTTP provides enhanced query endpoints with streaming and chat history
type EnhancedHTTP struct {
	*HTTP
	chatService *chat.Service
	cfg         config.Config
}

// NewEnhancedHTTP creates enhanced HTTP handler
func NewEnhancedHTTP(base *HTTP, chatService *chat.Service, cfg config.Config) *EnhancedHTTP {
	return &EnhancedHTTP{
		HTTP:        base,
		chatService: chatService,
		cfg:         cfg,
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

	answer, source, contextItems, err := h.chatService.ProcessChat(r.Context(), sessionID, req.Question, req.TopK)
	if err != nil {
		http.Error(w, "Failed to process chat: "+err.Error(), http.StatusInternalServerError)
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
	streamWriter, err := llm.NewHTTPStreamWriter(w)
	if err != nil {
		http.Error(w, "Streaming not supported", http.StatusInternalServerError)
		return
	}

	// Send session ID first
	streamWriter.Write(llm.StreamChunk{Content: "SESSION:" + sessionID + "\n"})

	// Get context
	contextStr, _, _ := h.chatService.RetrieveContext(ctx, req.Question, req.TopK)

	// Stream the answer
	if err := h.chatService.AnswerStream(ctx, sessionID, req.Question, contextStr, streamWriter); err != nil {
		streamWriter.Write(llm.StreamChunk{Error: err.Error(), Done: true})
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
	history := h.chatService.GetChatHistory(sessionID, limit)

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

	h.chatService.ClearChatHistory(sessionID)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":    true,
		"session_id": sessionID,
	})
}

// WebSearchRequest represents a web search request
type WebSearchRequest struct {
	Query string `json:"query"`
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

	results, err := h.chatService.SearchWeb(r.Context(), req.Query)
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
