package chat

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"example.com/legallaw/internal/ai/chat"
	"example.com/legallaw/internal/ai/embedding"
	"example.com/legallaw/internal/ai/llm"
	"example.com/legallaw/internal/ai/prompt"
	"example.com/legallaw/internal/ai/search"
	"example.com/legallaw/internal/ai/tools"
	"example.com/legallaw/internal/model"
	"example.com/legallaw/internal/repository"
)

// Config configuration for chat service
type Config struct {
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

// Service provides chat functionality with all features
type Service struct {
	repo            *repository.Repository
	embedder        embedding.EmbeddingProvider
	baseProvider    llm.QAProvider
	promptManager   *prompt.PromptManager
	chatHistory     *chat.ChatHistoryManager
	webSearch       *tools.WebSearchClient
	reranker        *search.HybridReranker
	streamingClient *llm.StreamingLLMClient
	config          Config
}

// NewService creates a new chat service
func NewService(repo *repository.Repository, embedder embedding.EmbeddingProvider, baseProvider llm.QAProvider, config Config) *Service {
	// Set defaults
	if config.MaxChatHistory <= 0 {
		config.MaxChatHistory = 20
	}
	if config.ChatHistoryTTL <= 0 {
		config.ChatHistoryTTL = 2 * time.Hour
	}

	service := &Service{
		repo:          repo,
		embedder:      embedder,
		baseProvider:  baseProvider,
		promptManager: prompt.GetPromptManager(),
		chatHistory:   chat.NewChatHistoryManager(config.MaxChatHistory, config.ChatHistoryTTL),
		config:        config,
	}

	// Initialize web search if configured
	if config.GoogleSearchAPIKey != "" {
		service.webSearch = tools.NewWebSearchClient(config.GoogleSearchAPIKey, config.GoogleSearchEngineID)
	}

	// Initialize reranker
	// Using HybridReranker which supports RRF and Cohere
	service.reranker = search.NewHybridReranker(config.CohereAPIKey, "rerank-v3.5", true)

	// Initialize streaming client if using OpenAI
	if config.EnableStreaming && config.OpenAIKey != "" {
		model := config.Model
		if model == "" {
			model = "gpt-4o-mini"
		}
		service.streamingClient = llm.NewStreamingLLMClient(config.OpenAIKey, model)
	}

	return service
}

// ============================================================================
// Core QA Methods
// ============================================================================

// Answer generates an answer with chat history support
func (s *Service) Answer(ctx context.Context, question, contextStr string) (string, error) {
	return s.AnswerWithSession(ctx, "", question, contextStr)
}

// AnswerWithSession generates an answer with session-based chat history
func (s *Service) AnswerWithSession(ctx context.Context, sessionID, question, contextStr string) (string, error) {
	if s.baseProvider == nil {
		return "", errors.New("qa provider not configured")
	}

	var systemPrompt, userPrompt string
	var answer string
	var err error

	// Check if we have chat history
	history := ""
	if sessionID != "" {
		history = s.chatHistory.GetFormattedHistory(sessionID, 10)
	}

	if history != "" {
		// Use history-aware prompt
		systemPrompt = s.promptManager.GetSystemPrompt("answer_with_history")
		userPrompt = s.promptManager.GetFormattedUserPrompt("answer_with_history", map[string]string{
			"history":  history,
			"question": question,
			"context":  contextStr,
		})
	} else {
		// Standard prompt
		systemPrompt = s.promptManager.GetSystemPrompt("answer")
		userPrompt = s.promptManager.GetFormattedUserPrompt("answer", map[string]string{
			"question": question,
			"context":  contextStr,
		})
	}

	// Generate answer
	answer, err = s.baseProvider.Answer(ctx, userPrompt, systemPrompt)
	if err != nil {
		return "", err
	}

	// Save to chat history
	if sessionID != "" {
		s.chatHistory.AddMessage(sessionID, "user", question)
		s.chatHistory.AddMessage(sessionID, "assistant", answer)
	}

	return answer, nil
}

// AnswerWithFallback tries KB first, falls back to web search if no results
func (s *Service) AnswerWithFallback(ctx context.Context, sessionID, question, contextStr string) (string, string, error) {
	// If we have context, use it
	if contextStr != "" && len(contextStr) > 100 {
		answer, err := s.AnswerWithSession(ctx, sessionID, question, contextStr)
		return answer, "database", err
	}

	// No context from DB, try web search fallback
	if s.config.EnableWebSearchFallback && s.webSearch != nil {
		webContext, source, err := s.webSearch.FallbackSearch(ctx, question)
		if err == nil && webContext != "" {
			// Answer using web search results
			systemPrompt := s.promptManager.GetSystemPrompt("answer")
			userPrompt := fmt.Sprintf(`### CÂU HỎI:
%s

### THÔNG TIN TỪ INTERNET:
%s

### YÊU CẦU:
Dựa trên thông tin tìm được từ Internet, hãy trả lời câu hỏi. 
Lưu ý: Thông tin từ Internet có thể không chính xác 100%%, hãy khuyến khích người dùng kiểm tra với nguồn chính thức.`, question, webContext)

			// We use baseProvider directly here as we crafted a specific prompt
			answer, err := s.baseProvider.Answer(ctx, userPrompt, systemPrompt)
			if err == nil {
				// Add disclaimer
				answer += "\n\n*Lưu ý: Câu trả lời này được tổng hợp từ kết quả tìm kiếm Internet (" + source + "). Vui lòng xác minh với nguồn chính thức.*"
				return answer, "web:" + source, nil
			}
		}
	}

	// Both DB and web search failed
	return s.promptManager.GetResponse("no_results"), "none", nil
}

// ============================================================================
// Streaming Methods
// ============================================================================

// AnswerStream generates an answer with streaming response
func (s *Service) AnswerStream(ctx context.Context, sessionID, question, contextStr string, writer llm.StreamWriter) error {
	if s.streamingClient == nil {
		// Fallback to non-streaming
		answer, err := s.AnswerWithSession(ctx, sessionID, question, contextStr)
		if err != nil {
			return err
		}
		return writer.Write(llm.StreamChunk{Content: answer, Done: true})
	}

	var systemPrompt, userPrompt string

	// Check chat history
	history := ""
	if sessionID != "" {
		history = s.chatHistory.GetFormattedHistory(sessionID, 10)
	}

	if history != "" {
		systemPrompt = s.promptManager.GetSystemPrompt("answer_with_history")
		userPrompt = s.promptManager.GetFormattedUserPrompt("answer_with_history", map[string]string{
			"history":  history,
			"question": question,
			"context":  contextStr,
		})
	} else {
		systemPrompt = s.promptManager.GetSystemPrompt("answer")
		userPrompt = s.promptManager.GetFormattedUserPrompt("answer", map[string]string{
			"question": question,
			"context":  contextStr,
		})
	}

	// Stream the response and collect for history
	var fullAnswer strings.Builder
	ch, err := s.streamingClient.StreamChatToChannel(ctx, systemPrompt, userPrompt)
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
		s.chatHistory.AddMessage(sessionID, "user", question)
		s.chatHistory.AddMessage(sessionID, "assistant", fullAnswer.String())
	}

	return nil
}

