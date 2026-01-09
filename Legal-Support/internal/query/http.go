package query

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"example.com/legallaw/internal/config"
	"example.com/legallaw/internal/graph"
)

type HTTP struct {
	db             *pgxpool.Pool
	repo           *graph.Repository
	engine         *graph.QueryEngine
	ingest         *graph.IngestionService
	embedder       graph.EmbeddingProvider
	embeddingModel string
	qa             graph.QAProvider
	nlpClient      *graph.NLPClient
}

func NewHTTP(db *pgxpool.Pool, embedder graph.EmbeddingProvider, embeddingModel string, qa graph.QAProvider, cfg config.Config) *HTTP {
	repo := graph.NewRepository(db)
	reranker := graph.NewCohereReranker(cfg.RerankAPIKeys, cfg.RerankModel)

	// Initialize NLP client for Vietnamese tokenization
	nlpClient := graph.NewNLPClient(cfg.NLPServiceURL)

	// Create query engine with NLP support
	engine := graph.NewQueryEngineWithNLP(repo, qa, reranker, nlpClient)
	ingest := graph.NewIngestionService(repo, embedder, embeddingModel)

	return &HTTP{
		db:             db,
		repo:           repo,
		engine:         engine,
		ingest:         ingest,
		embedder:       embedder,
		embeddingModel: embeddingModel,
		qa:             qa,
		nlpClient:      nlpClient,
	}
}

func (h *HTTP) Routes() chi.Router {
	r := chi.NewRouter()

	// Query endpoint - POST /api/v1/query
	r.Post("/", h.handleQuery)

	// Documents listing
	r.Get("/documents", h.handleListDocuments)
	// Units under a document
	r.Get("/documents/{id}/units", h.handleListUnitsByDocument)
	// Hierarchical tree of units
	r.Get("/documents/{id}/tree", h.handleDocumentTree)
	// Recommendation / keyword search across units
	r.Get("/recommend", h.handleRecommend)
	// Semantic RAG search using embeddings
	r.Post("/rag", h.handleRAG)

	// Ingestion endpoint - POST /api/v1/ingest
	r.Post("/ingest", h.handleIngest)

	// Unit retrieval - GET /api/v1/units/{id}
	r.Get("/units/{id}", h.handleGetUnit)
	// Citations for a unit
	r.Get("/units/{id}/citations", h.handleCitations)

	return r
}

type QueryRequest struct {
	Text  string `json:"text"`
	Debug *bool  `json:"debug,omitempty"`
}

type RagRequest struct {
	Question string   `json:"question"`
	TopK     int      `json:"top_k,omitempty"`
	DocTypes []string `json:"doc_type,omitempty"`
	Levels   []string `json:"level,omitempty"`
	YearFrom *int     `json:"year_from,omitempty"`
	YearTo   *int     `json:"year_to,omitempty"`
	Answer   bool     `json:"answer,omitempty"`
}

