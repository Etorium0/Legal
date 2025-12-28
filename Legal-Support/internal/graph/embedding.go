package graph

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"time"

	openai "github.com/sashabaranov/go-openai"
)

// EmbeddingProvider generates vector embeddings for text.
type EmbeddingProvider interface {
	Embed(ctx context.Context, input string) ([]float32, error)
}

// OpenAIEmbeddingProvider wraps OpenAI embedding models (e.g., text-embedding-3-small).
type OpenAIEmbeddingProvider struct {
	client *openai.Client
	model  string
}

// NewOpenAIEmbeddingProvider builds a provider; returns nil if apiKey is empty.
func NewOpenAIEmbeddingProvider(apiKey, model string) *OpenAIEmbeddingProvider {
	if apiKey == "" {
		return nil
	}
	if model == "" {
		model = "text-embedding-3-small"
	}
	return &OpenAIEmbeddingProvider{
		client: openai.NewClient(apiKey),
		model:  model,
	}
}

func (p *OpenAIEmbeddingProvider) Embed(ctx context.Context, input string) ([]float32, error) {
	if p == nil {
		return nil, errors.New("embedding provider not configured")
	}
	req := openai.EmbeddingRequest{
		Model: openai.EmbeddingModel(p.model),
		Input: []string{input},
	}
	resp, err := p.client.CreateEmbeddings(ctx, req)
	if err != nil {
		return nil, err
	}
	if len(resp.Data) == 0 {
		return nil, errors.New("embedding response empty")
	}
	return resp.Data[0].Embedding, nil
}

type GeminiEmbeddingProvider struct {
	apiKey string
	model  string
	client *http.Client
}

func NewGeminiEmbeddingProvider(apiKey, model string) *GeminiEmbeddingProvider {
	if apiKey == "" {
		return nil
	}
	if model == "" {
		model = "embedding-001"
	}
	return &GeminiEmbeddingProvider{
		apiKey: apiKey,
		model:  model,
		client: &http.Client{Timeout: 30 * time.Second},
	}
}

func (p *GeminiEmbeddingProvider) Embed(ctx context.Context, input string) ([]float32, error) {
	if p == nil {
		return nil, errors.New("embedding provider not configured")
	}
	url := "https://generativelanguage.googleapis.com/v1beta/models/" + p.model + ":embedText?key=" + p.apiKey
	body := map[string]string{"text": input}
	b, err := json.Marshal(body)
	if err != nil {
		return nil, err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(b))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json; charset=utf-8")
	resp, err := p.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, errors.New("gemini embedding request failed")
	}
	var out struct {
		Embedding struct {
			Values []float64 `json:"values"`
		} `json:"embedding"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return nil, err
	}
	if len(out.Embedding.Values) == 0 {
		return nil, errors.New("embedding response empty")
	}
	vec := make([]float32, len(out.Embedding.Values))
	for i, v := range out.Embedding.Values {
		vec[i] = float32(v)
	}
	return vec, nil
}
