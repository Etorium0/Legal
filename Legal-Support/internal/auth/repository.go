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
        INSERT INTO users (id, email, name, password_hash, role, email_verified, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING created_at, updated_at`

	return r.db.QueryRow(ctx, query, user.ID, user.Email, user.Name, user.PasswordHash, user.Role, user.EmailVerified, user.CreatedAt, user.UpdatedAt).
		Scan(&user.CreatedAt, &user.UpdatedAt)
}

func (r *repository) GetUserByEmail(ctx context.Context, email string) (*User, error) {
	query := `
        SELECT id, email, name, password_hash, role, email_verified, created_at, updated_at
        FROM users WHERE email = $1`

	user := &User{}
	if err := r.db.QueryRow(ctx, query, email).Scan(&user.ID, &user.Email, &user.Name, &user.PasswordHash, &user.Role, &user.EmailVerified, &user.CreatedAt, &user.UpdatedAt); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, err
		}
		return nil, err
	}
	return user, nil
}

func (r *repository) GetUserByID(ctx context.Context, id uuid.UUID) (*User, error) {
	query := `
        SELECT id, email, name, password_hash, role, email_verified, created_at, updated_at
        FROM users WHERE id = $1`

	user := &User{}
	if err := r.db.QueryRow(ctx, query, id).Scan(&user.ID, &user.Email, &user.Name, &user.PasswordHash, &user.Role, &user.EmailVerified, &user.CreatedAt, &user.UpdatedAt); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, err
		}
		return nil, err
	}
	return user, nil
}

func (r *repository) ListUsers(ctx context.Context) ([]User, error) {
	query := `
		SELECT id, email, name, password_hash, role, email_verified, created_at, updated_at
		FROM users ORDER BY created_at DESC`

	rows, err := r.db.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []User
	for rows.Next() {
		var u User
		if err := rows.Scan(&u.ID, &u.Email, &u.Name, &u.PasswordHash, &u.Role, &u.EmailVerified, &u.CreatedAt, &u.UpdatedAt); err != nil {
			return nil, err
		}
		users = append(users, u)
	}
	return users, rows.Err()
}

func (r *repository) UpdateUser(ctx context.Context, user *User) error {
	query := `
		UPDATE users
		SET email = $1, name = $2, role = $3, updated_at = $4
		WHERE id = $5
		RETURNING updated_at`

	return r.db.QueryRow(ctx, query, user.Email, user.Name, user.Role, time.Now(), user.ID).Scan(&user.UpdatedAt)
}

func (r *repository) DeleteUser(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM users WHERE id = $1`
	_, err := r.db.Exec(ctx, query, id)
	return err
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

// CreatePasswordResetToken stores a password reset token
func (r *repository) CreatePasswordResetToken(ctx context.Context, userID uuid.UUID, token string, expiresAt time.Time) error {
	query := `
		INSERT INTO password_reset_tokens (user_id, token, expires_at, used, created_at)
		VALUES ($1, $2, $3, false, $4)`
	_, err := r.db.Exec(ctx, query, userID, token, expiresAt, time.Now())
	return err
}

// GetPasswordResetToken retrieves a password reset token
func (r *repository) GetPasswordResetToken(ctx context.Context, token string) (*PasswordResetToken, error) {
	query := `
		SELECT user_id, token, expires_at, used, created_at
		FROM password_reset_tokens
		WHERE token = $1`

	prt := &PasswordResetToken{}
	err := r.db.QueryRow(ctx, query, token).Scan(&prt.UserID, &prt.Token, &prt.ExpiresAt, &prt.Used, &prt.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, err
		}
		return nil, err
	}
	return prt, nil
}

// MarkPasswordResetTokenUsed marks a password reset token as used
func (r *repository) MarkPasswordResetTokenUsed(ctx context.Context, token string) error {
	query := `UPDATE password_reset_tokens SET used = true WHERE token = $1`
	_, err := r.db.Exec(ctx, query, token)
	return err
}

// UpdateUserPassword updates user's password hash
func (r *repository) UpdateUserPassword(ctx context.Context, userID uuid.UUID, passwordHash string) error {
	query := `UPDATE users SET password_hash = $1, updated_at = $2 WHERE id = $3`
	_, err := r.db.Exec(ctx, query, passwordHash, time.Now(), userID)
	return err
}

// CreateEmailVerificationToken stores an email verification token
func (r *repository) CreateEmailVerificationToken(ctx context.Context, userID uuid.UUID, token string, expiresAt time.Time) error {
	query := `
		INSERT INTO email_verification_tokens (user_id, token, expires_at, used, created_at)
		VALUES ($1, $2, $3, false, $4)`
	_, err := r.db.Exec(ctx, query, userID, token, expiresAt, time.Now())
	return err
}

// GetEmailVerificationToken retrieves an email verification token
func (r *repository) GetEmailVerificationToken(ctx context.Context, token string) (*EmailVerificationToken, error) {
	query := `
		SELECT user_id, token, expires_at, used, created_at
		FROM email_verification_tokens
		WHERE token = $1`

	evt := &EmailVerificationToken{}
	err := r.db.QueryRow(ctx, query, token).Scan(&evt.UserID, &evt.Token, &evt.ExpiresAt, &evt.Used, &evt.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, err
		}
		return nil, err
	}
	return evt, nil
}

// MarkEmailVerified marks user's email as verified
func (r *repository) MarkEmailVerified(ctx context.Context, userID uuid.UUID) error {
	query := `UPDATE users SET email_verified = true, updated_at = $1 WHERE id = $2`
	_, err := r.db.Exec(ctx, query, time.Now(), userID)
	return err
}

// MarkEmailVerificationTokenUsed marks an email verification token as used
func (r *repository) MarkEmailVerificationTokenUsed(ctx context.Context, token string) error {
	query := `UPDATE email_verification_tokens SET used = true WHERE token = $1`
	_, err := r.db.Exec(ctx, query, token)
	return err
}
