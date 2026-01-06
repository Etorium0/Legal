package config

import (
	"os"
	"strconv"
	"time"
)

type Config struct {
	HTTPPort          string
	DatabaseURL       string
	JWTSecret         string
	EmbeddingAPIKey   string
	EmbeddingModel    string
	EmbeddingProvider string
	EmbeddingEnabled  bool
	QAModel           string
	RerankAPIKeys     string
	RerankModel       string
	NLPServiceURL     string

	// Enhanced QA Config
	GoogleSearchAPIKey      string
	GoogleSearchEngineID    string
	LocalRerankerEndpoint   string
	CrossEncoderEndpoint    string
	EnableWebSearchFallback bool
	EnableStreaming         bool
	MaxChatHistory          int
	ChatHistoryTTLMinutes   int
	PromptsFilePath         string
}

func Load() Config {
	port := getenv("HTTP_PORT", "8080")
	db := getenv("DATABASE_URL", "postgres://legaluser:legalpass@localhost:5432/legaldb?sslmode=disable")
	secret := getenv("JWT_SECRET", "dev-secret-change-me")
	embeddingKey := getenv("EMBEDDING_API_KEY", "")
	embeddingModel := getenv("EMBEDDING_MODEL", "text-embedding-3-small")
	embeddingProvider := getenv("EMBEDDING_PROVIDER", "openai")
	embeddingEnabled := getenvBool("EMBEDDING_ENABLED", "true")
	qaModel := getenv("QA_MODEL", "gpt-4o-mini")
	rerankKeys := getenv("RERANK_API_KEYS", "")
	rerankModel := getenv("RERANK_MODEL", "rerank-english-v3.0")
	nlpServiceURL := getenv("NLP_SERVICE_URL", "http://nlp-service:8090")

	// Enhanced QA Config
	googleSearchAPIKey := getenv("GOOGLE_SEARCH_API_KEY", "")
	googleSearchEngineID := getenv("GOOGLE_SEARCH_ENGINE_ID", "")
	localRerankerEndpoint := getenv("LOCAL_RERANKER_ENDPOINT", "")
	crossEncoderEndpoint := getenv("CROSS_ENCODER_ENDPOINT", "")
	enableWebSearchFallback := getenvBool("ENABLE_WEB_SEARCH_FALLBACK", "false")
	enableStreaming := getenvBool("ENABLE_STREAMING", "true")
	maxChatHistory := getenvInt("MAX_CHAT_HISTORY", 20)
	chatHistoryTTL := getenvInt("CHAT_HISTORY_TTL_MINUTES", 120)
	promptsFilePath := getenv("PROMPTS_FILE_PATH", "prompts.yaml")

	return Config{
		HTTPPort:                port,
		DatabaseURL:             db,
		JWTSecret:               secret,
		EmbeddingAPIKey:         embeddingKey,
		EmbeddingModel:          embeddingModel,
		EmbeddingProvider:       embeddingProvider,
		EmbeddingEnabled:        embeddingEnabled,
		QAModel:                 qaModel,
		RerankAPIKeys:           rerankKeys,
		RerankModel:             rerankModel,
		NLPServiceURL:           nlpServiceURL,
		GoogleSearchAPIKey:      googleSearchAPIKey,
		GoogleSearchEngineID:    googleSearchEngineID,
		LocalRerankerEndpoint:   localRerankerEndpoint,
		CrossEncoderEndpoint:    crossEncoderEndpoint,
		EnableWebSearchFallback: enableWebSearchFallback,
		EnableStreaming:         enableStreaming,
		MaxChatHistory:          maxChatHistory,
		ChatHistoryTTLMinutes:   chatHistoryTTL,
		PromptsFilePath:         promptsFilePath,
	}
}

// GetChatHistoryTTL returns chat history TTL as time.Duration
func (c Config) GetChatHistoryTTL() time.Duration {
	return time.Duration(c.ChatHistoryTTLMinutes) * time.Minute
}

func getenv(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}

func getenvBool(k, def string) bool {
	v := getenv(k, def)
	switch v {
	case "1", "true", "TRUE", "True", "yes", "on":
		return true
	default:
		return false
	}
}

func getenvInt(k string, def int) int {
	v := os.Getenv(k)
	if v == "" {
		return def
	}
	i, err := strconv.Atoi(v)
	if err != nil {
		return def
	}
	return i
}
