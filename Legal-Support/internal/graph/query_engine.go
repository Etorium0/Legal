package graph

import (
	"context"
	"fmt"
	"math"
	"sort"
	"strings"
	"time"
)

// QueryEngine handles legal query processing with subgraph matching
type QueryEngine struct {
	repo       *Repository
	qaProvider QAProvider
	reranker   Reranker
	nlpClient  *NLPClient
}

// NewQueryEngine creates a new query engine
func NewQueryEngine(repo *Repository, qa QAProvider, reranker Reranker) *QueryEngine {
	return &QueryEngine{
		repo:       repo,
		qaProvider: qa,
		reranker:   reranker,
		nlpClient:  nil, // Will be set via SetNLPClient
	}
}

// NewQueryEngineWithNLP creates a new query engine with NLP client
func NewQueryEngineWithNLP(repo *Repository, qa QAProvider, reranker Reranker, nlpClient *NLPClient) *QueryEngine {
	return &QueryEngine{
		repo:       repo,
		qaProvider: qa,
		reranker:   reranker,
		nlpClient:  nlpClient,
	}
}

// SetNLPClient sets the NLP client for Vietnamese tokenization
func (e *QueryEngine) SetNLPClient(client *NLPClient) {
	e.nlpClient = client
}

// QueryClassification represents the classification of a query
type QueryClassification struct {
	Category   int     `json:"category"` // 0: greeting, 1: legal, 2: invalid
	Confidence float64 `json:"confidence"`
	Reason     string  `json:"reason"`
}

