package model

import (
	"time"

	"github.com/google/uuid"
)

// RagRequest represents a request for Retrieval Augmented Generation
type RagRequest struct {
	Question string   `json:"question"`
	TopK     int      `json:"top_k,omitempty"`
	DocTypes []string `json:"doc_type,omitempty"`
	Levels   []string `json:"level,omitempty"`
	YearFrom *int     `json:"year_from,omitempty"`
	YearTo   *int     `json:"year_to,omitempty"`
	Answer   bool     `json:"answer,omitempty"`
}

// RagResult represents the result of a RAG query
type RagResult struct {
	Items  []map[string]interface{} `json:"items"`
	Total  int                      `json:"total"`
	Limit  int                      `json:"limit"`
	Offset int                      `json:"offset"`
	Answer string                   `json:"answer,omitempty"`
}

// Document represents a legal document (law, decree, regulation, etc.)
type Document struct {
	ID        uuid.UUID `json:"id" db:"id"`
	Title     string    `json:"title" db:"title"`
	Type      string    `json:"type" db:"type"`
	Number    *string   `json:"number,omitempty" db:"number"`
	Year      *int      `json:"year,omitempty" db:"year"`
	Authority *string   `json:"authority,omitempty" db:"authority"`
	Status    string    `json:"status" db:"status"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
}

// Unit represents a legal text unit (article, clause, point, etc.)
type Unit struct {
	ID         uuid.UUID  `json:"id" db:"id"`
	DocumentID uuid.UUID  `json:"document_id" db:"document_id"`
	Level      string     `json:"level" db:"level"`
	Code       *string    `json:"code,omitempty" db:"code"`
	Text       string     `json:"text" db:"text"`
	ParentID   *uuid.UUID `json:"parent_id,omitempty" db:"parent_id"`
	OrderIndex int        `json:"order_index" db:"order_index"`
	CreatedAt  time.Time  `json:"created_at" db:"created_at"`
}

// Concept represents a legal concept (entity, action, condition, etc.)
type Concept struct {
	ID          uuid.UUID `json:"id" db:"id"`
	Name        string    `json:"name" db:"name"`
	Description *string   `json:"description,omitempty" db:"description"`
	Synonyms    []string  `json:"synonyms" db:"synonyms"`
	Keywords    []string  `json:"keywords" db:"keywords"`
	Type        string    `json:"concept_type" db:"concept_type"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
}

// Relation represents a relationship between concepts
type Relation struct {
	ID           uuid.UUID `json:"id" db:"id"`
	Name         string    `json:"name" db:"name"`
	Description  *string   `json:"description,omitempty" db:"description"`
	Keywords     []string  `json:"keywords" db:"keywords"`
	RelationType string    `json:"relation_type" db:"relation_type"`
	CreatedAt    time.Time `json:"created_at" db:"created_at"`
}

// Triple represents a knowledge triple (Subject-Relation-Object)
type Triple struct {
	ID            uuid.UUID `json:"id" db:"id"`
	SubjectID     uuid.UUID `json:"subject_id" db:"subject_id"`
	RelationID    uuid.UUID `json:"relation_id" db:"relation_id"`
	ObjectID      uuid.UUID `json:"object_id" db:"object_id"`
	UnitID        uuid.UUID `json:"unit_id" db:"unit_id"`
	DocRef        string    `json:"doc_ref" db:"doc_ref"`
	Confidence    float32   `json:"confidence" db:"confidence"`
	TfIdf         float32   `json:"tfidf" db:"tfidf"`
	IsBlacklisted bool      `json:"is_blacklisted" db:"is_blacklisted"`
	Context       *string   `json:"context,omitempty" db:"context"`
	CreatedAt     time.Time `json:"created_at" db:"created_at"`
}

// TripleView represents a triple with resolved names for easier query results
type TripleView struct {
	Triple
	SubjectName   string    `json:"subject_name" db:"subject_name"`
	RelationName  string    `json:"relation_name" db:"relation_name"`
	ObjectName    string    `json:"object_name" db:"object_name"`
	UnitText      string    `json:"unit_text" db:"unit_text"`
	DocumentTitle string    `json:"document_title" db:"document_title"`
	DocumentID    uuid.UUID `json:"document_id" db:"document_id"`
}

// TripleSearchResult represents a triple with relevance scoring
type TripleSearchResult struct {
	TripleView
	KeywordMatches int     `json:"keyword_matches"` // Number of keywords matched
	MatchScore     float32 `json:"match_score"`     // Combined relevance score
}

// QueryCandidate represents a candidate for query matching
type QueryCandidate struct {
	Type       string     `json:"type"` // "subject", "relation", "object"
	ConceptID  *uuid.UUID `json:"concept_id,omitempty"`
	RelationID *uuid.UUID `json:"relation_id,omitempty"`
	Name       string     `json:"name"`
	Score      float32    `json:"score"`
	MatchType  string     `json:"match_type"` // "exact", "synonym", "keyword", "fuzzy"
}

// QueryStar represents a star pattern for querying triples
type QueryStar struct {
	SubjectCandidates  []QueryCandidate `json:"subject_candidates"`
	RelationCandidates []QueryCandidate `json:"relation_candidates"`
	ObjectCandidates   []QueryCandidate `json:"object_candidates"`
	MatchingTriples    []TripleView     `json:"matching_triples"`
}

// QueryResult represents the result of a legal query
type QueryResult struct {
	Answers []Answer    `json:"answers"`
	Debug   *QueryDebug `json:"debug,omitempty"`
}

// Answer represents a single answer to a legal query
type Answer struct {
	DocRef    string  `json:"doc_ref"`
	UnitID    string  `json:"unit_id"`
	Snippet   string  `json:"snippet"`
	Score     float32 `json:"score"`
	Context   *string `json:"context,omitempty"`
	Title     string  `json:"title,omitempty"`
	SourceURL string  `json:"source_url,omitempty"`
}

// QueryDebug provides debugging information for query processing
type QueryDebug struct {
	Stars      []QueryStar      `json:"stars"`
	Candidates []QueryCandidate `json:"candidates"`
	Timings    map[string]int64 `json:"timings"` // milliseconds
	Query      string           `json:"query"`
}

// UnitView adds document title for search/recommend responses
type UnitView struct {
	Unit
	DocumentTitle string `json:"document_title" db:"document_title"`
}

// UnitSimilarityView adds distance for semantic search results.
type UnitSimilarityView struct {
	UnitView
	Distance float32 `json:"distance" db:"distance"`
}

// UnitTree represents a hierarchical unit with children for pháp điển navigation
type UnitTree struct {
	Unit
	Children []UnitTree `json:"children"`
}

// DocumentFilter provides optional filters for searching documents
type DocumentFilter struct {
	Types     []string
	Status    string
	Authority string
	YearFrom  *int
	YearTo    *int
}

// UnitSearchFilter provides filters for unit search/recommendation
type UnitSearchFilter struct {
	Keyword  string
	DocTypes []string
	Levels   []string
	YearFrom *int
	YearTo   *int
	Limit    int
	Offset   int
}

// CitationView presents citation info with target metadata
type CitationView struct {
	ID             uuid.UUID `json:"id"`
	SourceUnitID   uuid.UUID `json:"source_unit_id"`
	TargetUnitID   uuid.UUID `json:"target_unit_id"`
	Note           string    `json:"note"`
	PeerCode       string    `json:"peer_code"`
	PeerLevel      string    `json:"peer_level"`
	PeerDocumentID uuid.UUID `json:"peer_document_id"`
	PeerDocument   string    `json:"peer_document"`
	PeerSnippet    string    `json:"peer_snippet"`
}
