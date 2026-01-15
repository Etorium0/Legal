package query

import (
	"context"
	"fmt"
	"strings"
)

// QueryClassification represents the classification of a query
type QueryClassification struct {
	Category   int     `json:"category"` // 0: greeting, 1: legal, 2: invalid
	Confidence float64 `json:"confidence"`
	Reason     string  `json:"reason"`
}

// classifyQuery uses NLP service to classify the query
func (s *Service) classifyQuery(ctx context.Context, queryText string) (*QueryClassification, error) {
	if s.nlpClient != nil {
		result, err := s.nlpClient.ClassifyQuery(ctx, queryText)
		if err == nil {
			return &QueryClassification{
				Category:   result.Category,
				Confidence: result.Confidence,
				Reason:     result.Reason,
			}, nil
		}
		fmt.Printf("NLP classification failed, falling back to rule-based: %v\n", err)
	}

	// Fallback to simple rule-based classification
	return s.classifyQueryRuleBased(queryText), nil
}

// classifyQueryRuleBased uses simple rules when NLP service is unavailable
func (s *Service) classifyQueryRuleBased(queryText string) *QueryClassification {
	text := strings.ToLower(queryText)

	// Greeting patterns
	greetingPatterns := []string{
		"xin chào", "chào bạn", "hello", "hi ", "bạn là ai",
		"bạn có thể làm gì", "chức năng", "hướng dẫn",
	}

	for _, p := range greetingPatterns {
		if strings.Contains(text, p) {
			return &QueryClassification{
				Category:   0,
				Confidence: 0.8,
				Reason:     "Greeting pattern detected",
			}
		}
	}

	// Legal keywords
	legalKeywords := []string{
		"luật", "nghị định", "thông tư", "điều", "khoản",
		"quyền", "nghĩa vụ", "hợp đồng", "vi phạm", "xử phạt",
		"quy định", "pháp luật", "bộ luật", "thủ tục",
	}

	legalCount := 0
	for _, kw := range legalKeywords {
		if strings.Contains(text, kw) {
			legalCount++
		}
	}

	if legalCount >= 1 {
		return &QueryClassification{
			Category:   1,
			Confidence: 0.5 + float64(legalCount)*0.1,
			Reason:     fmt.Sprintf("Found %d legal keywords", legalCount),
		}
	}

	// Default: assume legal if long enough
	if len(queryText) > 20 {
		return &QueryClassification{
			Category:   1,
			Confidence: 0.5,
			Reason:     "Default classification for long query",
		}
	}

	return &QueryClassification{
		Category:   2,
		Confidence: 0.5,
		Reason:     "Could not classify query",
	}
}
