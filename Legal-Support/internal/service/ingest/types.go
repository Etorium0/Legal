package ingest

import (
	"github.com/google/uuid"
)

// IngestRequest represents a request to ingest legal content
type IngestRequest struct {
	Document       DocumentRequest   `json:"document"`
	Units          []UnitRequest     `json:"units"`
	Concepts       []ConceptRequest  `json:"concepts,omitempty"`
	Relations      []RelationRequest `json:"relations,omitempty"`
	Triples        []TripleRequest   `json:"triples,omitempty"`
	AutoEmbed      *bool             `json:"auto_embed,omitempty"`
	EmbeddingModel string            `json:"embedding_model,omitempty"`
}

// DocumentRequest represents document data for ingestion
type DocumentRequest struct {
	Title     string  `json:"title"`
	Type      string  `json:"type"`
	Number    *string `json:"number,omitempty"`
	Year      *int    `json:"year,omitempty"`
	Authority *string `json:"authority,omitempty"`
}

// UnitRequest represents a unit of legal text for ingestion
type UnitRequest struct {
	Level      string  `json:"level"`
	Code       *string `json:"code,omitempty"`
	Text       string  `json:"text"`
	ParentCode *string `json:"parent_code,omitempty"`
	OrderIndex int     `json:"order_index"`
}

// ConceptRequest represents a concept for ingestion
type ConceptRequest struct {
	Name     string   `json:"name"`
	Synonyms []string `json:"synonyms,omitempty"`
	Type     string   `json:"type,omitempty"`
}

// RelationRequest represents a relation for ingestion
type RelationRequest struct {
	Name     string   `json:"name"`
	Keywords []string `json:"keywords,omitempty"`
	Type     string   `json:"type,omitempty"`
}

// TripleRequest represents a triple for ingestion
type TripleRequest struct {
	Subject  string   `json:"subject"`
	Relation string   `json:"relation"`
	Object   string   `json:"object"`
	UnitCode string   `json:"unit_code"`
	DocRef   string   `json:"doc_ref"`
	TfIdf    *float32 `json:"tfidf,omitempty"`
	Context  *string  `json:"context,omitempty"`
}

// IngestResponse represents the response from ingestion
type IngestResponse struct {
	DocumentID        uuid.UUID `json:"document_id"`
	UnitsCreated      int       `json:"units_created"`
	TriplesCreated    int       `json:"triples_created"`
	ConceptsCreated   int       `json:"concepts_created"`
	RelationsCreated  int       `json:"relations_created"`
	EmbeddingsCreated int       `json:"embeddings_created"`
	ProcessingSummary string    `json:"processing_summary"`
}
