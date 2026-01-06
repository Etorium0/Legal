package graph

import (
	"container/list"
	"sync"
	"time"
)

// ChatMessage represents a single message in the conversation
type ChatMessage struct {
	Role      string    `json:"role"` // "user" or "assistant"
	Content   string    `json:"content"`
	Timestamp time.Time `json:"timestamp"`
}

// ChatSession represents a conversation session
type ChatSession struct {
	ID        string
	Messages  *list.List
	MaxLength int
	CreatedAt time.Time
	UpdatedAt time.Time
	mu        sync.RWMutex
}

// ChatHistoryManager manages multiple chat sessions
type ChatHistoryManager struct {
	sessions   map[string]*ChatSession
	maxHistory int           // Max messages per session
	ttl        time.Duration // Session TTL
	mu         sync.RWMutex
}

// NewChatHistoryManager creates a new chat history manager
func NewChatHistoryManager(maxHistory int, ttl time.Duration) *ChatHistoryManager {
	manager := &ChatHistoryManager{
		sessions:   make(map[string]*ChatSession),
		maxHistory: maxHistory,
		ttl:        ttl,
	}

	// Start cleanup goroutine
	go manager.cleanupLoop()

	return manager
}

// GetOrCreateSession returns existing session or creates a new one
func (m *ChatHistoryManager) GetOrCreateSession(sessionID string) *ChatSession {
	m.mu.Lock()
	defer m.mu.Unlock()

	if session, exists := m.sessions[sessionID]; exists {
		session.UpdatedAt = time.Now()
		return session
	}

	session := &ChatSession{
		ID:        sessionID,
		Messages:  list.New(),
		MaxLength: m.maxHistory,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
	m.sessions[sessionID] = session
	return session
}

// AddMessage adds a message to a session
func (m *ChatHistoryManager) AddMessage(sessionID string, role string, content string) {
	session := m.GetOrCreateSession(sessionID)
	session.AddMessage(role, content)
}

// GetHistory returns conversation history for a session
func (m *ChatHistoryManager) GetHistory(sessionID string, limit int) []ChatMessage {
	m.mu.RLock()
	session, exists := m.sessions[sessionID]
	m.mu.RUnlock()

	if !exists {
		return nil
	}

	return session.GetMessages(limit)
}

// GetFormattedHistory returns history as formatted string for prompt
func (m *ChatHistoryManager) GetFormattedHistory(sessionID string, limit int) string {
	messages := m.GetHistory(sessionID, limit)
	if len(messages) == 0 {
		return ""
	}

	var result string
	for _, msg := range messages {
		if msg.Role == "user" {
			result += "Người dùng: " + msg.Content + "\n"
		} else {
			result += "Trợ lý: " + msg.Content + "\n"
		}
	}
	return result
}

// ClearSession removes a session
func (m *ChatHistoryManager) ClearSession(sessionID string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	delete(m.sessions, sessionID)
}

// cleanupLoop periodically removes expired sessions
func (m *ChatHistoryManager) cleanupLoop() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		m.cleanup()
	}
}

// cleanup removes expired sessions
func (m *ChatHistoryManager) cleanup() {
	m.mu.Lock()
	defer m.mu.Unlock()

	now := time.Now()
	for id, session := range m.sessions {
		if now.Sub(session.UpdatedAt) > m.ttl {
			delete(m.sessions, id)
		}
	}
}

// ============================================================================
// ChatSession methods
// ============================================================================

// AddMessage adds a message to the session
func (s *ChatSession) AddMessage(role string, content string) {
	s.mu.Lock()
	defer s.mu.Unlock()

	msg := ChatMessage{
		Role:      role,
		Content:   content,
		Timestamp: time.Now(),
	}

	s.Messages.PushBack(msg)
	s.UpdatedAt = time.Now()

	// Remove old messages if exceeding max length
	for s.Messages.Len() > s.MaxLength {
		s.Messages.Remove(s.Messages.Front())
	}
}

// GetMessages returns the last N messages
func (s *ChatSession) GetMessages(limit int) []ChatMessage {
	s.mu.RLock()
	defer s.mu.RUnlock()

	totalLen := s.Messages.Len()
	if limit <= 0 || limit > totalLen {
		limit = totalLen
	}

	result := make([]ChatMessage, 0, limit)

	// Get the starting point
	skip := totalLen - limit
	i := 0
	for e := s.Messages.Front(); e != nil; e = e.Next() {
		if i >= skip {
			result = append(result, e.Value.(ChatMessage))
		}
		i++
	}

	return result
}

// Clear removes all messages from the session
func (s *ChatSession) Clear() {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.Messages.Init()
	s.UpdatedAt = time.Now()
}
