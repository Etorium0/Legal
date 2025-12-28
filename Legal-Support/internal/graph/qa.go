package graph

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	openai "github.com/sashabaranov/go-openai"
)

// QAProvider generates answers given a question and retrieved context.
type QAProvider interface {
	Answer(ctx context.Context, question, context string) (string, error)
	RewriteQuery(ctx context.Context, query string) ([]string, error)
}

// OpenAIQAProvider uses OpenAI chat models to generate answers.
type OpenAIQAProvider struct {
	client *openai.Client
	model  string
}

func NewOpenAIQAProvider(apiKey, model string) *OpenAIQAProvider {
	if apiKey == "" {
		return nil
	}
	if model == "" {
		model = "gpt-4o-mini"
	}
	return &OpenAIQAProvider{client: openai.NewClient(apiKey), model: model}
}

func (p *OpenAIQAProvider) Answer(ctx context.Context, question, context string) (string, error) {
	if p == nil {
		return "", errors.New("qa provider not configured")
	}
	if question == "" {
		return "", errors.New("question required")
	}

	promptSystem := "You are a Vietnamese legal assistant. Answer concisely using only the provided context. If the context is insufficient, say you cannot answer from the context."
	promptUser := fmt.Sprintf("Question: %s\nContext:\n%s", question, context)

	resp, err := p.client.CreateChatCompletion(ctx, openai.ChatCompletionRequest{
		Model: p.model,
		Messages: []openai.ChatCompletionMessage{
			{Role: openai.ChatMessageRoleSystem, Content: promptSystem},
			{Role: openai.ChatMessageRoleUser, Content: promptUser},
		},
		Temperature: 0.2,
	})
	if err != nil {
		return "", err
	}
	if len(resp.Choices) == 0 {
		return "", errors.New("empty completion")
	}
	return resp.Choices[0].Message.Content, nil
}

func (p *OpenAIQAProvider) RewriteQuery(ctx context.Context, query string) ([]string, error) {
	if p == nil {
		return []string{query}, nil
	}

	promptSystem := "You are a helpful assistant that generates multiple search queries based on a single input query. Generate 3 variations of the following query to improve search recall. Focus on synonyms, related legal terms, and key entities. Return ONLY the queries, one per line. Do not number them."
	promptUser := fmt.Sprintf("Query: %s", query)

	resp, err := p.client.CreateChatCompletion(ctx, openai.ChatCompletionRequest{
		Model: p.model,
		Messages: []openai.ChatCompletionMessage{
			{Role: openai.ChatMessageRoleSystem, Content: promptSystem},
			{Role: openai.ChatMessageRoleUser, Content: promptUser},
		},
		Temperature: 0.7,
	})
	if err != nil {
		return []string{query}, err // Fallback to original query
	}
	if len(resp.Choices) == 0 {
		return []string{query}, nil
	}

	content := resp.Choices[0].Message.Content
	lines := strings.Split(content, "\n")
	var queries []string
	queries = append(queries, query) // Always include original
	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		if trimmed != "" {
			queries = append(queries, trimmed)
		}
	}
	return queries, nil
}

// GeminiQAProvider uses Google Gemini models.
type GeminiQAProvider struct {
	apiKey string
	model  string
	client *http.Client
}

func NewGeminiQAProvider(apiKey, model string) *GeminiQAProvider {
	if apiKey == "" {
		return nil
	}
	if model == "" {
		model = "gemini-1.5-flash"
	}
	return &GeminiQAProvider{
		apiKey: apiKey,
		model:  model,
		client: &http.Client{Timeout: 60 * time.Second},
	}
}

func (p *GeminiQAProvider) Answer(ctx context.Context, question, contextStr string) (string, error) {
	if p == nil {
		return "", errors.New("qa provider not configured")
	}

	prompt := fmt.Sprintf("You are a Vietnamese legal assistant. Answer concisely using only the provided context.\n\nContext:\n%s\n\nQuestion: %s", contextStr, question)

	url := "https://generativelanguage.googleapis.com/v1beta/models/" + p.model + ":generateContent?key=" + p.apiKey

	type Part struct {
		Text string `json:"text"`
	}
	type Content struct {
		Parts []Part `json:"parts"`
	}
	type Request struct {
		Contents []Content `json:"contents"`
	}

	reqBody := Request{
		Contents: []Content{
			{Parts: []Part{{Text: prompt}}},
		},
	}

	jsonBody, _ := json.Marshal(reqBody)
	req, _ := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")

	resp, err := p.client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		// Try to read error body for debugging
		buf := new(bytes.Buffer)
		buf.ReadFrom(resp.Body)
		return "", fmt.Errorf("gemini api error: %d - %s", resp.StatusCode, buf.String())
	}

	type Response struct {
		Candidates []struct {
			Content Content `json:"content"`
		} `json:"candidates"`
	}

	var geminiResp Response
	if err := json.NewDecoder(resp.Body).Decode(&geminiResp); err != nil {
		return "", err
	}

	if len(geminiResp.Candidates) == 0 || len(geminiResp.Candidates[0].Content.Parts) == 0 {
		return "", errors.New("empty response from gemini")
	}

	return geminiResp.Candidates[0].Content.Parts[0].Text, nil
}

func (p *GeminiQAProvider) RewriteQuery(ctx context.Context, query string) ([]string, error) {
	if p == nil {
		return []string{query}, nil
	}

	prompt := fmt.Sprintf(`You are a helpful assistant that generates multiple search queries based on a single input query.
Generate 3 variations of the following query to improve search recall. Focus on synonyms, related legal terms, and key entities.
Return ONLY the queries, one per line. Do not number them.
Query: %s`, query)

	url := "https://generativelanguage.googleapis.com/v1beta/models/" + p.model + ":generateContent?key=" + p.apiKey

	type Part struct {
		Text string `json:"text"`
	}
	type Content struct {
		Parts []Part `json:"parts"`
	}
	type Request struct {
		Contents []Content `json:"contents"`
	}

	reqBody := Request{
		Contents: []Content{
			{Parts: []Part{{Text: prompt}}},
		},
	}

	jsonBody, _ := json.Marshal(reqBody)
	req, _ := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")

	resp, err := p.client.Do(req)
	if err != nil {
		return []string{query}, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return []string{query}, fmt.Errorf("gemini api error: %d", resp.StatusCode)
	}

	type Response struct {
		Candidates []struct {
			Content Content `json:"content"`
		} `json:"candidates"`
	}

	var geminiResp Response
	if err := json.NewDecoder(resp.Body).Decode(&geminiResp); err != nil {
		return []string{query}, err
	}

	if len(geminiResp.Candidates) == 0 || len(geminiResp.Candidates[0].Content.Parts) == 0 {
		return []string{query}, nil
	}

	text := geminiResp.Candidates[0].Content.Parts[0].Text
	lines := strings.Split(text, "\n")
	var queries []string
	queries = append(queries, query)
	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		if trimmed != "" {
			queries = append(queries, trimmed)
		}
	}
	return queries, nil
}
