package chat

import (
	"encoding/json"
	"fmt"
	"net/http"

	"example.com/legallaw/internal/auth"
	"example.com/legallaw/internal/repository"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type HTTP struct {
	repo *repository.Repository
}

func NewHTTP(db *pgxpool.Pool) *HTTP {
	return &HTTP{
		repo: repository.NewRepository(db),
	}
}

func (h *HTTP) Routes() chi.Router {
	r := chi.NewRouter()

	// Chat sessions
	r.Post("/sessions", h.createSession)
	r.Get("/sessions", h.getUserSessions)
	r.Get("/sessions/{id}", h.getSession)
	r.Delete("/sessions/{id}", h.deleteSession)
	r.Put("/sessions/{id}/title", h.updateSessionTitle)

	// Chat messages
	r.Post("/sessions/{id}/messages", h.addMessage)
	r.Get("/sessions/{id}/messages", h.getMessages)

	return r
}

// Request/Response types
type CreateSessionRequest struct {
	Title *string `json:"title,omitempty"`
}

type AddMessageRequest struct {
	Role     string                 `json:"role"`
	Content  string                 `json:"content"`
	Metadata map[string]interface{} `json:"metadata,omitempty"`
}

type UpdateTitleRequest struct {
	Title string `json:"title"`
}

// getUserIDFromContext gets user ID from auth middleware
func getUserIDFromContext(r *http.Request) (uuid.UUID, error) {
	// Get subject (user ID) from auth middleware context using auth package's helper
	userIDStr, ok := auth.SubjectFromContext(r.Context())
	if !ok {
		return uuid.Nil, fmt.Errorf("user not authenticated")
	}
	return uuid.Parse(userIDStr)
}

// createSession creates a new chat session
// POST /api/v1/chat/sessions
func (h *HTTP) createSession(w http.ResponseWriter, r *http.Request) {
	userID, err := getUserIDFromContext(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req CreateSessionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	session, err := h.repo.CreateChatSession(r.Context(), userID, req.Title)
	if err != nil {
		http.Error(w, "Failed to create session: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(session)
}

// getUserSessions retrieves all sessions for the current user
// GET /api/v1/chat/sessions
func (h *HTTP) getUserSessions(w http.ResponseWriter, r *http.Request) {
	userID, err := getUserIDFromContext(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	sessions, err := h.repo.GetUserChatSessions(r.Context(), userID, 50)
	if err != nil {
		http.Error(w, "Failed to get sessions: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"sessions": sessions,
	})
}

// getSession retrieves a single session
// GET /api/v1/chat/sessions/{id}
func (h *HTTP) getSession(w http.ResponseWriter, r *http.Request) {
	sessionID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "Invalid session ID", http.StatusBadRequest)
		return
	}

	session, err := h.repo.GetChatSession(r.Context(), sessionID)
	if err != nil {
		http.Error(w, "Session not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(session)
}

// deleteSession deletes a session
// DELETE /api/v1/chat/sessions/{id}
func (h *HTTP) deleteSession(w http.ResponseWriter, r *http.Request) {
	sessionID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "Invalid session ID", http.StatusBadRequest)
		return
	}

	if err := h.repo.DeleteChatSession(r.Context(), sessionID); err != nil {
		http.Error(w, "Failed to delete session: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// updateSessionTitle updates session title
// PUT /api/v1/chat/sessions/{id}/title
func (h *HTTP) updateSessionTitle(w http.ResponseWriter, r *http.Request) {
	sessionID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "Invalid session ID", http.StatusBadRequest)
		return
	}

	var req UpdateTitleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if err := h.repo.UpdateChatSessionTitle(r.Context(), sessionID, req.Title); err != nil {
		http.Error(w, "Failed to update title: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// addMessage adds a message to a session
// POST /api/v1/chat/sessions/{id}/messages
func (h *HTTP) addMessage(w http.ResponseWriter, r *http.Request) {
	sessionID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "Invalid session ID", http.StatusBadRequest)
		return
	}

	var req AddMessageRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Role == "" || req.Content == "" {
		http.Error(w, "Role and content are required", http.StatusBadRequest)
		return
	}

	message, err := h.repo.AddChatMessage(r.Context(), sessionID, req.Role, req.Content, req.Metadata)
	if err != nil {
		http.Error(w, "Failed to add message: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(message)
}

// getMessages retrieves messages for a session
// GET /api/v1/chat/sessions/{id}/messages
func (h *HTTP) getMessages(w http.ResponseWriter, r *http.Request) {
	sessionID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "Invalid session ID", http.StatusBadRequest)
		return
	}

	messages, err := h.repo.GetChatMessages(r.Context(), sessionID, 100)
	if err != nil {
		http.Error(w, "Failed to get messages: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"messages": messages,
	})
}
