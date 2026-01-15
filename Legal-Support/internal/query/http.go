package query

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"example.com/legallaw/internal/ai/embedding"
	"example.com/legallaw/internal/ai/llm"
	"example.com/legallaw/internal/ai/nlp"
	"example.com/legallaw/internal/ai/search"
	"example.com/legallaw/internal/ai/tools"
	"example.com/legallaw/internal/config"
	"example.com/legallaw/internal/model"
	"example.com/legallaw/internal/repository"
	ingestSvc "example.com/legallaw/internal/service/ingest"
	querySvc "example.com/legallaw/internal/service/query"
)

type HTTP struct {
	engine   *querySvc.Service
	ingest   *ingestSvc.Service
	repo     *repository.Repository
	embedder embedding.EmbeddingProvider
}

func NewHTTP(db *pgxpool.Pool, embedder embedding.EmbeddingProvider, embeddingModel string, qa llm.QAProvider, cfg config.Config) *HTTP {
	repo := repository.NewRepository(db)
	reranker := search.NewHybridReranker(cfg.RerankAPIKeys, cfg.RerankModel, true)
	nlpClient := nlp.NewNLPClient(cfg.NLPServiceURL)

	engine := querySvc.NewService(repo, qa, reranker, nlpClient, embedder)
	ingest := ingestSvc.NewService(repo, embedder, embeddingModel)

	// Enable web search if configured
	if cfg.EnableWebSearchFallback && cfg.GoogleSearchAPIKey != "" && cfg.GoogleSearchEngineID != "" {
		webSearcher := tools.NewWebSearchClient(cfg.GoogleSearchAPIKey, cfg.GoogleSearchEngineID)
		engine.SetWebSearch(webSearcher)
	}

	return &HTTP{
		engine:   engine,
		ingest:   ingest,
		repo:     repo,
		embedder: embedder,
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
	var req ingestSvc.IngestRequest
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

	unit, document, err := h.engine.GetUnit(r.Context(), unitID)
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

	outbound, inbound, err := h.engine.GetCitations(r.Context(), unitID)
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

	filter := model.DocumentFilter{
		Types:     r.URL.Query()["type"],
		Status:    r.URL.Query().Get("status"),
		Authority: r.URL.Query().Get("authority"),
		YearFrom:  parseIntPointer(r.URL.Query().Get("year_from")),
		YearTo:    parseIntPointer(r.URL.Query().Get("year_to")),
	}

	docs, total, err := h.engine.ListDocuments(r.Context(), search, filter, limit, offset)
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

	units, total, err := h.engine.GetUnitsByDocument(r.Context(), docID, limit, offset)
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

	tree, err := h.engine.GetDocumentTree(r.Context(), docID)
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
	filter := model.UnitSearchFilter{
		Keyword:  keyword,
		DocTypes: r.URL.Query()["doc_type"],
		Levels:   r.URL.Query()["level"],
		YearFrom: parseIntPointer(r.URL.Query().Get("year_from")),
		YearTo:   parseIntPointer(r.URL.Query().Get("year_to")),
		Limit:    limit,
		Offset:   offset,
	}

	results, total, err := h.engine.SearchUnits(r.Context(), filter)
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
// POST /api/v1/query/rag
func (h *HTTP) handleRAG(w http.ResponseWriter, r *http.Request) {
	var req model.RagRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	result, err := h.engine.ProcessRAG(r.Context(), req)
	if err != nil {
		if err.Error() == "question is required" {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		http.Error(w, "RAG processing failed: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
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
