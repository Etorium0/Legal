package query

import (
	"context"
	"fmt"
	"log"
	"sort"
	"time"

	"github.com/google/uuid"

	"example.com/legallaw/internal/ai/embedding"
	"example.com/legallaw/internal/ai/llm"
	"example.com/legallaw/internal/ai/nlp"
	"example.com/legallaw/internal/ai/search"
	"example.com/legallaw/internal/model"
	"example.com/legallaw/internal/repository"
)

// Service handles legal query processing with subgraph matching
type Service struct {
	repo         *repository.Repository
	qaProvider   llm.QAProvider
	reranker     *search.HybridReranker
	nlpClient    *nlp.NLPClient
	embedder     embedding.EmbeddingProvider
	webSearcher  WebSearcher
	enableWebSearch bool
}

// WebSearcher interface for web search (Google, DuckDuckGo, etc.)
type WebSearcher interface {
	FallbackSearch(ctx context.Context, query string) (string, string, error)
}

// NewService creates a new query service
func NewService(repo *repository.Repository, qa llm.QAProvider, reranker *search.HybridReranker, nlpClient *nlp.NLPClient, embedder embedding.EmbeddingProvider) *Service {
	// Load frequent bigrams from database for keyword extraction
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	bigrams, err := repo.LoadFrequentBigrams(ctx, 3, 2000)
	if err != nil {
		log.Printf("[Service] Warning: Failed to load bigrams from database: %v", err)
	} else {
		SetDatabaseBigrams(bigrams)
		log.Printf("[Service] Successfully loaded %d bigrams for keyword extraction", len(bigrams))
	}

	return &Service{
		repo:       repo,
		qaProvider: qa,
		reranker:   reranker,
		nlpClient:  nlpClient,
		embedder:   embedder,
	}
}

// SetWebSearch enables web search fallback
func (s *Service) SetWebSearch(searcher WebSearcher) {
	s.webSearcher = searcher
	s.enableWebSearch = true
}

