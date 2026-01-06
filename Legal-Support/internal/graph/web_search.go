package graph

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// GoogleSearchResult represents a single search result
type GoogleSearchResult struct {
	Title   string `json:"title"`
	Link    string `json:"link"`
	Snippet string `json:"snippet"`
}

// GoogleSearchResponse represents the API response
type GoogleSearchResponse struct {
	Items []GoogleSearchResult `json:"items"`
}

// WebSearchClient handles web search operations
type WebSearchClient struct {
	apiKey         string
	searchEngineID string
	httpClient     *http.Client
}

// NewWebSearchClient creates a new web search client
func NewWebSearchClient(apiKey, searchEngineID string) *WebSearchClient {
	return &WebSearchClient{
		apiKey:         apiKey,
		searchEngineID: searchEngineID,
		httpClient: &http.Client{
			Timeout: 15 * time.Second,
		},
	}
}

// Search performs a Google Custom Search
func (c *WebSearchClient) Search(ctx context.Context, query string, numResults int) ([]GoogleSearchResult, error) {
	if c.apiKey == "" || c.searchEngineID == "" {
		return nil, fmt.Errorf("Google Search API not configured")
	}

	if numResults <= 0 {
		numResults = 5
	}
	if numResults > 10 {
		numResults = 10
	}

	// Build URL
	baseURL := "https://www.googleapis.com/customsearch/v1"
	params := url.Values{}
	params.Set("key", c.apiKey)
	params.Set("cx", c.searchEngineID)
	params.Set("q", query+" pháp luật Việt Nam") // Add legal context
	params.Set("num", fmt.Sprintf("%d", numResults))
	params.Set("lr", "lang_vi") // Vietnamese results
	params.Set("gl", "vn")      // Vietnam region

	fullURL := baseURL + "?" + params.Encode()

	// Make request
	req, err := http.NewRequestWithContext(ctx, "GET", fullURL, nil)
	if err != nil {
		return nil, err
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("Google Search API error: %d - %s", resp.StatusCode, string(body))
	}

	var searchResp GoogleSearchResponse
	if err := json.NewDecoder(resp.Body).Decode(&searchResp); err != nil {
		return nil, err
	}

	return searchResp.Items, nil
}

// SearchAndFormat performs search and formats results for LLM context
func (c *WebSearchClient) SearchAndFormat(ctx context.Context, query string, numResults int) (string, error) {
	results, err := c.Search(ctx, query, numResults)
	if err != nil {
		return "", err
	}

	if len(results) == 0 {
		return "", fmt.Errorf("no search results found")
	}

	var sb strings.Builder
	sb.WriteString("Kết quả tìm kiếm từ Internet:\n\n")

	for i, result := range results {
		sb.WriteString(fmt.Sprintf("--- Nguồn %d ---\n", i+1))
		sb.WriteString(fmt.Sprintf("Tiêu đề: %s\n", result.Title))
		sb.WriteString(fmt.Sprintf("Nguồn: %s\n", result.Link))
		sb.WriteString(fmt.Sprintf("Tóm tắt: %s\n\n", result.Snippet))
	}

	return sb.String(), nil
}

// ============================================================================
// Alternative: DuckDuckGo Search (no API key required)
// ============================================================================

// DuckDuckGoResult represents a DDG search result
type DuckDuckGoResult struct {
	Title    string `json:"Text"`
	Link     string `json:"FirstURL"`
	Abstract string `json:"Abstract"`
}

// DuckDuckGoResponse represents the API response
type DuckDuckGoResponse struct {
	Abstract       string             `json:"Abstract"`
	AbstractText   string             `json:"AbstractText"`
	AbstractSource string             `json:"AbstractSource"`
	AbstractURL    string             `json:"AbstractURL"`
	RelatedTopics  []DuckDuckGoResult `json:"RelatedTopics"`
}

// SearchDuckDuckGo performs a DuckDuckGo instant answer search (fallback)
func (c *WebSearchClient) SearchDuckDuckGo(ctx context.Context, query string) (string, error) {
	baseURL := "https://api.duckduckgo.com/"
	params := url.Values{}
	params.Set("q", query)
	params.Set("format", "json")
	params.Set("no_html", "1")
	params.Set("skip_disambig", "1")

	fullURL := baseURL + "?" + params.Encode()

	req, err := http.NewRequestWithContext(ctx, "GET", fullURL, nil)
	if err != nil {
		return "", err
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	var ddgResp DuckDuckGoResponse
	if err := json.NewDecoder(resp.Body).Decode(&ddgResp); err != nil {
		return "", err
	}

	if ddgResp.AbstractText != "" {
		return fmt.Sprintf("Theo %s:\n%s\n\nNguồn: %s",
			ddgResp.AbstractSource,
			ddgResp.AbstractText,
			ddgResp.AbstractURL), nil
	}

	// If no abstract, try related topics
	if len(ddgResp.RelatedTopics) > 0 {
		var sb strings.Builder
		sb.WriteString("Các kết quả liên quan:\n\n")
		for i, topic := range ddgResp.RelatedTopics {
			if i >= 5 {
				break
			}
			if topic.Title != "" {
				sb.WriteString(fmt.Sprintf("- %s\n", topic.Title))
			}
		}
		return sb.String(), nil
	}

	return "", fmt.Errorf("no results from DuckDuckGo")
}

// ============================================================================
// Fallback Search Strategy
// ============================================================================

// FallbackSearch tries multiple search sources
func (c *WebSearchClient) FallbackSearch(ctx context.Context, query string) (string, string, error) {
	// Try Google first if configured
	if c.apiKey != "" && c.searchEngineID != "" {
		results, err := c.SearchAndFormat(ctx, query, 5)
		if err == nil && results != "" {
			return results, "google", nil
		}
	}

	// Fallback to DuckDuckGo
	results, err := c.SearchDuckDuckGo(ctx, query)
	if err == nil && results != "" {
		return results, "duckduckgo", nil
	}

	return "", "", fmt.Errorf("all search sources failed")
}
