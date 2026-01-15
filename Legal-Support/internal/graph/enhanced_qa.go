package graph

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"example.com/legallaw/internal/ai/chat"
	"example.com/legallaw/internal/ai/llm"
	"example.com/legallaw/internal/ai/prompt"
	"example.com/legallaw/internal/ai/search"
	"example.com/legallaw/internal/ai/tools"
)

// EnhancedQAConfig configuration for enhanced QA provider
type EnhancedQAConfig struct {
	OpenAIKey               string
	GeminiKey               string
	Model                   string
	CohereAPIKey            string
	GoogleSearchAPIKey      string
	GoogleSearchEngineID    string
	LocalRerankerEndpoint   string
	CrossEncoderEndpoint    string
	MaxChatHistory          int
	ChatHistoryTTL          time.Duration
	EnableWebSearchFallback bool
	EnableStreaming         bool
}

// EnhancedQAProvider is an advanced QA provider with all features
type EnhancedQAProvider struct {
	baseProvider    llm.QAProvider
	promptManager   *prompt.PromptManager
	chatHistory     *chat.ChatHistoryManager
	webSearch       *tools.WebSearchClient
	reranker        *search.HybridReranker
	streamingClient *llm.StreamingLLMClient
	config          EnhancedQAConfig
}

// NewEnhancedQAProvider creates a new enhanced QA provider
func NewEnhancedQAProvider(config EnhancedQAConfig) *EnhancedQAProvider {
	var baseProvider llm.QAProvider
	if config.OpenAIKey != "" {
		baseProvider = llm.NewOpenAIQAProvider(config.OpenAIKey, config.Model)
	} else if config.GeminiKey != "" {
		baseProvider = llm.NewGeminiQAProvider(config.GeminiKey, config.Model)
	}

	// Set defaults
	if config.MaxChatHistory <= 0 {
		config.MaxChatHistory = 20
	}
	if config.ChatHistoryTTL <= 0 {
		config.ChatHistoryTTL = 2 * time.Hour
	}

	provider := &EnhancedQAProvider{
		baseProvider:  baseProvider,
		promptManager: prompt.GetPromptManager(),
		chatHistory:   chat.NewChatHistoryManager(config.MaxChatHistory, config.ChatHistoryTTL),
		config:        config,
	}

	// Initialize web search if configured
	if config.GoogleSearchAPIKey != "" {
		provider.webSearch = tools.NewWebSearchClient(config.GoogleSearchAPIKey, config.GoogleSearchEngineID)
	}

	// Initialize reranker
	// Using HybridReranker which supports RRF and Cohere
	// Note: LocalRerankerEndpoint and CrossEncoderEndpoint are not currently used in HybridReranker
	// but could be added later. For now we use Cohere if key is present.
	provider.reranker = search.NewHybridReranker(config.CohereAPIKey, "rerank-v3.5", true)

	// Initialize streaming client if using OpenAI
	if config.EnableStreaming && config.OpenAIKey != "" {
		model := config.Model
		if model == "" {
			model = "gpt-4o-mini"
		}
		provider.streamingClient = llm.NewStreamingLLMClient(config.OpenAIKey, model)
	}

	return provider
}

// ============================================================================
// Core QA Methods
// ============================================================================

// Answer generates an answer with chat history support
func (p *EnhancedQAProvider) Answer(ctx context.Context, question, contextStr string) (string, error) {
	return p.AnswerWithSession(ctx, "", question, contextStr)
}

// AnswerWithSession generates an answer with session-based chat history
func (p *EnhancedQAProvider) AnswerWithSession(ctx context.Context, sessionID, question, contextStr string) (string, error) {
	if p.baseProvider == nil {
		return "", errors.New("qa provider not configured")
	}

	var systemPrompt, userPrompt string
	var answer string
	var err error

	// Check if we have chat history
	history := ""
	if sessionID != "" {
		history = p.chatHistory.GetFormattedHistory(sessionID, 10)
	}

	if history != "" {
		// Use history-aware prompt
		systemPrompt = p.promptManager.GetSystemPrompt("answer_with_history")
		userPrompt = p.promptManager.GetFormattedUserPrompt("answer_with_history", map[string]string{
			"history":  history,
			"question": question,
			"context":  contextStr,
		})
	} else {
		// Standard prompt
		systemPrompt = p.promptManager.GetSystemPrompt("answer")
		userPrompt = p.promptManager.GetFormattedUserPrompt("answer", map[string]string{
			"question": question,
			"context":  contextStr,
		})
	}

	// Generate answer
	answer, err = p.baseProvider.Answer(ctx, userPrompt, systemPrompt)
	if err != nil {
		return "", err
	}

	// Save to chat history
	if sessionID != "" {
		p.chatHistory.AddMessage(sessionID, "user", question)
		p.chatHistory.AddMessage(sessionID, "assistant", answer)
	}

	return answer, nil
}

