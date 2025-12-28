package config

import "os"

type Config struct {
	HTTPPort         string
	DatabaseURL      string
	JWTSecret        string
	EmbeddingAPIKey  string
	EmbeddingModel   string
	EmbeddingProvider string
	EmbeddingEnabled bool
	QAModel          string
	RerankAPIKeys    string
	RerankModel      string
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

	return Config{
		HTTPPort: port, DatabaseURL: db, JWTSecret: secret,
		EmbeddingAPIKey: embeddingKey, EmbeddingModel: embeddingModel, EmbeddingProvider: embeddingProvider, EmbeddingEnabled: embeddingEnabled,
		QAModel: qaModel,
		RerankAPIKeys: rerankKeys, RerankModel: rerankModel,
	}
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
