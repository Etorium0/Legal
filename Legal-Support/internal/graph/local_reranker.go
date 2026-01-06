package graph

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"sort"
	"time"
)

// LocalReranker implements reranking using local models
type LocalReranker struct {
	endpoint   string
	modelName  string
	httpClient *http.Client
}

// LocalRerankerConfig configuration for local reranker
type LocalRerankerConfig struct {
	Endpoint  string // e.g., "http://localhost:8080/rerank"
	ModelName string // e.g., "vietnamese-legal-reranker"
	Timeout   time.Duration
}

// NewLocalReranker creates a new local reranker
func NewLocalReranker(config LocalRerankerConfig) *LocalReranker {
	timeout := config.Timeout
	if timeout == 0 {
		timeout = 30 * time.Second
	}

	return &LocalReranker{
		endpoint:  config.Endpoint,
		modelName: config.ModelName,
		httpClient: &http.Client{
			Timeout: timeout,
		},
	}
}

// LocalRerankRequest represents the request to local rerank service
type LocalRerankRequest struct {
	Query     string   `json:"query"`
	Documents []string `json:"documents"`
	TopK      int      `json:"top_k,omitempty"`
	Model     string   `json:"model,omitempty"`
}

// LocalRerankResponse represents the response from local rerank service
type LocalRerankResponse struct {
	Results []LocalRerankResult `json:"results"`
}

// LocalRerankResult represents a single reranking result
type LocalRerankResult struct {
	Index int     `json:"index"`
	Score float64 `json:"score"`
}