// ProcessQuery analyzes a natural language legal query and returns relevant answers
func (e *QueryEngine) ProcessQuery(ctx context.Context, queryText string, includeDebug bool) (*QueryResult, error) {
	startTime := time.Now()

	debug := &QueryDebug{
		Query:   queryText,
		Timings: make(map[string]int64),
	}

	// Step 0a: Classify Query (skip non-legal queries)
	classifyStart := time.Now()
	classification, err := e.classifyQuery(ctx, queryText)
	if err != nil {
		fmt.Printf("Query classification error: %v, proceeding anyway\n", err)
	} else {
		debug.Timings["query_classification"] = time.Since(classifyStart).Milliseconds()
		fmt.Printf("Query Classification: category=%d, confidence=%.2f, reason=%s\n",
			classification.Category, classification.Confidence, classification.Reason)

		// Handle non-legal queries
		if classification.Category == 0 {
			// Greeting/system query - return helpful message
			return &QueryResult{
				Answers: []Answer{{
					Snippet: "Xin chào! Tôi là trợ lý pháp luật Việt Nam. Tôi có thể giúp bạn tra cứu các quy định pháp luật, tìm hiểu về luật lao động, hôn nhân gia đình, doanh nghiệp, đất đai và nhiều lĩnh vực khác. Hãy đặt câu hỏi về pháp luật để tôi hỗ trợ bạn!",
					Score:   1.0,
					Title:   "Hệ thống tư vấn pháp luật",
				}},
				Debug: debug,
			}, nil
		} else if classification.Category == 2 && classification.Confidence > 0.8 {
			// Invalid query - return error message
			return &QueryResult{
				Answers: []Answer{{
					Snippet: "Xin lỗi, tôi không thể xử lý câu hỏi này. Vui lòng đặt câu hỏi liên quan đến pháp luật Việt Nam.",
					Score:   0.0,
					Title:   "Không thể xử lý",
				}},
				Debug: debug,
			}, nil
		}
	}

	// Step 0b: Extract entities from query for filtering
	var extractedEntities *ExtractedEntities
	if e.nlpClient != nil {
		extractedEntities, err = e.nlpClient.ExtractEntities(ctx, queryText)
		if err != nil {
			fmt.Printf("Entity extraction error: %v\n", err)
		} else {
			fmt.Printf("Extracted entities: year=%v, docType=%v, keywords=%v\n",
				extractedEntities.Year, extractedEntities.DocumentType, extractedEntities.Keywords)
		}
	}

	// Step 0c: Rewrite Query (Agentic Step)
	rewriteStart := time.Now()
	queries, err := e.qaProvider.RewriteQuery(ctx, queryText)
	if err != nil {
		fmt.Printf("Error rewriting query: %v\n", err)
		queries = []string{queryText}
	}

	// Also expand query using NLP service if available
	if e.nlpClient != nil {
		expanded, err := e.nlpClient.ExpandQuery(ctx, queryText, 3)
		if err == nil {
			for _, v := range expanded.Variations {
				if v != queryText {
					queries = append(queries, v)
				}
			}
		}
	}

	debug.Timings["query_rewriting"] = time.Since(rewriteStart).Milliseconds()
	fmt.Printf("Original Query: %s\nExpanded Queries: %v\n", queryText, queries)

	// Step 1: Extract key terms from all query variations (with Vietnamese tokenization)
	termMap := make(map[string]bool)
	for _, q := range queries {
		qTerms := e.extractQueryTermsWithNLP(ctx, q)
		for _, t := range qTerms {
			termMap[t] = true
		}
	}

	// Add extracted keywords
	if extractedEntities != nil {
		for _, kw := range extractedEntities.Keywords {
			termMap[kw] = true
		}
	}

	var terms []string
	for t := range termMap {
		terms = append(terms, t)
	}
	debug.Timings["term_extraction"] = time.Since(startTime).Milliseconds() - debug.Timings["query_rewriting"]
	fmt.Printf("Combined Terms: %v\n", terms)

	stepStart := time.Now()

	// Step 2: Find candidates for each term
	allCandidates, err := e.findAllCandidates(ctx, terms)
	if err != nil {
		return nil, fmt.Errorf("finding candidates: %w", err)
	}
	debug.Candidates = allCandidates
	debug.Timings["candidate_search"] = time.Since(stepStart).Milliseconds()
	fmt.Printf("Candidates found: %d\n", len(allCandidates))

	stepStart = time.Now()

	// Step 3: Build query stars (Subject-Relation-Object patterns)
	stars := e.buildQueryStars(allCandidates)
	debug.Stars = stars
	debug.Timings["star_building"] = time.Since(stepStart).Milliseconds()
	fmt.Printf("Stars built: %d\n", len(stars))

	stepStart = time.Now()

	// Step 4: Execute each star to find matching triples
	for i := range stars {
		fmt.Printf("Executing star %d/%d\n", i+1, len(stars))
		triples, err := e.repo.FindTriplesByStar(ctx, stars[i])
		if err != nil {
			return nil, fmt.Errorf("executing star %d: %w", i, err)
		}
		stars[i].MatchingTriples = triples
		fmt.Printf("Star %d found %d triples\n", i+1, len(triples))
	}
	debug.Timings["triple_matching"] = time.Since(stepStart).Milliseconds()

	stepStart = time.Now()

	// Step 5: Combine and rank results
	answers := e.combineAndRankResults(stars, queryText)
	debug.Timings["initial_ranking"] = time.Since(stepStart).Milliseconds()

	// Step 6: Rerank with AI Model (if configured)
	if e.reranker != nil && len(answers) > 0 {
		rerankStart := time.Now()

		// Take top 30 for reranking to save tokens/latency
		candidatesToRerank := answers
		if len(candidatesToRerank) > 30 {
			candidatesToRerank = candidatesToRerank[:30]
		}

		var docs []string
		for _, ans := range candidatesToRerank {
			// Combine title and context for better reranking
			docText := fmt.Sprintf("Title: %s\nContent: %s", ans.Title, ans.Context)
			docs = append(docs, docText)
		}

		rerankResults, err := e.reranker.Rerank(ctx, queryText, docs)
		if err == nil {
			// Create a map of new scores
			scoreMap := make(map[int]float64)
			for _, res := range rerankResults {
				scoreMap[res.Index] = res.RelevanceScore
			}

			// Update scores and re-sort
			var rerankedAnswers []Answer
			for i, ans := range candidatesToRerank {
				if newScore, ok := scoreMap[i]; ok {
					ans.Score = float32(newScore) // Replace manual score with AI score
					rerankedAnswers = append(rerankedAnswers, ans)
				}
			}

			// Sort by new score
			sort.Slice(rerankedAnswers, func(i, j int) bool {
				return rerankedAnswers[i].Score > rerankedAnswers[j].Score
			})

			answers = rerankedAnswers
		} else {
			fmt.Printf("Reranking failed: %v\n", err)
		}
		debug.Timings["reranking"] = time.Since(rerankStart).Milliseconds()
	}

	debug.Timings["total"] = time.Since(startTime).Milliseconds()

	result := &QueryResult{
		Answers: answers,
	}

	if includeDebug {
		result.Debug = debug
	}

	return result, nil
}

