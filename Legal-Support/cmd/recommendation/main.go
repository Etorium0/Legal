package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/joho/godotenv"

	"example.com/legallaw/internal/config"
	"example.com/legallaw/internal/db"
	"example.com/legallaw/internal/graph"
)

func main() {
	_ = godotenv.Load()
	cfg := config.Load()

	pool, err := db.Connect(context.Background(), cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("db connect: %v", err)
	}
	defer pool.Close()

	repo := graph.NewRepository(pool)
	handler := &recommendHandler{repo: repo}

	r := chi.NewRouter()
	r.Use(middleware.RequestID, middleware.RealIP, middleware.Logger, middleware.Recoverer)
	r.Use(corsMiddleware())

	r.Get("/healthz", func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})

	r.Get("/api/v1/query/recommend", handler.handleRecommend)

	srv := &http.Server{Addr: ":" + cfg.HTTPPort, Handler: r, ReadTimeout: 15 * time.Second, WriteTimeout: 15 * time.Second}
	go func() {
		log.Printf("recommendation service listening on :%s", cfg.HTTPPort)
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

// recommendHandler handles keyword recommend/search endpoints.
type recommendHandler struct {
	repo *graph.Repository
}

func (h *recommendHandler) handleRecommend(w http.ResponseWriter, r *http.Request) {
	keyword := r.URL.Query().Get("keyword")
	if keyword == "" {
		http.Error(w, "keyword is required", http.StatusBadRequest)
		return
	}

	limit := parseIntDefault(r.URL.Query().Get("limit"), 10)
	offset := parseIntDefault(r.URL.Query().Get("offset"), 0)
	filter := graph.UnitSearchFilter{
		Keyword:  keyword,
		DocTypes: r.URL.Query()["doc_type"],
		Levels:   r.URL.Query()["level"],
		YearFrom: parseIntPointer(r.URL.Query().Get("year_from")),
		YearTo:   parseIntPointer(r.URL.Query().Get("year_to")),
		Limit:    limit,
		Offset:   offset,
	}

	results, total, err := h.repo.SearchUnits(r.Context(), filter)
	if err != nil {
		http.Error(w, "Failed to search units: "+err.Error(), http.StatusInternalServerError)
		return
	}

	items := make([]map[string]interface{}, 0, len(results))
	for _, u := range results {
		snippet := u.Text
		if len(snippet) > 320 {
			snippet = snippet[:320] + "..."
		}
		items = append(items, map[string]interface{}{
			"unit_id":        u.ID,
			"document_id":    u.DocumentID,
			"document_title": u.DocumentTitle,
			"code":           u.Code,
			"level":          u.Level,
			"snippet":        snippet,
		})
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"items":  items,
		"total":  total,
		"limit":  limit,
		"offset": offset,
	})
}

func parseIntDefault(s string, def int) int {
	if s == "" {
		return def
	}
	v, err := strconv.Atoi(s)
	if err != nil {
		return def
	}
	return v
}

func parseIntPointer(s string) *int {
	if s == "" {
		return nil
	}
	v, err := strconv.Atoi(s)
	if err != nil {
		return nil
	}
	return &v
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
