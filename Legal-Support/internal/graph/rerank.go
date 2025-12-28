package graph

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
)

// RerankResult represents a single reranked document.
type RerankResult struct {
	Index          int     `json:"index"`
	RelevanceScore float64 `json:"relevance_score"`
}

// Reranker defines the interface for reranking search results.
type Reranker interface {
	Rerank(ctx context.Context, query string, docs []string) ([]RerankResult, error)
}

// CohereReranker implements Reranker using the Cohere API.
type CohereReranker struct {
	keyManager *KeyManager
	model      string
	client     *http.Client
}

// NewCohereReranker creates a new CohereReranker.
// apiKeys can be a comma-separated string of keys.
func NewCohereReranker(apiKeys string, model string) *CohereReranker {
	keys := strings.Split(apiKeys, ",")
	cleanKeys := make([]string, 0, len(keys))
	for _, k := range keys {
		trimmed := strings.TrimSpace(k)
		if trimmed != "" {
			cleanKeys = append(cleanKeys, trimmed)
		}
	}

	if model == "" {
		model = "rerank-v3.5"
	}

	return &CohereReranker{
		keyManager: NewKeyManager(cleanKeys),
		model:      model,
		client:     &http.Client{},
	}
}

type cohereRerankRequest struct {
	Model           string   `json:"model"`
	Query           string   `json:"query"`
	Documents       []string `json:"documents"`
	TopN            int      `json:"top_n,omitempty"`
	ReturnDocuments bool     `json:"return_documents"`
}

type cohereRerankResponse struct {
	Results []struct {
		Index          int     `json:"index"`
		RelevanceScore float64 `json:"relevance_score"`
	} `json:"results"`
	Meta struct {
		ApiVersion struct {
			Version string `json:"version"`
		} `json:"api_version"`
	} `json:"meta"`
}

// Rerank re-orders the documents based on relevance to the query using Cohere's API.
func (r *CohereReranker) Rerank(ctx context.Context, query string, docs []string) ([]RerankResult, error) {
	if r == nil || r.keyManager.Count() == 0 {
		return nil, errors.New("reranker not configured")
	}

	apiKey := r.keyManager.GetNextKey()
	if apiKey == "" {
		return nil, errors.New("no API keys available for reranking")
	}

	url := "https://api.cohere.com/v1/rerank"

	reqBody := cohereRerankRequest{
		Model:           r.model,
		Query:           query,
		Documents:       docs,
		TopN:            len(docs), // Return all, just reordered
		ReturnDocuments: false,
	}

	jsonBody, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal rerank request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(jsonBody))
	if err != nil {
		return nil, fmt.Errorf("failed to create rerank request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Client-Name", "legal-supporter")

	resp, err := r.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to execute rerank request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("cohere api error: status code %d", resp.StatusCode)
	}

	var cohereResp cohereRerankResponse
	if err := json.NewDecoder(resp.Body).Decode(&cohereResp); err != nil {
		return nil, fmt.Errorf("failed to decode rerank response: %w", err)
	}

	results := make([]RerankResult, len(cohereResp.Results))
	for i, res := range cohereResp.Results {
		results[i] = RerankResult{
			Index:          res.Index,
			RelevanceScore: res.RelevanceScore,
		}
	}

	return results, nil
}
