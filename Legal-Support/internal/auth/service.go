package auth

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"golang.org/x/crypto/bcrypt"
)

// Claims wraps standard claims with token type for access vs refresh
type Claims struct {
	TokenType string `json:"type"`
	Role      string `json:"role,omitempty"`
	jwt.RegisteredClaims
}

// Service defines authentication contract backed by repository
type Service interface {
	Register(ctx context.Context, req RegisterRequest) (*AuthResponse, error)
	Login(ctx context.Context, req LoginRequest) (*AuthResponse, error)
	Refresh(ctx context.Context, token string) (*AuthResponse, error)
	ValidateToken(token string) (*Claims, error)
	ListUsers(ctx context.Context) ([]User, error)
	UpdateUser(ctx context.Context, user User) error
	DeleteUser(ctx context.Context, id uuid.UUID) error
}

// Repository defines persistence for users and refresh tokens
type Repository interface {
	CreateUser(ctx context.Context, user *User) error
	GetUserByEmail(ctx context.Context, email string) (*User, error)
	GetUserByID(ctx context.Context, id uuid.UUID) (*User, error)
	ListUsers(ctx context.Context) ([]User, error)
	UpdateUser(ctx context.Context, user *User) error
	DeleteUser(ctx context.Context, id uuid.UUID) error
	StoreRefreshToken(ctx context.Context, rt RefreshToken) error
	GetRefreshToken(ctx context.Context, token string) (*RefreshToken, error)
	RevokeRefreshToken(ctx context.Context, token string) error
	RevokeAllUserTokens(ctx context.Context, userID uuid.UUID) error
}

// service is repository-backed auth service
type service struct {
	repo       Repository
	jwtSecret  []byte
	accessTTL  time.Duration
	refreshTTL time.Duration
}

// NewService constructs a new auth service
func NewService(repo Repository, jwtSecret string) Service {
	return &service{
		repo:       repo,
		jwtSecret:  []byte(jwtSecret),
		accessTTL:  15 * time.Minute,
		refreshTTL: 24 * time.Hour,
	}
}

func (s *service) Register(ctx context.Context, req RegisterRequest) (*AuthResponse, error) {
	if strings.TrimSpace(req.Email) == "" || strings.TrimSpace(req.Password) == "" {
		return nil, errors.New("email and password required")
	}

	if _, err := s.repo.GetUserByEmail(ctx, req.Email); err == nil {
		return nil, errors.New("user already exists")
	} else if !errors.Is(err, pgx.ErrNoRows) {
		return nil, err
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	user := User{
		ID:           uuid.New(),
		Email:        strings.TrimSpace(req.Email),
		Name:         strings.TrimSpace(req.Name),
		PasswordHash: string(hash),
		Role:         "user",
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}
	if err := s.repo.CreateUser(ctx, &user); err != nil {
		return nil, err
	}

	return s.issueTokens(ctx, user)
}

func (s *service) Login(ctx context.Context, req LoginRequest) (*AuthResponse, error) {
	user, err := s.repo.GetUserByEmail(ctx, req.Email)
	if err != nil {
		return nil, errors.New("invalid credentials")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		return nil, errors.New("invalid credentials")
	}

	return s.issueTokens(ctx, *user)
}

func (s *service) Refresh(ctx context.Context, tokenStr string) (*AuthResponse, error) {
	claims, err := s.parseToken(tokenStr)
	if err != nil {
		return nil, errors.New("invalid refresh token")
	}
	if claims.TokenType != "refresh" {
		return nil, errors.New("invalid token type")
	}

	rt, err := s.repo.GetRefreshToken(ctx, tokenStr)
	if err != nil || rt.Revoked || rt.ExpiresAt.Before(time.Now()) {
		return nil, errors.New("refresh token expired or revoked")
	}

	userID, err := uuid.Parse(claims.Subject)
	if err != nil {
		return nil, errors.New("invalid subject")
	}

	user, err := s.repo.GetUserByID(ctx, userID)
	if err != nil {
		return nil, errors.New("user not found")
	}

	// rotate: revoke old refresh
	_ = s.repo.RevokeRefreshToken(ctx, tokenStr)

	return s.issueTokens(ctx, *user)
}

func (s *service) issueTokens(ctx context.Context, user User) (*AuthResponse, error) {
	now := time.Now()
	accessClaims := Claims{
		TokenType: "access",
		Role:      user.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   user.ID.String(),
			ExpiresAt: jwt.NewNumericDate(now.Add(s.accessTTL)),
			IssuedAt:  jwt.NewNumericDate(now),
		},
	}
	refreshClaims := Claims{
		TokenType: "refresh",
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   user.ID.String(),
			ExpiresAt: jwt.NewNumericDate(now.Add(s.refreshTTL)),
			IssuedAt:  jwt.NewNumericDate(now),
			ID:        uuid.NewString(),
		},
	}

	accessToken, err := s.signClaims(accessClaims)
	if err != nil {
		return nil, err
	}
	refreshToken, err := s.signClaims(refreshClaims)
	if err != nil {
		return nil, err
	}

	// persist refresh token for revocation
	rt := RefreshToken{
		Token:     refreshToken,
		UserID:    user.ID,
		ExpiresAt: refreshClaims.ExpiresAt.Time,
		Revoked:   false,
		CreatedAt: now,
	}
	if err := s.repo.StoreRefreshToken(ctx, rt); err != nil {
		return nil, err
	}

	return &AuthResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresIn:    int64(s.accessTTL.Seconds()),
	}, nil
}

func (s *service) signClaims(claims Claims) (string, error) {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(s.jwtSecret)
}

func (s *service) parseToken(tokenStr string) (*Claims, error) {
	parsed, err := jwt.ParseWithClaims(tokenStr, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		if token.Method != jwt.SigningMethodHS256 {
			return nil, errors.New("unexpected signing method")
		}
		return s.jwtSecret, nil
	})
	if err != nil {
		return nil, err
	}

	claims, ok := parsed.Claims.(*Claims)
	if !ok || !parsed.Valid {
		return nil, errors.New("invalid token")
	}
	return claims, nil
}

func (s *service) ValidateToken(token string) (*Claims, error) {
	claims, err := s.parseToken(token)
	if err != nil {
		return nil, err
	}
	if claims.TokenType != "access" {
		return nil, errors.New("invalid token type")
	}
	return claims, nil
}

func (s *service) ListUsers(ctx context.Context) ([]User, error) {
	return s.repo.ListUsers(ctx)
}

func (s *service) UpdateUser(ctx context.Context, user User) error {
	// Optional: add validation or check if user exists
	if user.PasswordHash != "" {
		// handle password update if needed, but for now assuming only non-sensitive fields or hashed password passed
	}
	// For simplicity, we just pass through to repo for now, but usually we'd fetch first to verify existence.
	// But UpdateUser in repo relies on ID.
	// The request handler should prepare the user object.
	// Note: We might want to handle password hashing here if we support password reset by admin.
	// For this task, let's assume password is NOT updated via this generic update, or handled separately.
	// We'll trust the repo to update email/name/role.
	return s.repo.UpdateUser(ctx, &user)
}

func (s *service) DeleteUser(ctx context.Context, id uuid.UUID) error {
	return s.repo.DeleteUser(ctx, id)
}
