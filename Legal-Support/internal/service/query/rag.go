package query

import (
	"context"
	"fmt"
	"log"
	"strings"

	"example.com/legallaw/internal/model"
)

// ProcessRAG performs Knowledge Graph + semantic hybrid search.
// Logic copied from legal-main (Railway production).
func (s *Service) ProcessRAG(ctx context.Context, req model.RagRequest) (*model.RagResult, error) {
	if s.embedder == nil {
		return nil, fmt.Errorf("embedding provider not configured")
	}

	if strings.TrimSpace(req.Question) == "" {
		return nil, fmt.Errorf("question is required")
	}

	topK := req.TopK
	if topK <= 0 {
		topK = 10
	}
	if topK > 50 {
		topK = 50
	}

	// 1. Extract keywords from question (limit to top 10)
	keywords := ExtractMeaningfulWords(req.Question)
	if len(keywords) > 10 {
		keywords = keywords[:10] // Keep only top 10 most meaningful
	}

	// DISABLED: Expand keywords with legal synonyms using AI (Gemini)
	// TODO: Re-enable after fixing ExpandKeywords() - it's returning malformed keywords
	// Reason: ExpandKeywords joins all keywords into ONE string instead of array
	// if s.qaProvider != nil {
	// 	expandedKeywords, err := s.qaProvider.ExpandKeywords(ctx, req.Question, keywords)
	// 	if err != nil {
	// 		log.Printf("[RAG] Keyword expansion error: %v", err)
	// 	} else {
	// 		keywords = expandedKeywords
	// 	}
	// }

	log.Printf("[RAG] Question: %s", req.Question)
	log.Printf("[RAG] Extracted keywords: %v", keywords)

	var results []model.UnitSimilarityView
	var total int

	// 2. DISABLED: Knowledge Graph Search temporarily due to low precision
	// TODO: Re-enable after fixing concept matching logic
	// Reason: KG matching on unigrams causes too many false positives
	// Example: "ly hôn" matches "hôn" -> concepts about "thời hạn", "quy định"...

	// Skip KG search for now - go directly to Keyword search
	log.Printf("[RAG] Skipping Knowledge Graph search (disabled for accuracy)")

	// 3. PRIMARY SEARCH: Keyword-based full-text search (HIGH PRECISION)
	// This is now PRIORITY 1 since KG is disabled
	minResults := topK / 2
	if len(keywords) > 0 {
		log.Printf("[RAG] Starting keyword search as primary method")

		// 4a. Keyword-based text search (HIGH PRECISION - Priority 2)
		searchKeywords := keywords
		if len(searchKeywords) > 10 {
			searchKeywords = searchKeywords[:10]
		}
		if len(searchKeywords) > 0 {
			keywordResults, err := s.repo.SearchUnitsByKeywords(ctx, searchKeywords, topK*2)
			if err != nil {
				log.Printf("[RAG] Keyword search error: %v", err)
			} else if len(keywordResults) > 0 {
				log.Printf("[RAG] Keyword search found %d results with keywords: %v", len(keywordResults), searchKeywords)
				results = mergeSearchResults(results, keywordResults, topK)
				log.Printf("[RAG] After merge: %d total results", len(results))
			} else {
				log.Printf("[RAG] Keyword search returned 0 results")
			}
		}
	}

	log.Printf("[RAG] Total results before semantic fallback: %d (minResults: %d)", len(results), minResults)

	// 4b. LAST RESORT: Semantic embedding search ONLY if KG + Keyword both failed
	// According to paper: Semantic search is FALLBACK only due to lower precision
	if len(results) < minResults {
		log.Printf("[RAG] KG+Keyword found only %d results, using semantic search as last resort", len(results))
		emb, err := s.embedder.Embed(ctx, req.Question)
		if err != nil {
			log.Printf("[RAG] Embedding error: %v", err)
		} else {
			filter := model.UnitSearchFilter{
				DocTypes: req.DocTypes,
				Levels:   req.Levels,
				YearFrom: req.YearFrom,
				YearTo:   req.YearTo,
				Limit:    topK,
				Offset:   0,
			}

			semanticResults, semTotal, err := s.repo.SearchUnitsByEmbedding(ctx, emb, filter)
			if err != nil {
				log.Printf("[RAG] Semantic search error: %v", err)
			} else {
				log.Printf("[RAG] Semantic search found %d results", len(semanticResults))
				// Merge: KG + Keyword results first (high priority), then semantic (low priority)
				results = mergeSearchResults(results, semanticResults, topK)
				if semTotal > total {
					total = semTotal
				}
			}
		}
	}

	// 5. Fallback: Web Search if no legal results found
	if len(results) == 0 && s.enableWebSearch && s.webSearcher != nil {
		log.Printf("[RAG] No legal results found, trying web search")
		webResults, source, err := s.webSearcher.FallbackSearch(ctx, req.Question)
		if err != nil {
			log.Printf("[RAG] Web search failed: %v", err)
		} else {
			log.Printf("[RAG] Found web results from %s", source)
			// Use web results as context for answer
			if req.Answer && s.qaProvider != nil {
				answerText, qaErr := s.qaProvider.Answer(ctx, req.Question, webResults)
				if qaErr != nil {
					log.Printf("[RAG] QA error with web results: %v", qaErr)
				} else {
					return &model.RagResult{
						Items:  []map[string]interface{}{},
						Total:  0,
						Limit:  topK,
						Offset: 0,
						Answer: answerText + "\n\n⚠️ *Thông tin từ tìm kiếm web, vui lòng tham khảo nguồn pháp luật chính thức.*",
					}, nil
				}
			}
		}
	}

	// 6. Build answer from context - ONLY if we have high-quality results
	// To prevent hallucination, we require minimum relevance score
	answerText := ""
	if req.Answer && s.qaProvider != nil && len(results) > 0 {
		// Check if results are relevant enough (distance < 0.6 for semantic, or from KG/Keyword)
		hasRelevantResults := false
		for _, u := range results {
			// If from KG or Keyword search (distance will be synthetic/high), trust them
			// If from semantic search, check distance threshold
			if u.Distance < 0.6 || u.Distance > 0.7 { // 0.7+ means from KG/Keyword (synthetic scores)
				hasRelevantResults = true
				break
			}
		}

		if hasRelevantResults {
			var sb strings.Builder
			for _, u := range results {
				snippet := u.Text
				if len(snippet) > 600 {
					snippet = snippet[:600] + "..."
				}
				// Build citation: Document | Code | Level
				citation := u.DocumentTitle
				if u.Code != nil && *u.Code != "" {
					citation += " | " + *u.Code
				}
				citation += " | " + u.Level
				fmt.Fprintf(&sb, "📜 [%s]\n%s\n\n", citation, snippet)
			}
			ctxStr := sb.String()
			if ctxStr != "" {
				var qaErr error
				answerText, qaErr = s.qaProvider.Answer(ctx, req.Question, ctxStr)
				if qaErr != nil {
					log.Printf("[RAG] QA error: %v", qaErr)
				}
			}
		} else {
			log.Printf("[RAG] Results not relevant enough (all distances > 0.6), skipping AI answer to prevent hallucination")
		}
	}

	// 6. Build response with proper citations
	items := make([]map[string]interface{}, 0, len(results))
	for _, u := range results {
		snippet := u.Text
		if len(snippet) > 320 {
			snippet = snippet[:320] + "..."
		}

		// Build citation reference
		citation := u.DocumentTitle
		if u.Code != nil && *u.Code != "" {
			citation = *u.Code + " - " + citation
		}

		items = append(items, map[string]interface{}{
			"unit_id":        u.ID,
			"document_id":    u.DocumentID,
			"document_title": u.DocumentTitle,
			"code":           u.Code,
			"level":          u.Level,
			"snippet":        snippet,
			"distance":       u.Distance,
			"citation":       citation,
		})
	}

	return &model.RagResult{
		Items:  items,
		Total:  total,
		Limit:  topK,
		Offset: 0,
		Answer: answerText,
	}, nil
}

// ============================================================================
// Helper functions
// ============================================================================

// truncate shortens a string to max length with ellipsis
func truncate(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen] + "..."
}

// mergeSearchResults combines keyword and semantic results, removing duplicates
func mergeSearchResults(existing, newResults []model.UnitSimilarityView, limit int) []model.UnitSimilarityView {
	seen := make(map[string]bool)
	var results []model.UnitSimilarityView

	// Add existing results first
	for _, r := range existing {
		if !seen[r.ID.String()] {
			seen[r.ID.String()] = true
			results = append(results, r)
		}
	}

	// Add new results
	for _, r := range newResults {
		if !seen[r.ID.String()] {
			seen[r.ID.String()] = true
			results = append(results, r)
		}
	}

	if len(results) > limit {
		results = results[:limit]
	}

	return results
}