func (h *HTTP) handleQuery(w http.ResponseWriter, r *http.Request) {
	var req QueryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	if req.Text == "" {
		http.Error(w, "Query text is required", http.StatusBadRequest)
		return
	}

	includeDebug := req.Debug != nil && *req.Debug

	result, err := h.engine.ProcessQuery(r.Context(), req.Text, includeDebug)
	if err != nil {
		http.Error(w, "Query processing failed: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	json.NewEncoder(w).Encode(result)
}

func (h *HTTP) handleIngest(w http.ResponseWriter, r *http.Request) {
	var req graph.IngestRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	if req.Document.Title == "" || req.Document.Type == "" {
		http.Error(w, "Document title and type are required", http.StatusBadRequest)
		return
	}

	if len(req.Units) == 0 {
		http.Error(w, "At least one unit is required", http.StatusBadRequest)
		return
	}

	response, err := h.ingest.IngestLegalContent(r.Context(), req)
	if err != nil {
		http.Error(w, "Ingestion failed: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(response)
}

func (h *HTTP) handleGetUnit(w http.ResponseWriter, r *http.Request) {
	unitIDStr := chi.URLParam(r, "id")
	if unitIDStr == "" {
		http.Error(w, "Unit ID is required", http.StatusBadRequest)
		return
	}

	unitID, err := uuid.Parse(unitIDStr)
	if err != nil {
		http.Error(w, "Invalid unit ID format", http.StatusBadRequest)
		return
	}

	unit, document, err := h.repo.GetUnitsWithDocument(r.Context(), unitID)
	if err != nil {
		if err.Error() == "no rows in result set" {
			http.Error(w, "Unit not found", http.StatusNotFound)
			return
		}
		http.Error(w, "Failed to retrieve unit: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Prepare response with unit and document information
	response := map[string]interface{}{
		"unit":     unit,
		"document": document,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// handleCitations returns outbound and inbound citations for a unit
// GET /api/v1/query/units/{id}/citations
func (h *HTTP) handleCitations(w http.ResponseWriter, r *http.Request) {
	unitIDStr := chi.URLParam(r, "id")
	if unitIDStr == "" {
		http.Error(w, "Unit ID is required", http.StatusBadRequest)
		return
	}

	unitID, err := uuid.Parse(unitIDStr)
	if err != nil {
		http.Error(w, "Invalid unit ID format", http.StatusBadRequest)
		return
	}

	outbound, inbound, err := h.repo.GetCitations(r.Context(), unitID)
	if err != nil {
		http.Error(w, "Failed to retrieve citations: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"outbound": outbound,
		"inbound":  inbound,
	})
}

// handleListDocuments returns documents with optional search and pagination
// GET /api/v1/query/documents?search=...&limit=20&offset=0
func (h *HTTP) handleListDocuments(w http.ResponseWriter, r *http.Request) {
	search := r.URL.Query().Get("search")
	limit := parseIntDefault(r.URL.Query().Get("limit"), 20)
	offset := parseIntDefault(r.URL.Query().Get("offset"), 0)

	filter := graph.DocumentFilter{
		Types:     r.URL.Query()["type"],
		Status:    r.URL.Query().Get("status"),
		Authority: r.URL.Query().Get("authority"),
		YearFrom:  parseIntPointer(r.URL.Query().Get("year_from")),
		YearTo:    parseIntPointer(r.URL.Query().Get("year_to")),
	}

	docs, total, err := h.repo.SearchDocuments(r.Context(), search, filter, limit, offset)
	if err != nil {
		http.Error(w, "Failed to retrieve documents: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"items":  docs,
		"total":  total,
		"limit":  limit,
		"offset": offset,
	})
}

// handleListUnitsByDocument returns units for a document id with pagination
// GET /api/v1/query/documents/{id}/units?limit=50&offset=0
func (h *HTTP) handleListUnitsByDocument(w http.ResponseWriter, r *http.Request) {
	docIDStr := chi.URLParam(r, "id")
	if docIDStr == "" {
		http.Error(w, "Document ID is required", http.StatusBadRequest)
		return
	}

	docID, err := uuid.Parse(docIDStr)
	if err != nil {
		http.Error(w, "Invalid document ID format", http.StatusBadRequest)
		return
	}

	limit := parseIntDefault(r.URL.Query().Get("limit"), 50)
	offset := parseIntDefault(r.URL.Query().Get("offset"), 0)

	units, total, err := h.repo.GetUnitsByDocument(r.Context(), docID, limit, offset)
	if err != nil {
		http.Error(w, "Failed to retrieve units: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"items":  units,
		"total":  total,
		"limit":  limit,
		"offset": offset,
	})
}

// handleDocumentTree returns nested units for a document
// GET /api/v1/query/documents/{id}/tree
func (h *HTTP) handleDocumentTree(w http.ResponseWriter, r *http.Request) {
	docIDStr := chi.URLParam(r, "id")
	if docIDStr == "" {
		http.Error(w, "Document ID is required", http.StatusBadRequest)
		return
	}

	docID, err := uuid.Parse(docIDStr)
	if err != nil {
		http.Error(w, "Invalid document ID format", http.StatusBadRequest)
		return
	}

	tree, err := h.repo.GetUnitTreeByDocument(r.Context(), docID)
	if err != nil {
		http.Error(w, "Failed to retrieve document tree: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"items": tree,
	})
}

// handleRecommend performs keyword search across units (articles) and returns snippets
// GET /api/v1/query/recommend?keyword=...&limit=10&offset=0
func (h *HTTP) handleRecommend(w http.ResponseWriter, r *http.Request) {
	keyword := r.URL.Query().Get("keyword")
	if keyword == "" {
		http.Error(w, "keyword is required", http.StatusBadRequest)
		return
	}

	limit := parseIntDefault(r.URL.Query().Get("limit"), 10)
	offset := parseIntDefault(r.URL.Query().Get("offset"), 0)
	filter := graph.UnitSearchFilter{
		Keyword:  keyword,
		DocTypes: r.URL.Query()["doc_type"],
		Levels:   r.URL.Query()["level"],
		YearFrom: parseIntPointer(r.URL.Query().Get("year_from")),
		YearTo:   parseIntPointer(r.URL.Query().Get("year_to")),
		Limit:    limit,
		Offset:   offset,
	}

	results, total, err := h.repo.SearchUnits(r.Context(), filter)
	if err != nil {
		http.Error(w, "Failed to search units: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Build lightweight response with snippet
	items := make([]map[string]interface{}, 0, len(results))
	for _, u := range results {
		snippet := u.Text
		if len(snippet) > 320 {
			snippet = snippet[:320] + "..."
		}
		items = append(items, map[string]interface{}{
			"unit_id":        u.ID,
			"document_id":    u.DocumentID,
			"document_title": u.DocumentTitle,
			"code":           u.Code,
			"level":          u.Level,
			"snippet":        snippet,
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"items":  items,
		"total":  total,
		"limit":  limit,
		"offset": offset,
	})
}

// handleRAG performs Knowledge Graph + semantic hybrid search.
// Theory:
// 1. Parse question → extract keywords
// 2. Map keywords → triples (subject/object/relation names)
// 3. Rank triples by keyword matches, TF-IDF, confidence
// 4. Get source units with citations
// 5. Generate answer from context
// POST /api/v1/query/rag
func (h *HTTP) handleRAG(w http.ResponseWriter, r *http.Request) {
	if h.embedder == nil {
		http.Error(w, "Embedding provider not configured", http.StatusNotImplemented)
		return
	}

	var req RagRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	if strings.TrimSpace(req.Question) == "" {
		http.Error(w, "question is required", http.StatusBadRequest)
		return
	}

	topK := req.TopK
	if topK <= 0 {
		topK = 10
	}
	if topK > 50 {
		topK = 50
	}

	// 1. Extract keywords from question (limit to top 10)
	keywords := extractMeaningfulWords(req.Question)
	if len(keywords) > 10 {
		keywords = keywords[:10] // Keep only top 10 most meaningful
	}

	// Expand keywords with legal synonyms using AI (Gemini)
	expandedKeywords, err := h.qa.ExpandKeywords(r.Context(), req.Question, keywords)
	if err != nil {
		log.Printf("[RAG] Keyword expansion error: %v", err)
	} else {
		keywords = expandedKeywords
	}

	log.Printf("[RAG] Question: %s", req.Question)
	log.Printf("[RAG] Extracted keywords: %v", keywords)

	var results []graph.UnitSimilarityView
	var total int

	// 2. Knowledge Graph Search: Find triples matching keywords
	if len(keywords) > 0 {
		tripleResults, err := h.repo.SearchTriplesByKeywords(r.Context(), keywords, topK*3)
		if err != nil {
			log.Printf("[RAG] Triple search error: %v", err)
		} else if len(tripleResults) > 0 {
			log.Printf("[RAG] Found %d matching triples from Knowledge Graph", len(tripleResults))
			// Log top triples for debugging
			for i, tr := range tripleResults {
				if i < 5 {
					log.Printf("[RAG] Triple %d: [%s] --%s--> [%s] (score: %.2f, matches: %d, doc: %s)",
						i+1, truncate(tr.SubjectName, 50), tr.RelationName, truncate(tr.ObjectName, 50),
						tr.MatchScore, tr.KeywordMatches, tr.DocRef)
				}
			}

			// 3. Get units from triples
			kgResults, err := h.repo.GetUnitsByTriples(r.Context(), tripleResults, topK)
			if err != nil {
				log.Printf("[RAG] GetUnitsByTriples error: %v", err)
			} else {
				results = kgResults
				total = len(kgResults)
				log.Printf("[RAG] Got %d units from Knowledge Graph", len(kgResults))
			}
		}
	}

	// 4. Fallback: Semantic + Keyword search if KG didn't find enough results
	if len(results) < topK/2 {
		log.Printf("[RAG] Knowledge Graph found only %d results, adding semantic + keyword search", len(results))

		// 4a. Keyword-based text search (high precision)
		// Use up to 10 keywords to ensure crime names + mitigating factors are both searched
		searchKeywords := keywords
		if len(searchKeywords) > 10 {
			searchKeywords = searchKeywords[:10]
		}
		if len(searchKeywords) > 0 {
			keywordResults, err := h.repo.SearchUnitsByKeywords(r.Context(), searchKeywords, topK*2) // Get more results
			if err != nil {
				log.Printf("[RAG] Keyword search error: %v", err)
			} else if len(keywordResults) > 0 {
				log.Printf("[RAG] Keyword search found %d results with keywords: %v", len(keywordResults), searchKeywords)
				results = mergeSearchResults(results, keywordResults, topK)
			}
		}

		// 4b. Semantic embedding search (if still need more results)
		if len(results) < topK/2 {
			emb, err := h.embedder.Embed(r.Context(), req.Question)
			if err != nil {
				log.Printf("[RAG] Embedding error: %v", err)
			} else {
				filter := graph.UnitSearchFilter{
					DocTypes: req.DocTypes,
					Levels:   req.Levels,
					YearFrom: req.YearFrom,
					YearTo:   req.YearTo,
					Limit:    topK,
					Offset:   0,
				}

				semanticResults, semTotal, err := h.repo.SearchUnitsByEmbedding(r.Context(), emb, filter)
				if err != nil {
					log.Printf("[RAG] Semantic search error: %v", err)
				} else {
					log.Printf("[RAG] Semantic search found %d results", len(semanticResults))
					// Merge: KG results first, then semantic (deduplicated)
					results = mergeSearchResults(results, semanticResults, topK)
					if semTotal > total {
						total = semTotal
					}
				}
			}
		}
	}

	// 5. Build answer from context
	answerText := ""
	if req.Answer && h.qa != nil && len(results) > 0 {
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
			answerText, qaErr = h.qa.Answer(r.Context(), req.Question, ctxStr)
			if qaErr != nil {
				log.Printf("[RAG] QA error: %v", qaErr)
			}
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

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"items":  items,
		"total":  total,
		"limit":  topK,
		"offset": 0,
		"answer": answerText,
	})
}

func parseIntDefault(s string, def int) int {
	if s == "" {
		return def
	}
	var v int
	if _, err := fmt.Sscanf(s, "%d", &v); err != nil {
		return def
	}
	return v
}

func parseIntPointer(s string) *int {
	if s == "" {
		return nil
	}
	var v int
	if _, err := fmt.Sscanf(s, "%d", &v); err != nil {
		return nil
	}
	return &v
}

// Vietnamese stopwords to filter out
var vietnameseStopwords = map[string]bool{
	"và": true, "của": true, "là": true, "có": true, "được": true,
	"trong": true, "cho": true, "với": true, "này": true, "để": true,
	"những": true, "các": true, "một": true, "không": true, "như": true,
	"khi": true, "về": true, "từ": true, "theo": true, "đã": true,
	"sẽ": true, "còn": true, "hay": true, "hoặc": true, "nếu": true,
	"thì": true, "mà": true, "bị": true, "đến": true, "tại": true,
	"sau": true, "trước": true, "nào": true, "ai": true, "gì": true,
	"sao": true, "thế": true, "vậy": true, "đây": true, "đó": true,
	"tôi": true, "bạn": true, "anh": true, "chị": true, "em": true,
	"ông": true, "bà": true, "họ": true, "chúng": true, "mình": true,
	"rồi": true, "rất": true, "quá": true, "lắm": true, "nhiều": true,
	"ít": true, "hơn": true, "nhất": true, "cũng": true, "vẫn": true,
	"đang": true, "phải": true, "cần": true, "nên": true, "muốn": true,
	"biết": true, "thấy": true, "làm": true, "đi": true, "ra": true,
	"vào": true, "lên": true, "xuống": true, "năm": true, "ngày": true,
	"tháng": true, "thế nào": true, "như thế nào": true, "bao nhiêu": true,
}

// legalKeywords are important legal terms that should always be kept (both diacritic and non-diacritic)
// Since DB has text_unaccent column, we can search directly with non-diacritic input
var legalKeywords = map[string]bool{
	// Vietnamese with diacritics
	"tội": true, "phạm": true, "tội phạm": true, "phạm tội": true,
	"giết": true, "người": true, "giết người": true, "tội giết người": true,
	"tự thú": true, "đầu thú": true, "ra tự thú": true, "ra đầu thú": true,
	"trốn": true, "bỏ trốn": true,
	"hình phạt": true, "phạt": true, "tù": true, "án": true, "mức án": true, "mức phạt": true,
	"giảm nhẹ": true, "tăng nặng": true, "tình tiết": true,
	"điều": true, "luật": true, "nghị định": true, "thông tư": true,
	"bộ luật": true, "hình sự": true, "dân sự": true,
	"vi phạm": true, "xử phạt": true, "xử lý": true,
	"khởi tố": true, "điều tra": true, "truy tố": true, "xét xử": true,
	"bị cáo": true, "bị hại": true, "bị can": true,
	"giao thông": true, "mũ bảo hiểm": true, "xe máy": true, "xe mô tô": true,
	"chung thân": true, "tử hình": true, "phạt tù": true, "năm tù": true,
	"hủy hoại": true, "chiếm đoạt": true, "tài sản": true, "trộm cắp": true, "cướp": true,
	"hợp đồng": true, "thuê": true, "tiền cọc": true, "nợ": true, "tranh chấp": true,
	"bồi thường": true, "thiệt hại": true,
	// Non-diacritic versions (for matching in extractMeaningfulWords)
	"toi": true, "pham": true, "toi pham": true, "pham toi": true,
	"giet": true, "nguoi": true, "giet nguoi": true,
	"tu thu": true, "dau thu": true, "tron": true,
	"hinh phat": true, "tu": true, "an": true,
	"giam nhe": true, "tang nang": true, "tinh tiet": true,
	"dieu": true, "luat": true, "nghi dinh": true, "thong tu": true,
	"bo luat": true, "hinh su": true, "dan su": true,
	"vi pham": true, "xu phat": true, "xu ly": true,
	"khoi to": true, "dieu tra": true, "truy to": true, "xet xu": true,
	"bi cao": true, "bi hai": true, "bi can": true,
	"giao thong": true, "mu bao hiem": true, "xe may": true,
	"chung than": true, "tu hinh": true, "phat tu": true, "nam tu": true,
	"huy hoai": true, "chiem doat": true, "tai san": true, "trom cap": true, "cuop": true,
	"hop dong": true, "thue": true, "tien coc": true, "no": true, "tranh chap": true,
	"boi thuong": true, "thiet hai": true,
}

// extractMeaningfulWords extracts meaningful words AND bi-grams from Vietnamese text
// Since DB uses text_unaccent column, both diacritic and non-diacritic input will work
func extractMeaningfulWords(text string) []string {
	// Normalize text
	text = strings.ToLower(text)

	// Split into words (simple whitespace split)
	words := strings.Fields(text)

	// Clean words first
	var cleanWords []string
	for _, word := range words {
		word = strings.Trim(word, ".,;:!?\"'()[]{}…")
		if word != "" {
			cleanWords = append(cleanWords, word)
		}
	}

	var meaningful []string
	seen := make(map[string]bool)

	// 1. First check for known legal phrases (bi-grams) - both diacritic and non-diacritic
	for i := 0; i < len(cleanWords)-1; i++ {
		bigram := cleanWords[i] + " " + cleanWords[i+1]
		if legalKeywords[bigram] && !seen[bigram] {
			seen[bigram] = true
			meaningful = append(meaningful, bigram)
		}
	}

	// 2. Then extract general bi-grams
	for i := 0; i < len(cleanWords)-1; i++ {
		bigram := cleanWords[i] + " " + cleanWords[i+1]
		// Skip if EITHER word is a stopword (more aggressive filtering)
		if vietnameseStopwords[cleanWords[i]] || vietnameseStopwords[cleanWords[i+1]] {
			continue
		}
		if !seen[bigram] {
			seen[bigram] = true
			meaningful = append(meaningful, bigram)
		}
	}

	// 3. Then add single meaningful words (legal keywords first)
	for _, word := range cleanWords {
		if legalKeywords[word] && !seen[word] {
			seen[word] = true
			meaningful = append(meaningful, word)
		}
	}

	// 4. Finally add other single meaningful words
	for _, word := range cleanWords {
		// Skip if too short (less than 2 chars) or is stopword
		if len(word) < 2 || vietnameseStopwords[word] {
			continue
		}

		// Skip numbers only
		if isNumeric(word) {
			continue
		}

		// Skip duplicates
		if seen[word] {
			continue
		}
		seen[word] = true

		meaningful = append(meaningful, word)
	}

	return meaningful
}

// isNumeric checks if a string contains only digits
func isNumeric(s string) bool {
	for _, c := range s {
		if c < '0' || c > '9' {
			return false
		}
	}
	return len(s) > 0
}

// truncate shortens a string to max length with ellipsis
func truncate(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen] + "..."
}

// mergeSearchResults combines keyword and semantic results, removing duplicates
func mergeSearchResults(keyword, semantic []graph.UnitSimilarityView, limit int) []graph.UnitSimilarityView {
	seen := make(map[uuid.UUID]bool)
	var results []graph.UnitSimilarityView

	// Add keyword results first (they're more precise)
	for _, r := range keyword {
		if !seen[r.ID] {
			seen[r.ID] = true
			results = append(results, r)
		}
	}

	// Add semantic results
	for _, r := range semantic {
		if !seen[r.ID] {
			seen[r.ID] = true
			results = append(results, r)
		}
	}

	if len(results) > limit {
		results = results[:limit]
	}

	return results
}
