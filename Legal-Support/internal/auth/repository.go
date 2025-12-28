package auth

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Repository implements persistence for auth
// Note: minimal error wrapping; callers handle exposed errors.
type repository struct {
	db *pgxpool.Pool
}

// NewRepository constructs a repository
func NewRepository(db *pgxpool.Pool) Repository {
	return &repository{db: db}
}

func (r *repository) CreateUser(ctx context.Context, user *User) error {
	query := `
        INSERT INTO users (id, email, name, password_hash, role, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING created_at, updated_at`

	return r.db.QueryRow(ctx, query, user.ID, user.Email, user.Name, user.PasswordHash, user.Role, user.CreatedAt, user.UpdatedAt).
		Scan(&user.CreatedAt, &user.UpdatedAt)
}

func (r *repository) GetUserByEmail(ctx context.Context, email string) (*User, error) {
	query := `
        SELECT id, email, name, password_hash, role, created_at, updated_at
        FROM users WHERE email = $1`

	user := &User{}
	if err := r.db.QueryRow(ctx, query, email).Scan(&user.ID, &user.Email, &user.Name, &user.PasswordHash, &user.Role, &user.CreatedAt, &user.UpdatedAt); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, err
		}
		return nil, err
	}
	return user, nil
}

func (r *repository) GetUserByID(ctx context.Context, id uuid.UUID) (*User, error) {
	query := `
        SELECT id, email, name, password_hash, role, created_at, updated_at
        FROM users WHERE id = $1`

	user := &User{}
	if err := r.db.QueryRow(ctx, query, id).Scan(&user.ID, &user.Email, &user.Name, &user.PasswordHash, &user.Role, &user.CreatedAt, &user.UpdatedAt); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, err
		}
		return nil, err
	}
	return user, nil
}

func (r *repository) StoreRefreshToken(ctx context.Context, rt RefreshToken) error {
	query := `
        INSERT INTO refresh_tokens (token, user_id, expires_at, revoked, created_at)
        VALUES ($1, $2, $3, $4, $5)`
	_, err := r.db.Exec(ctx, query, rt.Token, rt.UserID, rt.ExpiresAt, rt.Revoked, rt.CreatedAt)
	return err
}

func (r *repository) GetRefreshToken(ctx context.Context, token string) (*RefreshToken, error) {
	query := `
        SELECT token, user_id, expires_at, revoked, created_at
        FROM refresh_tokens WHERE token = $1`

	rt := &RefreshToken{}
	if err := r.db.QueryRow(ctx, query, token).Scan(&rt.Token, &rt.UserID, &rt.ExpiresAt, &rt.Revoked, &rt.CreatedAt); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, err
		}
		return nil, err
	}
	return rt, nil
}

func (r *repository) RevokeRefreshToken(ctx context.Context, token string) error {
	query := `UPDATE refresh_tokens SET revoked = true WHERE token = $1`
	_, err := r.db.Exec(ctx, query, token)
	return err
}

func (r *repository) RevokeAllUserTokens(ctx context.Context, userID uuid.UUID) error {
	query := `UPDATE refresh_tokens SET revoked = true WHERE user_id = $1`
	_, err := r.db.Exec(ctx, query, userID)
	return err
}

// CleanupExpired marks expired tokens as revoked (best-effort)
func (r *repository) CleanupExpired(ctx context.Context) error {
	query := `UPDATE refresh_tokens SET revoked = true WHERE expires_at < $1 AND revoked = false`
	_, err := r.db.Exec(ctx, query, time.Now())
	return err
}
