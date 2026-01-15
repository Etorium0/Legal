package query

import (
	"context"
	"fmt"
	"strings"
)

// extractQueryTerms extracts meaningful terms from the query text
func (s *Service) extractQueryTerms(queryText string) []string {
	text := strings.ToLower(queryText)

	// Remove common stop words and extract meaningful terms (Vietnamese + English)
	stopWords := map[string]bool{
		// English stop words
		"what": true, "is": true, "the": true, "a": true, "an": true,
		"are": true, "can": true, "does": true, "how": true,
		"when": true, "where": true, "who": true, "why": true, "which": true,
		"for": true, "of": true, "to": true, "in": true, "on": true,
		"at": true, "by": true, "with": true, "from": true, "and": true,
		"or": true, "but": true, "not": true, "be": true, "have": true,
		"has": true, "had": true, "will": true, "would": true, "could": true,
		"should": true, "may": true, "might": true, "must": true, "do": true,
		// Vietnamese stop words
		"là": true, "của": true, "và": true, "có": true, "được": true,
		"trong": true, "cho": true, "để": true, "với": true, "các": true,
		"một": true, "những": true, "này": true, "đó": true, "như": true,
		"khi": true, "nếu": true, "thì": true, "sẽ": true, "đã": true,
		"về": true, "từ": true, "trên": true, "theo": true, "tại": true,
		"bởi": true, "vì": true, "hay": true, "hoặc": true,
		"nhưng": true, "mà": true, "nào": true, "gì": true, "ai": true,
		"đâu": true, "sao": true, "bao": true, "nhiêu": true, "thế": true,
		"vậy": true, "ra": true, "vào": true, "lên": true,
		"xuống": true, "qua": true, "lại": true, "đi": true, "đến": true,
	}

	// Split into words and filter
	words := strings.Fields(text)
	var terms []string

	// Common punctuation to trim
	punct := ".,!?;:()[]{}\"'“”‘’-_"

	for _, word := range words {
		word = strings.Trim(word, punct)
		if len(word) > 2 && !stopWords[word] {
			terms = append(terms, word)
		}
	}

	// Also extract key phrases (2-word, 3-word, and 4-word combinations)
	for i := 0; i < len(words)-1; i++ {
		// 2-word phrases
		word1 := strings.Trim(words[i], punct)
		word2 := strings.Trim(words[i+1], punct)

		if len(word1) > 1 && len(word2) > 1 && !stopWords[word1] && !stopWords[word2] {
			phrase := word1 + " " + word2
			terms = append(terms, phrase)
		}

		// 3-word phrases
		if i < len(words)-2 {
			word3 := strings.Trim(words[i+2], punct)
			if len(word1) > 1 && len(word2) > 1 && len(word3) > 1 && !stopWords[word1] && !stopWords[word3] {
				phrase := word1 + " " + word2 + " " + word3
				terms = append(terms, phrase)
			}
		}

		// 4-word phrases
		if i < len(words)-3 {
			word3 := strings.Trim(words[i+2], punct)
			word4 := strings.Trim(words[i+3], punct)
			if len(word1) > 1 && len(word2) > 1 && len(word3) > 1 && len(word4) > 1 && !stopWords[word1] && !stopWords[word4] {
				phrase := word1 + " " + word2 + " " + word3 + " " + word4
				terms = append(terms, phrase)
			}
		}
	}

	return terms
}

// extractQueryTermsWithNLP extracts terms using Vietnamese tokenization
func (s *Service) extractQueryTermsWithNLP(ctx context.Context, queryText string) []string {
	// Try NLP service first
	if s.nlpClient != nil {
		result, err := s.nlpClient.Tokenize(ctx, queryText)
		if err == nil {
			// Use tokenized text for better Vietnamese word segmentation
			return s.extractQueryTerms(result.Tokenized)
		}
		fmt.Printf("NLP tokenization failed, falling back to basic: %v\n", err)
	}

	// Fallback to basic extraction
	return s.extractQueryTerms(queryText)
}
