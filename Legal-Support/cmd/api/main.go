package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/joho/godotenv"

	"example.com/legallaw/internal/auth"
	"example.com/legallaw/internal/config"
	"example.com/legallaw/internal/db"
	"example.com/legallaw/internal/graph"
	"example.com/legallaw/internal/query"
)

func main() {
	_ = godotenv.Load()
	cfg := config.Load()
	pool, err := db.Connect(context.Background(), cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("db connect: %v", err)
	}
	defer pool.Close()

	authRepo := auth.NewRepository(pool)
	authService := auth.NewService(authRepo, cfg.JWTSecret)

	var embedder graph.EmbeddingProvider
	var qa graph.QAProvider
	if cfg.EmbeddingEnabled {
		if cfg.EmbeddingProvider == "gemini" {
			embedder = graph.NewGeminiEmbeddingProvider(cfg.EmbeddingAPIKey, cfg.EmbeddingModel)
		} else {
			embedder = graph.NewOpenAIEmbeddingProvider(cfg.EmbeddingAPIKey, cfg.EmbeddingModel)
		}
		if embedder == nil {
			log.Printf("embedding disabled: missing EMBEDDING_API_KEY")
		}
	}
	if cfg.EmbeddingAPIKey != "" {
		if cfg.EmbeddingProvider == "gemini" {
			qa = graph.NewGeminiQAProvider(cfg.EmbeddingAPIKey, cfg.QAModel)
		} else {
			qa = graph.NewOpenAIQAProvider(cfg.EmbeddingAPIKey, cfg.QAModel)
		}
	}

	queryHTTP := query.NewHTTP(pool, embedder, cfg.EmbeddingModel, qa, cfg)

	r := chi.NewRouter()
	r.Use(middleware.RequestID, middleware.RealIP, middleware.Logger, middleware.Recoverer)
	r.Use(corsMiddleware())

	// Public auth endpoints
	auth.RegisterChiRoutes(r, authService)

	r.Get("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("ok"))
	})

	r.Mount("/api/v1/query", queryHTTP.Routes())

	srv := &http.Server{Addr: ":" + cfg.HTTPPort, Handler: r, ReadTimeout: 60 * time.Second, WriteTimeout: 60 * time.Second}
	go func() {
		log.Printf("HTTP listening on :%s", cfg.HTTPPort)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("listen: %v", err)
		}
	}()
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)
	<-quit
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	srv.Shutdown(ctx)
}

func corsMiddleware() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Access-Control-Allow-Origin", "*")
			w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type")
			w.Header().Set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS")
			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusNoContent)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}