// extractQueryTerms extracts meaningful terms from the query text
func (e *QueryEngine) extractQueryTerms(queryText string) []string {
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

// findAllCandidates finds concept and relation candidates for all query terms
func (e *QueryEngine) findAllCandidates(ctx context.Context, terms []string) ([]QueryCandidate, error) {
	var allCandidates []QueryCandidate

	for _, term := range terms {
		// Find concept candidates (subjects/objects)
		conceptCandidates, err := e.repo.FindConceptCandidates(ctx, term)
		if err != nil {
			return nil, fmt.Errorf("finding concept candidates for '%s': %w", term, err)
		}

		// Mark as potential subjects and objects
		for _, candidate := range conceptCandidates {
			// Add as subject candidate
			subjectCandidate := candidate
			subjectCandidate.Type = "subject"
			allCandidates = append(allCandidates, subjectCandidate)

			// Add as object candidate
			objectCandidate := candidate
			objectCandidate.Type = "object"
			allCandidates = append(allCandidates, objectCandidate)
		}

		// Find relation candidates
		relationCandidates, err := e.repo.FindRelationCandidates(ctx, term)
		if err != nil {
			return nil, fmt.Errorf("finding relation candidates for '%s': %w", term, err)
		}

		allCandidates = append(allCandidates, relationCandidates...)
	}

	// Deduplicate and sort by score
	candidateMap := make(map[string]QueryCandidate)
	for _, candidate := range allCandidates {
		key := fmt.Sprintf("%s_%s_%v_%v", candidate.Type, candidate.Name, candidate.ConceptID, candidate.RelationID)
		if existing, exists := candidateMap[key]; !exists || candidate.Score > existing.Score {
			candidateMap[key] = candidate
		}
	}

	var dedupedCandidates []QueryCandidate
	for _, candidate := range candidateMap {
		dedupedCandidates = append(dedupedCandidates, candidate)
	}

	sort.Slice(dedupedCandidates, func(i, j int) bool {
		return dedupedCandidates[i].Score > dedupedCandidates[j].Score
	})

	return dedupedCandidates, nil
}

// buildQueryStars creates star patterns from candidates
func (e *QueryEngine) buildQueryStars(candidates []QueryCandidate) []QueryStar {
	// Group candidates by type
	subjectCandidates := []QueryCandidate{}
	relationCandidates := []QueryCandidate{}
	objectCandidates := []QueryCandidate{}

	for _, candidate := range candidates {
		switch candidate.Type {
		case "subject":
			if len(subjectCandidates) < 5 { // Limit to top 5
				subjectCandidates = append(subjectCandidates, candidate)
			}
		case "relation":
			if len(relationCandidates) < 5 {
				relationCandidates = append(relationCandidates, candidate)
			}
		case "object":
			if len(objectCandidates) < 5 {
				objectCandidates = append(objectCandidates, candidate)
			}
		}
	}

	var stars []QueryStar

	// Create different star combinations

	// Star 1: All subjects, all relations, all objects (most comprehensive)
	if len(subjectCandidates) > 0 && len(relationCandidates) > 0 && len(objectCandidates) > 0 {
		stars = append(stars, QueryStar{
			SubjectCandidates:  subjectCandidates,
			RelationCandidates: relationCandidates,
			ObjectCandidates:   objectCandidates,
		})
	}

	// Star 2: Any subject, specific relations, any object (relation-focused)
	if len(relationCandidates) > 0 {
		stars = append(stars, QueryStar{
			SubjectCandidates:  subjectCandidates,
			RelationCandidates: relationCandidates[:min(2, len(relationCandidates))], // Top 2 relations
			ObjectCandidates:   objectCandidates,
		})
	}

	// Star 3: Specific subjects, any relation, any object (subject-focused)
	if len(subjectCandidates) > 0 {
		stars = append(stars, QueryStar{
			SubjectCandidates:  subjectCandidates[:min(3, len(subjectCandidates))], // Top 3 subjects
			RelationCandidates: relationCandidates,
			ObjectCandidates:   nil, // Allow any object
		})
	}

	// Star 4: Any subject, any relation, specific objects (object-focused)
	if len(objectCandidates) > 0 {
		stars = append(stars, QueryStar{
			SubjectCandidates:  nil, // Allow any subject
			RelationCandidates: relationCandidates,
			ObjectCandidates:   objectCandidates[:min(3, len(objectCandidates))], // Top 3 objects
		})
	}

	return stars
}

// combineAndRankResults combines results from all stars and ranks them
func (e *QueryEngine) combineAndRankResults(stars []QueryStar, queryText string) []Answer {
	tripleMap := make(map[string]TripleView)
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
			relevanceScore := e.calculateRelevanceScore(triple, queryText)

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
	var answers []Answer
	for tripleID, triple := range tripleMap {
		score := tripleScores[tripleID]
		snippet := e.generateSnippet(triple)

		answers = append(answers, Answer{
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
func (e *QueryEngine) calculateRelevanceScore(triple TripleView, queryText string) float32 {
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
		if len(word) > 2 && strings.Contains(unitTextLower, word) {
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

// generateSnippet creates a relevant snippet from the unit text
func (e *QueryEngine) generateSnippet(triple TripleView) string {
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

// classifyQuery uses NLP service to classify the query
func (e *QueryEngine) classifyQuery(ctx context.Context, queryText string) (*QueryClassification, error) {
	if e.nlpClient != nil {
		result, err := e.nlpClient.ClassifyQuery(ctx, queryText)
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
	return e.classifyQueryRuleBased(queryText), nil
}

// classifyQueryRuleBased uses simple rules when NLP service is unavailable
func (e *QueryEngine) classifyQueryRuleBased(queryText string) *QueryClassification {
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

// extractQueryTermsWithNLP extracts terms using Vietnamese tokenization
func (e *QueryEngine) extractQueryTermsWithNLP(ctx context.Context, queryText string) []string {
	// Try NLP service first
	if e.nlpClient != nil {
		result, err := e.nlpClient.Tokenize(ctx, queryText)
		if err == nil {
			// Use tokenized text for better Vietnamese word segmentation
			return e.extractQueryTerms(result.Tokenized)
		}
		fmt.Printf("NLP tokenization failed, falling back to basic: %v\n", err)
	}

	// Fallback to basic extraction
	return e.extractQueryTerms(queryText)
}

// cosineSimilarity calculates cosine similarity between two strings
func cosineSimilarity(a, b string) float64 {
	aWords := strings.Fields(strings.ToLower(a))
	bWords := strings.Fields(strings.ToLower(b))

	// Build word frequency maps
	aFreq := make(map[string]int)
	bFreq := make(map[string]int)

	for _, w := range aWords {
		aFreq[w]++
	}
	for _, w := range bWords {
		bFreq[w]++
	}

	// Calculate dot product and magnitudes
	var dotProduct, aMag, bMag float64

	// Get all unique words
	allWords := make(map[string]bool)
	for w := range aFreq {
		allWords[w] = true
	}
	for w := range bFreq {
		allWords[w] = true
	}

	for w := range allWords {
		aVal := float64(aFreq[w])
		bVal := float64(bFreq[w])
		dotProduct += aVal * bVal
		aMag += aVal * aVal
		bMag += bVal * bVal
	}

	if aMag == 0 || bMag == 0 {
		return 0
	}

	return dotProduct / (math.Sqrt(aMag) * math.Sqrt(bMag))
}

// jaccardSimilarity calculates Jaccard similarity between two strings
func jaccardSimilarity(a, b string) float64 {
	aWords := make(map[string]bool)
	bWords := make(map[string]bool)

	for _, w := range strings.Fields(strings.ToLower(a)) {
		aWords[w] = true
	}
	for _, w := range strings.Fields(strings.ToLower(b)) {
		bWords[w] = true
	}

	// Calculate intersection
	intersection := 0
	for w := range aWords {
		if bWords[w] {
			intersection++
		}
	}

	// Calculate union
	union := len(aWords) + len(bWords) - intersection

	if union == 0 {
		return 0
	}

	return float64(intersection) / float64(union)
}
