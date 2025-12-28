package auth

import (
	"context"
	"net/http"
	"strings"
)

type ctxKey string

const ctxSubjectKey ctxKey = "auth.subject"

// SubjectFromContext extracts auth subject if present.
func SubjectFromContext(ctx context.Context) (string, bool) {
	v := ctx.Value(ctxSubjectKey)
	if v == nil {
		return "", false
	}
	sub, ok := v.(string)
	return sub, ok
}

// AuthMiddleware validates bearer token and injects subject into context.
// This is a placeholder; swap to repository-backed user lookup as needed.
func AuthMiddleware(s Service) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authz := r.Header.Get("Authorization")
			if authz == "" {
				http.Error(w, http.StatusText(http.StatusUnauthorized), http.StatusUnauthorized)
				return
			}
			parts := strings.SplitN(authz, " ", 2)
			if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
				http.Error(w, http.StatusText(http.StatusUnauthorized), http.StatusUnauthorized)
				return
			}
			tokenStr := parts[1]
			claims, err := s.ValidateToken(tokenStr)
			if err != nil {
				http.Error(w, http.StatusText(http.StatusUnauthorized), http.StatusUnauthorized)
				return
			}
			ctx := r.Context()
			ctx = context.WithValue(ctx, ctxSubjectKey, claims.Subject)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}