// ProcessQuery analyzes a natural language legal query and returns relevant answers
func (s *Service) ProcessQuery(ctx context.Context, queryText string, includeDebug bool) (*model.QueryResult, error) {
	startTime := time.Now()

	debug := &model.QueryDebug{
		Query:   queryText,
		Timings: make(map[string]int64),
	}

	// Step 0a: Classify Query (skip non-legal queries)
	classifyStart := time.Now()
	classification, err := s.classifyQuery(ctx, queryText)
	if err != nil {
		fmt.Printf("Query classification error: %v, proceeding anyway\n", err)
	} else {
		debug.Timings["query_classification"] = time.Since(classifyStart).Milliseconds()
		fmt.Printf("Query Classification: category=%d, confidence=%.2f, reason=%s\n",
			classification.Category, classification.Confidence, classification.Reason)

		// Handle non-legal queries
		if classification.Category == 0 {
			// Greeting/system query - return helpful message
			return &model.QueryResult{
				Answers: []model.Answer{{
					Snippet: "Xin chào! Tôi là trợ lý pháp luật Việt Nam. Tôi có thể giúp bạn tra cứu các quy định pháp luật, tìm hiểu về luật lao động, hôn nhân gia đình, doanh nghiệp, đất đai và nhiều lĩnh vực khác. Hãy đặt câu hỏi về pháp luật để tôi hỗ trợ bạn!",
					Score:   1.0,
					Title:   "Hệ thống tư vấn pháp luật",
				}},
				Debug: debug,
			}, nil
		} else if classification.Category == 2 && classification.Confidence > 0.8 {
			// Invalid query - return error message
			return &model.QueryResult{
				Answers: []model.Answer{{
					Snippet: "Xin lỗi, tôi không thể xử lý câu hỏi này. Vui lòng đặt câu hỏi liên quan đến pháp luật Việt Nam.",
					Score:   0.0,
					Title:   "Không thể xử lý",
				}},
				Debug: debug,
			}, nil
		}
	}

	// Step 0b: Extract entities from query for filtering
	var extractedEntities *nlp.ExtractedEntities
	if s.nlpClient != nil {
		extractedEntities, err = s.nlpClient.ExtractEntities(ctx, queryText)
		if err != nil {
			fmt.Printf("Entity extraction error: %v\n", err)
		} else {
			fmt.Printf("Extracted entities: year=%v, docType=%v, keywords=%v\n",
				extractedEntities.Year, extractedEntities.DocumentType, extractedEntities.Keywords)
		}
	}

	// Step 0c: Rewrite Query (Agentic Step)
	rewriteStart := time.Now()
	queries, err := s.qaProvider.RewriteQuery(ctx, queryText)
	if err != nil {
		fmt.Printf("Error rewriting query: %v\n", err)
		queries = []string{queryText}
	}

	// Also expand query using NLP service if available
	if s.nlpClient != nil {
		expanded, err := s.nlpClient.ExpandQuery(ctx, queryText, 3)
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
		qTerms := s.extractQueryTermsWithNLP(ctx, q)
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
	allCandidates, err := s.findAllCandidates(ctx, terms)
	if err != nil {
		return nil, fmt.Errorf("finding candidates: %w", err)
	}
	debug.Candidates = allCandidates
	debug.Timings["candidate_search"] = time.Since(stepStart).Milliseconds()
	fmt.Printf("Candidates found: %d\n", len(allCandidates))

	stepStart = time.Now()

	// Step 3: Build query stars (Subject-Relation-Object patterns)
	stars := s.buildQueryStars(allCandidates)
	debug.Stars = stars
	debug.Timings["star_building"] = time.Since(stepStart).Milliseconds()
	fmt.Printf("Stars built: %d\n", len(stars))

	stepStart = time.Now()

	// Step 4: Execute each star to find matching triples
	for i := range stars {
		fmt.Printf("Executing star %d/%d\n", i+1, len(stars))
		triples, err := s.repo.FindTriplesByStar(ctx, stars[i])
		if err != nil {
			return nil, fmt.Errorf("executing star %d: %w", i, err)
		}
		stars[i].MatchingTriples = triples
		fmt.Printf("Star %d found %d triples\n", i+1, len(triples))
	}
	debug.Timings["triple_matching"] = time.Since(stepStart).Milliseconds()

	stepStart = time.Now()

	// Step 5: Combine and rank results
	answers := s.combineAndRankResults(stars, queryText)
	debug.Timings["initial_ranking"] = time.Since(stepStart).Milliseconds()

	// Step 6: Rerank with AI Model (if configured)
	if s.reranker != nil && len(answers) > 0 {
		rerankStart := time.Now()

		// Take top 30 for reranking to save tokens/latency
		candidatesToRerank := answers
		if len(candidatesToRerank) > 30 {
			candidatesToRerank = candidatesToRerank[:30]
		}

		var docs []string
		for _, ans := range candidatesToRerank {
			// Combine title and context for better reranking
			ctxVal := ""
			if ans.Context != nil {
				ctxVal = *ans.Context
			}
			docText := fmt.Sprintf("Title: %s\nContent: %s", ans.Title, ctxVal)
			docs = append(docs, docText)
		}

		rerankResults, err := s.reranker.Rerank(ctx, queryText, docs)
		if err == nil {
			// Create a map of new scores
			scoreMap := make(map[int]float64)
			for _, res := range rerankResults {
				scoreMap[res.Index] = res.RelevanceScore
			}

			// Update scores and re-sort
			var rerankedAnswers []model.Answer
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

	result := &model.QueryResult{
		Answers: answers,
	}

	if includeDebug {
		result.Debug = debug
	}

	return result, nil
}

// ListDocuments returns documents with optional search and pagination
func (s *Service) ListDocuments(ctx context.Context, search string, filter model.DocumentFilter, limit, offset int) ([]model.Document, int, error) {
	return s.repo.SearchDocuments(ctx, search, filter, limit, offset)
}

// GetUnitsByDocument returns units for a document id with pagination
func (s *Service) GetUnitsByDocument(ctx context.Context, docID uuid.UUID, limit, offset int) ([]model.Unit, int, error) {
	return s.repo.GetUnitsByDocument(ctx, docID, limit, offset)
}

// GetDocumentTree returns nested units for a document
func (s *Service) GetDocumentTree(ctx context.Context, docID uuid.UUID) ([]model.UnitTree, error) {
	return s.repo.GetUnitTreeByDocument(ctx, docID)
}

// SearchUnits performs keyword search across units
func (s *Service) SearchUnits(ctx context.Context, filter model.UnitSearchFilter) ([]model.UnitView, int, error) {
	return s.repo.SearchUnits(ctx, filter)
}

// GetUnit retrieves a single unit by ID along with its document info
func (s *Service) GetUnit(ctx context.Context, unitID uuid.UUID) (*model.Unit, *model.Document, error) {
	return s.repo.GetUnitsWithDocument(ctx, unitID)
}

// GetCitations returns outbound and inbound citations for a unit
func (s *Service) GetCitations(ctx context.Context, unitID uuid.UUID) ([]model.CitationView, []model.CitationView, error) {
	return s.repo.GetCitations(ctx, unitID)
}