// Rerank performs reranking using local model
func (r *LocalReranker) Rerank(ctx context.Context, query string, documents []string, topK int) ([]int, []float64, error) {
	if len(documents) == 0 {
		return nil, nil, nil
	}

	reqBody := LocalRerankRequest{
		Query:     query,
		Documents: documents,
		TopK:      topK,
		Model:     r.modelName,
	}

	bodyBytes, err := json.Marshal(reqBody)
	if err != nil {
		return nil, nil, err
	}

	req, err := http.NewRequestWithContext(ctx, "POST", r.endpoint, bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, nil, err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := r.httpClient.Do(req)
	if err != nil {
		return nil, nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, nil, fmt.Errorf("local rerank error: %d - %s", resp.StatusCode, string(body))
	}

	var rerankResp LocalRerankResponse
	if err := json.NewDecoder(resp.Body).Decode(&rerankResp); err != nil {
		return nil, nil, err
	}

	indices := make([]int, len(rerankResp.Results))
	scores := make([]float64, len(rerankResp.Results))
	for i, result := range rerankResp.Results {
		indices[i] = result.Index
		scores[i] = result.Score
	}

	return indices, scores, nil
}

// ============================================================================
// Cross-Encoder Reranker (Sentence Transformers compatible)
// ============================================================================

// CrossEncoderReranker implements reranking using cross-encoder models
type CrossEncoderReranker struct {
	endpoint   string
	httpClient *http.Client
}

// NewCrossEncoderReranker creates a new cross-encoder reranker
func NewCrossEncoderReranker(endpoint string) *CrossEncoderReranker {
	return &CrossEncoderReranker{
		endpoint: endpoint,
		httpClient: &http.Client{
			Timeout: 60 * time.Second,
		},
	}
}

// CrossEncoderRequest represents request to cross-encoder service
type CrossEncoderRequest struct {
	Query string   `json:"query"`
	Texts []string `json:"texts"`
}

// CrossEncoderResponse represents response from cross-encoder service
type CrossEncoderResponse struct {
	Scores []float64 `json:"scores"`
}

// Rerank performs cross-encoder reranking
func (r *CrossEncoderReranker) Rerank(ctx context.Context, query string, documents []string, topK int) ([]int, []float64, error) {
	if len(documents) == 0 {
		return nil, nil, nil
	}

	reqBody := CrossEncoderRequest{
		Query: query,
		Texts: documents,
	}

	bodyBytes, err := json.Marshal(reqBody)
	if err != nil {
		return nil, nil, err
	}

	req, err := http.NewRequestWithContext(ctx, "POST", r.endpoint, bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, nil, err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := r.httpClient.Do(req)
	if err != nil {
		return nil, nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, nil, fmt.Errorf("cross-encoder error: %d - %s", resp.StatusCode, string(body))
	}

	var ceResp CrossEncoderResponse
	if err := json.NewDecoder(resp.Body).Decode(&ceResp); err != nil {
		return nil, nil, err
	}

	// Create index-score pairs for sorting
	type scoredDoc struct {
		index int
		score float64
	}
	scoredDocs := make([]scoredDoc, len(ceResp.Scores))
	for i, score := range ceResp.Scores {
		scoredDocs[i] = scoredDoc{index: i, score: score}
	}

	// Sort by score descending
	sort.Slice(scoredDocs, func(i, j int) bool {
		return scoredDocs[i].score > scoredDocs[j].score
	})

	// Take top K
	if topK > 0 && topK < len(scoredDocs) {
		scoredDocs = scoredDocs[:topK]
	}

	indices := make([]int, len(scoredDocs))
	scores := make([]float64, len(scoredDocs))
	for i, sd := range scoredDocs {
		indices[i] = sd.index
		scores[i] = sd.score
	}

	return indices, scores, nil
}

// ============================================================================
// Multi-Strategy Reranker
// ============================================================================

// RerankerType defines the type of reranker
type RerankerType string

const (
	RerankerTypeCohere       RerankerType = "cohere"
	RerankerTypeLocal        RerankerType = "local"
	RerankerTypeCrossEncoder RerankerType = "cross_encoder"
	RerankerTypeRRF          RerankerType = "rrf"
)

// MultiStrategyReranker supports multiple reranking strategies
type MultiStrategyReranker struct {
	cohereReranker       *CohereReranker
	localReranker        *LocalReranker
	crossEncoderReranker *CrossEncoderReranker
	defaultStrategy      RerankerType
}

// MultiStrategyRerankerConfig configuration for multi-strategy reranker
type MultiStrategyRerankerConfig struct {
	CohereAPIKey          string
	LocalRerankerEndpoint string
	LocalRerankerModel    string
	CrossEncoderEndpoint  string
	DefaultStrategy       RerankerType
}

// NewMultiStrategyReranker creates a new multi-strategy reranker
func NewMultiStrategyReranker(config MultiStrategyRerankerConfig) *MultiStrategyReranker {
	reranker := &MultiStrategyReranker{
		defaultStrategy: config.DefaultStrategy,
	}

	if config.CohereAPIKey != "" {
		reranker.cohereReranker = NewCohereReranker(config.CohereAPIKey, "")
	}

	if config.LocalRerankerEndpoint != "" {
		reranker.localReranker = NewLocalReranker(LocalRerankerConfig{
			Endpoint:  config.LocalRerankerEndpoint,
			ModelName: config.LocalRerankerModel,
		})
	}

	if config.CrossEncoderEndpoint != "" {
		reranker.crossEncoderReranker = NewCrossEncoderReranker(config.CrossEncoderEndpoint)
	}

	return reranker
}

// Rerank performs reranking using the specified strategy
func (r *MultiStrategyReranker) Rerank(ctx context.Context, query string, documents []string, topK int, strategy RerankerType) ([]int, []float64, error) {
	if strategy == "" {
		strategy = r.defaultStrategy
	}

	switch strategy {
	case RerankerTypeCohere:
		if r.cohereReranker == nil {
			return nil, nil, fmt.Errorf("Cohere reranker not configured")
		}
		// Convert CohereReranker result to indices and scores
		results, err := r.cohereReranker.Rerank(ctx, query, documents)
		if err != nil {
			return nil, nil, err
		}
		indices := make([]int, len(results))
		scores := make([]float64, len(results))
		for i, res := range results {
			indices[i] = res.Index
			scores[i] = res.RelevanceScore
		}
		if topK > 0 && topK < len(indices) {
			indices = indices[:topK]
			scores = scores[:topK]
		}
		return indices, scores, nil

	case RerankerTypeLocal:
		if r.localReranker == nil {
			return nil, nil, fmt.Errorf("local reranker not configured")
		}
		return r.localReranker.Rerank(ctx, query, documents, topK)

	case RerankerTypeCrossEncoder:
		if r.crossEncoderReranker == nil {
			return nil, nil, fmt.Errorf("cross-encoder reranker not configured")
		}
		return r.crossEncoderReranker.Rerank(ctx, query, documents, topK)

	case RerankerTypeRRF:
		// RRF doesn't need external service, it combines rankings
		return nil, nil, fmt.Errorf("use ReciprocalRankFusion function directly for RRF")

	default:
		return nil, nil, fmt.Errorf("unknown reranker strategy: %s", strategy)
	}
}

// RerankWithFallback tries multiple strategies with fallback
func (r *MultiStrategyReranker) RerankWithFallback(ctx context.Context, query string, documents []string, topK int) ([]int, []float64, error) {
	strategies := []RerankerType{
		r.defaultStrategy,
		RerankerTypeCrossEncoder,
		RerankerTypeLocal,
		RerankerTypeCohere,
	}

	var lastErr error
	for _, strategy := range strategies {
		indices, scores, err := r.Rerank(ctx, query, documents, topK, strategy)
		if err == nil {
			return indices, scores, nil
		}
		lastErr = err
	}

	return nil, nil, fmt.Errorf("all reranking strategies failed: %v", lastErr)
}
