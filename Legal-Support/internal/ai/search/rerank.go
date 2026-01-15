package search

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"sort"
	"strings"

	"example.com/legallaw/internal/ai/common"
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
	keyManager *common.KeyManager
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
		keyManager: common.NewKeyManager(cleanKeys),
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

// ============================================================================
// Reciprocal Rank Fusion (RRF) - combines multiple ranking lists
// ============================================================================

// Answer struct duplication to avoid circular dependency
// In a real scenario, Answer should be in a shared models package
type Answer struct {
	DocRef    string
	UnitID    string
	Snippet   string
	Score     float32
	Title     string
	Context   *string
	SourceURL string
}

// RRFDocument represents a document with its score in RRF
type RRFDocument struct {
	ID       string
	Content  string
	Metadata map[string]interface{}
	Score    float64
	Count    int // Number of times this document appeared in different lists
}

// ReciprocalRankFusion combines multiple ranked lists using RRF algorithm
// k is typically set to 60 (standard value from the original paper)
func ReciprocalRankFusion(rankedLists [][]Answer, k int) []Answer {
	if k <= 0 {
		k = 60 // Default RRF parameter
	}

	// Map to store cumulative RRF scores by document ID (UnitID)
	documentScores := make(map[string]*RRFDocument)

	for _, rankedList := range rankedLists {
		for rank, answer := range rankedList {
			// RRF score: 1 / (k + rank + 1)
			// rank is 0-indexed, so we add 1
			rrfScore := 1.0 / float64(k+rank+1)

			docID := answer.UnitID
			if existing, exists := documentScores[docID]; exists {
				existing.Score += rrfScore
				existing.Count++
			} else {
				documentScores[docID] = &RRFDocument{
					ID:      docID,
					Content: answer.Snippet,
					Metadata: map[string]interface{}{
						"doc_ref":    answer.DocRef,
						"title":      answer.Title,
						"context":    answer.Context,
						"source_url": answer.SourceURL,
					},
					Score: rrfScore,
					Count: 1,
				}
			}
		}
	}

	// Convert to sorted list
	var rrfResults []RRFDocument
	for _, doc := range documentScores {
		rrfResults = append(rrfResults, *doc)
	}

	// Sort by RRF score (descending)
	sort.Slice(rrfResults, func(i, j int) bool {
		// Primary: score, Secondary: count (more appearances = more relevant)
		if rrfResults[i].Score != rrfResults[j].Score {
			return rrfResults[i].Score > rrfResults[j].Score
		}
		return rrfResults[i].Count > rrfResults[j].Count
	})

	// Convert back to Answer format
	var fusedAnswers []Answer
	for _, doc := range rrfResults {
		answer := Answer{
			UnitID:  doc.ID,
			Snippet: doc.Content,
			Score:   float32(doc.Score),
		}

		// Restore metadata
		if docRef, ok := doc.Metadata["doc_ref"].(string); ok {
			answer.DocRef = docRef
		}
		if title, ok := doc.Metadata["title"].(string); ok {
			answer.Title = title
		}
		if ctx, ok := doc.Metadata["context"].(*string); ok {
			answer.Context = ctx
		}
		if srcURL, ok := doc.Metadata["source_url"].(string); ok {
			answer.SourceURL = srcURL
		}

		fusedAnswers = append(fusedAnswers, answer)
	}

	return fusedAnswers
}

// ============================================================================
// Hybrid Reranker - combines RRF with Cohere reranking
// ============================================================================

// HybridReranker combines multiple reranking strategies
type HybridReranker struct {
	cohereReranker *CohereReranker
	useRRF         bool
	rrfK           int
}

// NewHybridReranker creates a hybrid reranker
func NewHybridReranker(apiKeys string, model string, useRRF bool) *HybridReranker {
	return &HybridReranker{
		cohereReranker: NewCohereReranker(apiKeys, model),
		useRRF:         useRRF,
		rrfK:           60,
	}
}

// Rerank implements the Reranker interface
func (r *HybridReranker) Rerank(ctx context.Context, query string, docs []string) ([]RerankResult, error) {
	return r.cohereReranker.Rerank(ctx, query, docs)
}

// RerankWithRRF performs reranking with RRF fusion of multiple query results
func (r *HybridReranker) RerankWithRRF(ctx context.Context, query string, multiQueryResults [][]Answer) ([]Answer, error) {
	if !r.useRRF && len(multiQueryResults) == 1 {
		// No RRF needed, just return the single list
		return multiQueryResults[0], nil
	}

	// Step 1: Apply RRF to combine multiple query results
	fusedResults := ReciprocalRankFusion(multiQueryResults, r.rrfK)

	// Step 2: Optionally apply Cohere reranking on top results
	if r.cohereReranker != nil && len(fusedResults) > 0 {
		// Prepare documents for Cohere
		topN := 30
		if len(fusedResults) < topN {
			topN = len(fusedResults)
		}

		var docs []string
		for i := 0; i < topN; i++ {
			docText := fmt.Sprintf("Title: %s\nContent: %s", fusedResults[i].Title, fusedResults[i].Snippet)
			docs = append(docs, docText)
		}

		rerankResults, err := r.cohereReranker.Rerank(ctx, query, docs)
		if err == nil {
			// Reorder based on Cohere scores
			scoreMap := make(map[int]float64)
			for _, res := range rerankResults {
				scoreMap[res.Index] = res.RelevanceScore
			}

			for i := 0; i < topN; i++ {
				if newScore, ok := scoreMap[i]; ok {
					fusedResults[i].Score = float32(newScore)
				}
			}

			// Re-sort by new scores
			sort.Slice(fusedResults[:topN], func(i, j int) bool {
				return fusedResults[i].Score > fusedResults[j].Score
			})
		}
	}

	return fusedResults, nil
}