// AnswerStreamToChannel returns a channel for streaming responses
func (s *Service) AnswerStreamToChannel(ctx context.Context, sessionID, question, contextStr string) (<-chan llm.StreamChunk, error) {
	ch := make(chan llm.StreamChunk, 100)
	writer := llm.NewChannelStreamWriter(ch)

	go func() {
		defer close(ch)
		if err := s.AnswerStream(ctx, sessionID, question, contextStr, writer); err != nil {
			ch <- llm.StreamChunk{Error: err.Error(), Done: true}
		}
	}()

	return ch, nil
}

// ============================================================================
// Query Methods
// ============================================================================

// RewriteQuery rewrites query using prompt manager
func (s *Service) RewriteQuery(ctx context.Context, query string) ([]string, error) {
	if s.baseProvider == nil {
		return []string{query}, nil
	}
	return s.baseProvider.RewriteQuery(ctx, query)
}

// ============================================================================
// Chat History Management
// ============================================================================

// GetChatHistory returns chat history for a session
func (s *Service) GetChatHistory(sessionID string, limit int) []chat.ChatMessage {
	return s.chatHistory.GetHistory(sessionID, limit)
}

// ClearChatHistory clears chat history for a session
func (s *Service) ClearChatHistory(sessionID string) {
	s.chatHistory.ClearSession(sessionID)
}