// AnswerWithFallback tries KB first, falls back to web search if no results
func (p *EnhancedQAProvider) AnswerWithFallback(ctx context.Context, sessionID, question, contextStr string) (string, string, error) {
	// If we have context, use it
	if contextStr != "" && len(contextStr) > 100 {
		answer, err := p.AnswerWithSession(ctx, sessionID, question, contextStr)
		return answer, "database", err
	}

	// No context from DB, try web search fallback
	if p.config.EnableWebSearchFallback && p.webSearch != nil {
		webContext, source, err := p.webSearch.FallbackSearch(ctx, question)
		if err == nil && webContext != "" {
			// Answer using web search results
			systemPrompt := p.promptManager.GetSystemPrompt("answer")
			userPrompt := fmt.Sprintf(`### CÂU HỎI:
%s

### THÔNG TIN TỪ INTERNET:
%s

### YÊU CẦU:
Dựa trên thông tin tìm được từ Internet, hãy trả lời câu hỏi. 
Lưu ý: Thông tin từ Internet có thể không chính xác 100%%, hãy khuyến khích người dùng kiểm tra với nguồn chính thức.`, question, webContext)

			// We use baseProvider directly here as we crafted a specific prompt
			answer, err := p.baseProvider.Answer(ctx, userPrompt, systemPrompt)
			if err == nil {
				// Add disclaimer
				answer += "\n\n*Lưu ý: Câu trả lời này được tổng hợp từ kết quả tìm kiếm Internet (" + source + "). Vui lòng xác minh với nguồn chính thức.*"
				return answer, "web:" + source, nil
			}
		}
	}

	// Both DB and web search failed
	return p.promptManager.GetResponse("no_results"), "none", nil
}

// ============================================================================
// Streaming Methods
// ============================================================================

// AnswerStream generates an answer with streaming response
func (p *EnhancedQAProvider) AnswerStream(ctx context.Context, sessionID, question, contextStr string, writer llm.StreamWriter) error {
	if p.streamingClient == nil {
		// Fallback to non-streaming
		answer, err := p.AnswerWithSession(ctx, sessionID, question, contextStr)
		if err != nil {
			return err
		}
		return writer.Write(llm.StreamChunk{Content: answer, Done: true})
	}

	var systemPrompt, userPrompt string

	// Check chat history
	history := ""
	if sessionID != "" {
		history = p.chatHistory.GetFormattedHistory(sessionID, 10)
	}

	if history != "" {
		systemPrompt = p.promptManager.GetSystemPrompt("answer_with_history")
		userPrompt = p.promptManager.GetFormattedUserPrompt("answer_with_history", map[string]string{
			"history":  history,
			"question": question,
			"context":  contextStr,
		})
	} else {
		systemPrompt = p.promptManager.GetSystemPrompt("answer")
		userPrompt = p.promptManager.GetFormattedUserPrompt("answer", map[string]string{
			"question": question,
			"context":  contextStr,
		})
	}

	// Stream the response and collect for history
	var fullAnswer strings.Builder
	ch, err := p.streamingClient.StreamChatToChannel(ctx, systemPrompt, userPrompt)
	if err != nil {
		return err
	}

	for chunk := range ch {
		if chunk.Error != "" {
			return fmt.Errorf(chunk.Error)
		}
		fullAnswer.WriteString(chunk.Content)
		if err := writer.Write(chunk); err != nil {
			return err
		}
	}

	// Save to chat history
	if sessionID != "" {
		p.chatHistory.AddMessage(sessionID, "user", question)
		p.chatHistory.AddMessage(sessionID, "assistant", fullAnswer.String())
	}

	return nil
}

