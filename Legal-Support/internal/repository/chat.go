package repository

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// ChatSession represents a conversation session
type ChatSession struct {
	ID        uuid.UUID `json:"id"`
	UserID    uuid.UUID `json:"user_id"`
	Title     *string   `json:"title,omitempty"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// ChatMessage represents a single message in a session
type ChatMessage struct {
	ID        uuid.UUID              `json:"id"`
	SessionID uuid.UUID              `json:"session_id"`
	Role      string                 `json:"role"` // user, assistant, system
	Content   string                 `json:"content"`
	Metadata  map[string]interface{} `json:"metadata,omitempty"`
	CreatedAt time.Time              `json:"created_at"`
}

// CreateChatSession creates a new chat session for a user
func (r *Repository) CreateChatSession(ctx context.Context, userID uuid.UUID, title *string) (*ChatSession, error) {
	session := &ChatSession{
		UserID: userID,
		Title:  title,
	}

	query := `
		INSERT INTO chat_sessions (user_id, title)
		VALUES ($1, $2)
		RETURNING id, created_at, updated_at`

	err := r.db.QueryRow(ctx, query, userID, title).Scan(&session.ID, &session.CreatedAt, &session.UpdatedAt)
	if err != nil {
		return nil, err
	}

	return session, nil
}

// GetChatSession retrieves a chat session by ID
func (r *Repository) GetChatSession(ctx context.Context, sessionID uuid.UUID) (*ChatSession, error) {
	session := &ChatSession{}

	query := `
		SELECT id, user_id, title, created_at, updated_at
		FROM chat_sessions
		WHERE id = $1`

	err := r.db.QueryRow(ctx, query, sessionID).Scan(
		&session.ID,
		&session.UserID,
		&session.Title,
		&session.CreatedAt,
		&session.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	return session, nil
}

// GetUserChatSessions retrieves all sessions for a user
func (r *Repository) GetUserChatSessions(ctx context.Context, userID uuid.UUID, limit int) ([]*ChatSession, error) {
	if limit <= 0 {
		limit = 50
	}

	query := `
		SELECT id, user_id, title, created_at, updated_at
		FROM chat_sessions
		WHERE user_id = $1
		ORDER BY updated_at DESC
		LIMIT $2`

	rows, err := r.db.Query(ctx, query, userID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var sessions []*ChatSession
	for rows.Next() {
		session := &ChatSession{}
		err := rows.Scan(
			&session.ID,
			&session.UserID,
			&session.Title,
			&session.CreatedAt,
			&session.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		sessions = append(sessions, session)
	}

	return sessions, nil
}

// AddChatMessage adds a message to a session
func (r *Repository) AddChatMessage(ctx context.Context, sessionID uuid.UUID, role, content string, metadata map[string]interface{}) (*ChatMessage, error) {
	message := &ChatMessage{
		SessionID: sessionID,
		Role:      role,
		Content:   content,
		Metadata:  metadata,
	}

	query := `
		INSERT INTO chat_messages (session_id, role, content, metadata)
		VALUES ($1, $2, $3, $4)
		RETURNING id, created_at`

	err := r.db.QueryRow(ctx, query, sessionID, role, content, metadata).Scan(&message.ID, &message.CreatedAt)
	if err != nil {
		return nil, err
	}

	return message, nil
}

// GetChatMessages retrieves messages for a session
func (r *Repository) GetChatMessages(ctx context.Context, sessionID uuid.UUID, limit int) ([]*ChatMessage, error) {
	if limit <= 0 {
		limit = 100
	}

	query := `
		SELECT id, session_id, role, content, metadata, created_at
		FROM chat_messages
		WHERE session_id = $1
		ORDER BY created_at ASC
		LIMIT $2`

	rows, err := r.db.Query(ctx, query, sessionID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var messages []*ChatMessage
	for rows.Next() {
		message := &ChatMessage{}
		err := rows.Scan(
			&message.ID,
			&message.SessionID,
			&message.Role,
			&message.Content,
			&message.Metadata,
			&message.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		messages = append(messages, message)
	}

	return messages, nil
}

// DeleteChatSession deletes a session and all its messages
func (r *Repository) DeleteChatSession(ctx context.Context, sessionID uuid.UUID) error {
	query := `DELETE FROM chat_sessions WHERE id = $1`
	_, err := r.db.Exec(ctx, query, sessionID)
	return err
}

// UpdateChatSessionTitle updates the title of a session
func (r *Repository) UpdateChatSessionTitle(ctx context.Context, sessionID uuid.UUID, title string) error {
	query := `UPDATE chat_sessions SET title = $2, updated_at = NOW() WHERE id = $1`
	_, err := r.db.Exec(ctx, query, sessionID, title)
	return err
}