// ============================================================================
// Reranking Methods
// ============================================================================

// Rerank reranks documents using configured strategy
func (s *Service) Rerank(ctx context.Context, query string, documents []string, topK int) ([]int, []float64, error) {
	if s.reranker == nil {
		// Return original order
		indices := make([]int, len(documents))
		for i := range indices {
			indices[i] = i
		}
		return indices, nil, nil
	}

	// HybridReranker returns RerankResult directly
	results, err := s.reranker.Rerank(ctx, query, documents)
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
func (s *Service) SearchWeb(ctx context.Context, query string) (string, error) {
	if s.webSearch == nil {
		return "", errors.New("web search not configured")
	}
	return s.webSearch.SearchAndFormat(ctx, query, 5)
}

// ============================================================================
// Utility Methods
// ============================================================================

// ClassifyQuery classifies the query type
func (s *Service) ClassifyQuery(ctx context.Context, query string) (int, error) {
	if s.baseProvider == nil {
		return 1, nil // Default to legal query
	}

	systemPrompt := s.promptManager.GetSystemPrompt("classify")
	userPrompt := s.promptManager.GetFormattedUserPrompt("classify", map[string]string{
		"query": query,
	})

	answer, err := s.baseProvider.Answer(ctx, userPrompt, systemPrompt)
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
func (s *Service) GetGreetingResponse() string {
	return s.promptManager.GetResponse("greeting")
}

// GetInvalidResponse returns invalid query response
func (s *Service) GetInvalidResponse() string {
	return s.promptManager.GetResponse("invalid")
}

// GetNoResultsResponse returns no results response
func (s *Service) GetNoResultsResponse() string {
	return s.promptManager.GetResponse("no_results")
}

// ============================================================================
// Retrieval & Orchestration
// ============================================================================

// RetrieveContext embeds the query and searches for relevant units
func (s *Service) RetrieveContext(ctx context.Context, query string, topK int) (string, []map[string]interface{}, error) {
	if s.embedder == nil || s.repo == nil {
		return "", nil, errors.New("embedding or repository not configured")
	}

	emb, err := s.embedder.Embed(ctx, query)
	if err != nil {
		return "", nil, fmt.Errorf("embedding failed: %w", err)
	}

	if topK <= 0 {
		topK = 10
	}
	filter := model.UnitSearchFilter{Limit: topK}
	results, _, err := s.repo.SearchUnitsByEmbedding(ctx, emb, filter)
	if err != nil {
		return "", nil, fmt.Errorf("search failed: %w", err)
	}

	var contextStr string
	var contextItems []map[string]interface{}

	for _, u := range results {
		snippet := u.Text
		if len(snippet) > 800 {
			snippet = snippet[:800] + "..."
		}
		contextStr += snippet + "\n\n"
		contextItems = append(contextItems, map[string]interface{}{
			"unit_id":        u.ID,
			"document_title": u.DocumentTitle,
			"code":           u.Code,
			"level":          u.Level,
			"snippet":        snippet[:min(200, len(snippet))],
		})
	}

	return contextStr, contextItems, nil
}

// ProcessChat handles the full chat flow including classification and retrieval
func (s *Service) ProcessChat(ctx context.Context, sessionID, question string, topK int) (string, string, []map[string]interface{}, error) {
	// 1. Classify
	queryType, err := s.ClassifyQuery(ctx, question)
	if err != nil {
		// Log error but proceed as legal query
		queryType = 1
	}

	switch queryType {
	case 0: // Greeting
		return s.GetGreetingResponse(), "greeting", nil, nil
	case 2: // Invalid
		return s.GetInvalidResponse(), "invalid", nil, nil
	}

	// 2. Retrieve Context (Legal Query)
	contextStr, contextItems, err := s.RetrieveContext(ctx, question, topK)
	if err != nil {
		// If retrieval fails, we continue with empty context (will try web search if enabled)
		contextStr = ""
	}

	// 3. Answer
	answer, source, err := s.AnswerWithFallback(ctx, sessionID, question, contextStr)
	if err != nil {
		return "", "", nil, err
	}

	return answer, source, contextItems, nil
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
