package auth

import (
	"github.com/go-chi/chi/v5"
)

// RegisterChiRoutes allows mounting on chi.Router
func RegisterChiRoutes(r chi.Router, s Service) {
	h := NewHandler(s)
	r.Post("/api/v1/auth/register", h.handleRegister)
	r.Post("/api/v1/auth/login", h.handleLogin)
	r.Post("/api/v1/auth/refresh", h.handleRefresh)
}