// AnswerStreamToChannel returns a channel for streaming responses
func (p *EnhancedQAProvider) AnswerStreamToChannel(ctx context.Context, sessionID, question, contextStr string) (<-chan llm.StreamChunk, error) {
	ch := make(chan llm.StreamChunk, 100)
	writer := llm.NewChannelStreamWriter(ch)

	go func() {
		defer close(ch)
		if err := p.AnswerStream(ctx, sessionID, question, contextStr, writer); err != nil {
			ch <- llm.StreamChunk{Error: err.Error(), Done: true}
		}
	}()

	return ch, nil
}

// ============================================================================
// Query Methods
// ============================================================================

// RewriteQuery rewrites query using prompt manager
func (p *EnhancedQAProvider) RewriteQuery(ctx context.Context, query string) ([]string, error) {
	if p.baseProvider == nil {
		return []string{query}, nil
	}
	return p.baseProvider.RewriteQuery(ctx, query)
}

// ============================================================================
// Chat History Management
// ============================================================================

// GetChatHistory returns chat history for a session
func (p *EnhancedQAProvider) GetChatHistory(sessionID string, limit int) []chat.ChatMessage {
	return p.chatHistory.GetHistory(sessionID, limit)
}

// ClearChatHistory clears chat history for a session
func (p *EnhancedQAProvider) ClearChatHistory(sessionID string) {
	p.chatHistory.ClearSession(sessionID)
}

// ============================================================================
// Reranking Methods
// ============================================================================

// Rerank reranks documents using configured strategy
func (p *EnhancedQAProvider) Rerank(ctx context.Context, query string, documents []string, topK int) ([]int, []float64, error) {
	if p.reranker == nil {
		// Return original order
		indices := make([]int, len(documents))
		for i := range indices {
			indices[i] = i
		}
		return indices, nil, nil
	}

	// HybridReranker returns RerankResult directly
	results, err := p.reranker.Rerank(ctx, query, documents)
	if err != nil {
		return nil, nil, err
	}

	indices := make([]int, len(results))
	scores := make([]float64, len(results))
	for i, res := range results {
		indices[i] = res.Index
		scores[i] = res.RelevanceScore
	}

	// Apply topK if needed
	if topK > 0 && topK < len(indices) {
		indices = indices[:topK]
		scores = scores[:topK]
	}

	return indices, scores, nil
}

// ============================================================================
// Web Search Methods
// ============================================================================

// SearchWeb performs web search
func (p *EnhancedQAProvider) SearchWeb(ctx context.Context, query string) (string, error) {
	if p.webSearch == nil {
		return "", errors.New("web search not configured")
	}
	return p.webSearch.SearchAndFormat(ctx, query, 5)
}

// ============================================================================
// Utility Methods
// ============================================================================

// ClassifyQuery classifies the query type
func (p *EnhancedQAProvider) ClassifyQuery(ctx context.Context, query string) (int, error) {
	if p.baseProvider == nil {
		return 1, nil // Default to legal query
	}

	systemPrompt := p.promptManager.GetSystemPrompt("classify")
	userPrompt := p.promptManager.GetFormattedUserPrompt("classify", map[string]string{
		"query": query,
	})

	answer, err := p.baseProvider.Answer(ctx, userPrompt, systemPrompt)
	if err != nil {
		return 1, err
	}

	// Parse the classification
	answer = strings.TrimSpace(answer)
	switch {
	case strings.Contains(answer, "0"):
		return 0, nil // Greeting/System
	case strings.Contains(answer, "2"):
		return 2, nil // Invalid/Irrelevant
	default:
		return 1, nil // Legal query
	}
}

// GetGreetingResponse returns greeting response
func (p *EnhancedQAProvider) GetGreetingResponse() string {
	return p.promptManager.GetResponse("greeting")
}

// GetInvalidResponse returns invalid query response
func (p *EnhancedQAProvider) GetInvalidResponse() string {
	return p.promptManager.GetResponse("invalid")
}

// GetNoResultsResponse returns no results response
func (p *EnhancedQAProvider) GetNoResultsResponse() string {
	return p.promptManager.GetResponse("no_results")
}
