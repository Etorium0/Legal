package graph

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

// NLPClient provides Vietnamese NLP capabilities via the Python microservice
type NLPClient struct {
	baseURL string
	client  *http.Client
}

// NewNLPClient creates a new NLP client
func NewNLPClient(baseURL string) *NLPClient {
	if baseURL == "" {
		baseURL = "http://localhost:8090"
	}
	return &NLPClient{
		baseURL: baseURL,
		client: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// TokenizeResponse represents the response from tokenization
type TokenizeResponse struct {
	Original  string   `json:"original"`
	Tokenized string   `json:"tokenized"`
	Tokens    []string `json:"tokens"`
}

// Tokenize performs Vietnamese word segmentation
func (c *NLPClient) Tokenize(ctx context.Context, text string) (*TokenizeResponse, error) {
	reqBody := map[string]string{"text": text}
	jsonBody, err := json.Marshal(reqBody)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, "POST", c.baseURL+"/tokenize", bytes.NewBuffer(jsonBody))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("tokenize failed with status %d", resp.StatusCode)
	}

	var result TokenizeResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	return &result, nil
}

// ClassifyResponse represents the query classification result
type ClassifyResponse struct {
	Category   int     `json:"category"` // 0: greeting, 1: legal, 2: invalid
	Confidence float64 `json:"confidence"`
	Reason     string  `json:"reason"`
}

// ClassifyQuery classifies the query into categories
func (c *NLPClient) ClassifyQuery(ctx context.Context, query string) (*ClassifyResponse, error) {
	reqBody := map[string]string{"query": query}
	jsonBody, err := json.Marshal(reqBody)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, "POST", c.baseURL+"/classify", bytes.NewBuffer(jsonBody))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("classify failed with status %d", resp.StatusCode)
	}

	var result ClassifyResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	return &result, nil
}

// ExtractedEntities represents entities extracted from a query
type ExtractedEntities struct {
	Year           *int     `json:"year,omitempty"`
	DocumentNumber *string  `json:"document_number,omitempty"`
	DocumentType   *string  `json:"document_type,omitempty"`
	Article        *string  `json:"article,omitempty"`
	Clause         *string  `json:"clause,omitempty"`
	Authority      *string  `json:"authority,omitempty"`
	Keywords       []string `json:"keywords"`
}

// ExtractEntities extracts legal entities from the query
func (c *NLPClient) ExtractEntities(ctx context.Context, query string) (*ExtractedEntities, error) {
	reqBody := map[string]string{"query": query}
	jsonBody, err := json.Marshal(reqBody)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, "POST", c.baseURL+"/extract-entities", bytes.NewBuffer(jsonBody))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("extract-entities failed with status %d", resp.StatusCode)
	}

	var result ExtractedEntities
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	return &result, nil
}

// ExpandQueryResponse represents query expansion result
type ExpandQueryResponse struct {
	Original   string   `json:"original"`
	Variations []string `json:"variations"`
}

// ExpandQuery expands the query with synonyms and variations
func (c *NLPClient) ExpandQuery(ctx context.Context, query string, numVariations int) (*ExpandQueryResponse, error) {
	reqBody := map[string]interface{}{
		"query":          query,
		"num_variations": numVariations,
	}
	jsonBody, err := json.Marshal(reqBody)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, "POST", c.baseURL+"/expand-query", bytes.NewBuffer(jsonBody))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("expand-query failed with status %d", resp.StatusCode)
	}

	var result ExpandQueryResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	return &result, nil
}

// HealthCheck checks if the NLP service is available
func (c *NLPClient) HealthCheck(ctx context.Context) bool {
	req, err := http.NewRequestWithContext(ctx, "GET", c.baseURL+"/health", nil)
	if err != nil {
		return false
	}

	resp, err := c.client.Do(req)
	if err != nil {
		return false
	}
	defer resp.Body.Close()

	return resp.StatusCode == http.StatusOK
}
