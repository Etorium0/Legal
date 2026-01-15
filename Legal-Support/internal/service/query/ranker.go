package query

import (
	"fmt"
	"sort"
	"strings"

	"example.com/legallaw/internal/model"
)

// combineAndRankResults combines results from all stars and ranks them
func (s *Service) combineAndRankResults(stars []model.QueryStar, queryText string) []model.Answer {
	tripleMap := make(map[string]model.TripleView)
	tripleScores := make(map[string]float32)

	// Collect all unique triples and calculate scores
	for starIdx, star := range stars {
		starWeight := 1.0 - (float32(starIdx) * 0.1) // Earlier stars have higher weight
		if starWeight < 0.1 {
			starWeight = 0.1
		}

		for _, triple := range star.MatchingTriples {
			key := triple.ID.String()

			if existing, exists := tripleMap[key]; exists {
				// Update with better triple view if available
				tripleMap[key] = existing
			} else {
				tripleMap[key] = triple
			}

			// Calculate relevance score
			relevanceScore := s.calculateRelevanceScore(triple, queryText)

			// Enhanced scoring with TF-IDF: score = relevance + α * avg(tfidf) + β * coverage
			alpha := float32(0.2)
			beta := float32(0.1)

			tfidfScore := triple.TfIdf
			coverage := float32(1.0) // Simplified coverage - could be enhanced

			score := relevanceScore + alpha*tfidfScore + beta*coverage
			score *= starWeight

			if existingScore := tripleScores[key]; score > existingScore {
				tripleScores[key] = score
			}
		}
	}

	// Convert to answers and sort by score
	var answers []model.Answer
	for tripleID, triple := range tripleMap {
		score := tripleScores[tripleID]
		snippet := s.generateSnippet(triple)

		answers = append(answers, model.Answer{
			DocRef:    triple.DocRef,
			UnitID:    triple.UnitID.String(),
			Snippet:   snippet,
			Score:     score,
			Context:   triple.Context,
			Title:     triple.DocumentTitle,
			SourceURL: fmt.Sprintf("/documents/%s", triple.DocumentID),
		})
	}

	sort.Slice(answers, func(i, j int) bool {
		return answers[i].Score > answers[j].Score
	})

	// Limit to top 10 answers
	if len(answers) > 10 {
		answers = answers[:10]
	}

	return answers
}

// calculateRelevanceScore calculates how relevant a triple is to the query
func (s *Service) calculateRelevanceScore(triple model.TripleView, queryText string) float32 {
	queryLower := strings.ToLower(queryText)
	score := float32(0.0)

	// Check if query terms appear in the triple components
	if strings.Contains(queryLower, strings.ToLower(triple.SubjectName)) {
		score += 0.3
	}
	if strings.Contains(queryLower, strings.ToLower(triple.RelationName)) {
		score += 0.4 // Relations are often more important
	}
	if strings.Contains(queryLower, strings.ToLower(triple.ObjectName)) {
		score += 0.3
	}

	// Check if query terms appear in the unit text
	unitTextLower := strings.ToLower(triple.UnitText)
	queryWords := strings.Fields(queryLower)
	matchingWords := 0

	for _, word := range queryWords {
		if len(word) > 2 && matchesWord(unitTextLower, word) {
			matchingWords++
		}
	}

	if len(queryWords) > 0 {
		score += float32(matchingWords) / float32(len(queryWords)) * 0.2
	}

	// Base score for having any match
	if score == 0 {
		score = 0.1
	}

	return score
}

func matchesWord(text, word string) bool {
	return strings.Contains(text, word)
}

// generateSnippet creates a relevant snippet from the unit text
func (s *Service) generateSnippet(triple model.TripleView) string {
	text := triple.UnitText

	// If text is short enough, return it as is
	if len(text) <= 200 {
		return text
	}

	// Try to find a good excerpt around relevant terms
	terms := []string{triple.SubjectName, triple.ObjectName}

	for _, term := range terms {
		if term == "" {
			continue
		}

		termLower := strings.ToLower(term)
		textLower := strings.ToLower(text)

		if idx := strings.Index(textLower, termLower); idx >= 0 {
			start := max(0, idx-50)
			end := min(len(text), idx+len(term)+150)

			snippet := text[start:end]
			if start > 0 {
				snippet = "..." + snippet
			}
			if end < len(text) {
				snippet = snippet + "..."
			}

			return snippet
		}
	}

	// Fallback: return first 200 characters
	return text[:200] + "..."
}

// Helper functions
func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}
