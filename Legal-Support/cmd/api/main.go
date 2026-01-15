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

	"example.com/legallaw/internal/ai/embedding"
	"example.com/legallaw/internal/ai/llm"
	"example.com/legallaw/internal/ai/prompt"
	"example.com/legallaw/internal/auth"
	chatHTTP "example.com/legallaw/internal/chat"
	"example.com/legallaw/internal/config"
	"example.com/legallaw/internal/db"
	"example.com/legallaw/internal/email"
	"example.com/legallaw/internal/law"
	"example.com/legallaw/internal/query"
	"example.com/legallaw/internal/repository"
	"example.com/legallaw/internal/service/chat"
)

func main() {
	_ = godotenv.Load()
	cfg := config.Load()

	// Load prompts from YAML file
	pm := prompt.GetPromptManager()
	if err := pm.LoadFromFile(cfg.PromptsFilePath); err != nil {
		log.Printf("Warning: Could not load prompts from %s: %v (using defaults)", cfg.PromptsFilePath, err)
	}

	pool, err := db.Connect(context.Background(), cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("db connect: %v", err)
	}
	defer pool.Close()

	authRepo := auth.NewRepository(pool)

	// Initialize email service
	emailService := email.NewEmailService()

	// Create auth service with email service
	authService := auth.NewService(authRepo, cfg.JWTSecret, emailService)

	// Seed Admin account
	if err := auth.SeedAdmin(context.Background(), authRepo); err != nil {
		log.Printf("Failed to seed admin: %v", err)
	}

	var embedder embedding.EmbeddingProvider
	var qa llm.QAProvider
	if cfg.EmbeddingEnabled {
		if cfg.EmbeddingProvider == "gemini" {
			embedder = embedding.NewGeminiEmbeddingProvider(cfg.EmbeddingAPIKey, cfg.EmbeddingModel)
		} else {
			embedder = embedding.NewOpenAIEmbeddingProvider(cfg.EmbeddingAPIKey, cfg.EmbeddingModel)
		}
		if embedder == nil {
			log.Printf("embedding disabled: missing EMBEDDING_API_KEY")
		}
	}

	// Initialize QA provider based on config
	switch cfg.QAProvider {
	case "groq":
		if cfg.GroqAPIKey != "" {
			qa = llm.NewGroqQAProvider(cfg.GroqAPIKey, cfg.QAModel)
			log.Printf("QA provider: Groq (%s)", cfg.QAModel)
		}
	case "openai":
		if cfg.EmbeddingAPIKey != "" {
			qa = llm.NewOpenAIQAProvider(cfg.EmbeddingAPIKey, cfg.QAModel)
			log.Printf("QA provider: OpenAI (%s)", cfg.QAModel)
		}
	default: // gemini
		if cfg.EmbeddingAPIKey != "" {
			qa = llm.NewGeminiQAProvider(cfg.EmbeddingAPIKey, cfg.QAModel)
			log.Printf("QA provider: Gemini (%s)", cfg.QAModel)
		}
	}

	queryHTTP := query.NewHTTP(pool, embedder, cfg.EmbeddingModel, qa, cfg)

	// Create chat service
	repo := repository.NewRepository(pool)
	chatConfig := chat.Config{
		OpenAIKey:               cfg.EmbeddingAPIKey,
		Model:                   cfg.QAModel,
		CohereAPIKey:            cfg.RerankAPIKeys,
		GoogleSearchAPIKey:      cfg.GoogleSearchAPIKey,
		GoogleSearchEngineID:    cfg.GoogleSearchEngineID,
		LocalRerankerEndpoint:   cfg.LocalRerankerEndpoint,
		CrossEncoderEndpoint:    cfg.CrossEncoderEndpoint,
		MaxChatHistory:          cfg.MaxChatHistory,
		ChatHistoryTTL:          cfg.GetChatHistoryTTL(),
		EnableWebSearchFallback: cfg.EnableWebSearchFallback,
		EnableStreaming:         cfg.EnableStreaming,
	}
	chatService := chat.NewService(repo, embedder, qa, chatConfig)

	// Create enhanced HTTP handler with streaming and chat history support
	enhancedHTTP := query.NewEnhancedHTTP(queryHTTP, chatService, cfg)

	r := chi.NewRouter()
	r.Use(middleware.RequestID, middleware.RealIP, middleware.Logger, middleware.Recoverer)
	r.Use(corsMiddleware())

	// Public auth endpoints
	auth.RegisterChiRoutes(r, authService)

	r.Get("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("ok"))
	})

	// Standard query routes
	r.Mount("/api/v1/query", queryHTTP.Routes())

	// Law document/unit routes
	lawHTTP := law.NewHTTP(repo)
	r.Mount("/api/v1/law", lawHTTP.Routes())

	// Enhanced routes with streaming and chat history
	r.Mount("/api/v2/chat", enhancedHTTP.EnhancedRoutes())

	// Chat history management routes (requires auth)
	chatHistoryHTTP := chatHTTP.NewHTTP(pool)
	r.Group(func(r chi.Router) {
		r.Use(auth.AuthMiddleware(authService))
		r.Mount("/api/v1/chat", chatHistoryHTTP.Routes())
	})

	srv := &http.Server{
		Addr:         ":" + cfg.HTTPPort,
		Handler:      r,
		ReadTimeout:  60 * time.Second,
		WriteTimeout: 120 * time.Second, // Increased for streaming
	}
	go func() {
		log.Printf("HTTP listening on :%s", cfg.HTTPPort)
		log.Printf("API v1: /api/v1/query")
		log.Printf("API v2: /api/v2/chat (with streaming & chat history)")
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
