package law

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"example.com/legallaw/internal/graph"
)

// HTTP exposes document/unit endpoints for law metadata service.
type HTTP struct {
	repo *graph.Repository
}

// NewHTTP builds the law HTTP handler.
func NewHTTP(repo *graph.Repository) *HTTP {
	return &HTTP{repo: repo}
}

// Routes registers all law routes.
func (h *HTTP) Routes() chi.Router {
	r := chi.NewRouter()

	r.Get("/documents", h.handleSearchDocuments)
	r.Post("/documents", h.handleCreateDocument)
	r.Get("/documents/{id}", h.handleGetDocument)
	r.Patch("/documents/{id}", h.handleUpdateDocument)
	r.Get("/documents/{id}/units", h.handleListUnits)
	r.Get("/documents/{id}/tree", h.handleDocumentTree)

	return r
}

func (h *HTTP) handleSearchDocuments(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	search := strings.TrimSpace(q.Get("search"))
	limit := parseIntDefault(q.Get("limit"), 50)
	offset := parseIntDefault(q.Get("offset"), 0)
	filter := graph.DocumentFilter{
		Types:     q["type"],
		Status:    q.Get("status"),
		Authority: q.Get("authority"),
		YearFrom:  parseIntPointer(q.Get("year_from")),
		YearTo:    parseIntPointer(q.Get("year_to")),
	}

	docs, total, err := h.repo.SearchDocuments(r.Context(), search, filter, limit, offset)
	if err != nil {
		http.Error(w, "failed to search documents: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"items":  docs,
		"total":  total,
		"limit":  limit,
		"offset": offset,
	})
}

func (h *HTTP) handleCreateDocument(w http.ResponseWriter, r *http.Request) {
	var req graph.Document
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid JSON", http.StatusBadRequest)
		return
	}
	req.Title = strings.TrimSpace(req.Title)
	if req.Title == "" {
		http.Error(w, "title is required", http.StatusBadRequest)
		return
	}
	if err := h.repo.CreateDocument(r.Context(), &req); err != nil {
		http.Error(w, "failed to create document: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(req)
}

func (h *HTTP) handleGetDocument(w http.ResponseWriter, r *http.Request) {
	docID, err := parseUUID(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "invalid document id", http.StatusBadRequest)
		return
	}

	doc, err := h.repo.GetDocument(r.Context(), docID)
	if err != nil {
		http.Error(w, "document not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(doc)
}

func (h *HTTP) handleUpdateDocument(w http.ResponseWriter, r *http.Request) {
	docID, err := parseUUID(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "invalid document id", http.StatusBadRequest)
		return
	}

	var req graph.Document
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid JSON", http.StatusBadRequest)
		return
	}
	req.ID = docID
	req.Title = strings.TrimSpace(req.Title)
	if req.Title == "" {
		http.Error(w, "title is required", http.StatusBadRequest)
		return
	}

	if err := h.repo.UpdateDocument(r.Context(), &req); err != nil {
		http.Error(w, "failed to update document: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(req)
}

func (h *HTTP) handleListUnits(w http.ResponseWriter, r *http.Request) {
	docID, err := parseUUID(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "invalid document id", http.StatusBadRequest)
		return
	}
	limit := parseIntDefault(r.URL.Query().Get("limit"), 50)
	offset := parseIntDefault(r.URL.Query().Get("offset"), 0)

	units, total, err := h.repo.GetUnitsByDocument(r.Context(), docID, limit, offset)
	if err != nil {
		http.Error(w, "failed to retrieve units: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"items":  units,
		"total":  total,
		"limit":  limit,
		"offset": offset,
	})
}

func (h *HTTP) handleDocumentTree(w http.ResponseWriter, r *http.Request) {
	docID, err := parseUUID(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "invalid document id", http.StatusBadRequest)
		return
	}

	tree, err := h.repo.GetUnitTreeByDocument(r.Context(), docID)
	if err != nil {
		http.Error(w, "failed to retrieve document tree: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{"items": tree})
}

func parseIntDefault(s string, def int) int {
	if s == "" {
		return def
	}
	v, err := strconv.Atoi(s)
	if err != nil {
		return def
	}
	return v
}

func parseIntPointer(s string) *int {
	if s == "" {
		return nil
	}
	v, err := strconv.Atoi(s)
	if err != nil {
		return nil
	}
	return &v
}

func parseUUID(s string) (uuid.UUID, error) {
	return uuid.Parse(strings.TrimSpace(s))
}
