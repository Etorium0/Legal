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
	QAProvider        string // "openai", "gemini", "groq"
	GroqAPIKey        string
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

	// Email Configuration
	SMTPHost     string
	SMTPPort     string
	SMTPUser     string
	SMTPPassword string
	FromEmail    string
	FromName     string
	FrontendURL  string
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
	qaProvider := getenv("QA_PROVIDER", "gemini") // default to gemini
	groqAPIKey := getenv("GROQ_API_KEY", "")
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

	// Email Configuration
	smtpHost := getenv("SMTP_HOST", "smtp.gmail.com")
	smtpPort := getenv("SMTP_PORT", "587")
	smtpUser := getenv("SMTP_USER", "")
	smtpPassword := getenv("SMTP_PASSWORD", "")
	fromEmail := getenv("FROM_EMAIL", "noreply@legal-support.com")
	fromName := getenv("FROM_NAME", "Legal Support System")
	frontendURL := getenv("FRONTEND_URL", "http://localhost:3000")

	return Config{
		HTTPPort:                port,
		DatabaseURL:             db,
		JWTSecret:               secret,
		EmbeddingAPIKey:         embeddingKey,
		EmbeddingModel:          embeddingModel,
		EmbeddingProvider:       embeddingProvider,
		EmbeddingEnabled:        embeddingEnabled,
		QAModel:                 qaModel,
		QAProvider:              qaProvider,
		GroqAPIKey:              groqAPIKey,
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
		SMTPHost:                smtpHost,
		SMTPPort:                smtpPort,
		SMTPUser:                smtpUser,
		SMTPPassword:            smtpPassword,
		FromEmail:               fromEmail,
		FromName:                fromName,
		FrontendURL:             frontendURL,
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
