package graph

import (
	"context"
	"fmt"
	"sort"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	pgvector "github.com/pgvector/pgvector-go"
)

// Repository provides database operations for the legal knowledge graph
type Repository struct {
	db *pgxpool.Pool
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

// NewRepository creates a new graph repository
func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

// Documents
func (r *Repository) CreateDocument(ctx context.Context, doc *Document) error {
	query := `
		INSERT INTO documents (title, type, number, year, authority, status)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, created_at, updated_at`

	return r.db.QueryRow(ctx, query, doc.Title, doc.Type, doc.Number, doc.Year, doc.Authority, doc.Status).
		Scan(&doc.ID, &doc.CreatedAt, &doc.UpdatedAt)
}

// UpdateDocument updates basic metadata fields for a document
func (r *Repository) UpdateDocument(ctx context.Context, doc *Document) error {
	query := `
			UPDATE documents
			SET title = $2, type = $3, number = $4, year = $5, authority = $6, status = $7, updated_at = NOW()
			WHERE id = $1
			RETURNING updated_at`

	return r.db.QueryRow(ctx, query, doc.ID, doc.Title, doc.Type, doc.Number, doc.Year, doc.Authority, doc.Status).
		Scan(&doc.UpdatedAt)
}

func (r *Repository) GetDocument(ctx context.Context, id uuid.UUID) (*Document, error) {
	query := `
		SELECT id, title, type, number, year, authority, status, created_at, updated_at
		FROM documents WHERE id = $1`

	doc := &Document{}
	err := r.db.QueryRow(ctx, query, id).Scan(
		&doc.ID, &doc.Title, &doc.Type, &doc.Number, &doc.Year,
		&doc.Authority, &doc.Status, &doc.CreatedAt, &doc.UpdatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return doc, nil
}

// FindDocumentByMetadata finds a document by title or other metadata to detect duplicates
func (r *Repository) FindDocumentByMetadata(ctx context.Context, title string, number *string) (*Document, error) {
	query := `
		SELECT id, title, type, number, year, authority, status, created_at, updated_at
		FROM documents 
		WHERE LOWER(title) = LOWER($1) OR ($2::text IS NOT NULL AND LOWER(number) = LOWER($2))`

	doc := &Document{}
	err := r.db.QueryRow(ctx, query, title, number).Scan(
		&doc.ID, &doc.Title, &doc.Type, &doc.Number, &doc.Year,
		&doc.Authority, &doc.Status, &doc.CreatedAt, &doc.UpdatedAt)

	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return doc, nil
}

// SearchDocuments retrieves documents with optional search, limit, offset and total count
func (r *Repository) SearchDocuments(ctx context.Context, search string, filter DocumentFilter, limit, offset int) ([]Document, int, error) {
	search = strings.TrimSpace(search)

	var args []any
	clauses := []string{}

	if search != "" {
		clauses = append(clauses, fmt.Sprintf("(LOWER(title) LIKE LOWER($%d) OR LOWER(type) LIKE LOWER($%d) OR LOWER(authority) LIKE LOWER($%d))", len(args)+1, len(args)+1, len(args)+1))
		args = append(args, "%"+search+"%")
	}
	if len(filter.Types) > 0 {
		clauses = append(clauses, fmt.Sprintf("type = ANY($%d)", len(args)+1))
		args = append(args, filter.Types)
	}
	if filter.Status != "" {
		clauses = append(clauses, fmt.Sprintf("status = $%d", len(args)+1))
		args = append(args, filter.Status)
	}
	if filter.Authority != "" {
		clauses = append(clauses, fmt.Sprintf("LOWER(authority) LIKE LOWER($%d)", len(args)+1))
		args = append(args, "%"+filter.Authority+"%")
	}
	if filter.YearFrom != nil {
		clauses = append(clauses, fmt.Sprintf("year >= $%d", len(args)+1))
		args = append(args, *filter.YearFrom)
	}
	if filter.YearTo != nil {
		clauses = append(clauses, fmt.Sprintf("year <= $%d", len(args)+1))
		args = append(args, *filter.YearTo)
	}

	where := ""
	if len(clauses) > 0 {
		where = "WHERE " + strings.Join(clauses, " AND ")
	}

	countQuery := "SELECT COUNT(*) FROM documents " + where
	var total int
	if err := r.db.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	listQuery := `
		SELECT id, title, type, number, year, authority, status, created_at, updated_at
		FROM documents ` + where + `
		ORDER BY created_at DESC
		LIMIT $%d OFFSET $%d`

	args = append(args, limit, offset)
	listQuery = fmt.Sprintf(listQuery, len(args)-1, len(args))

	rows, err := r.db.Query(ctx, listQuery, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var docs []Document
	for rows.Next() {
		d := Document{}
		if err := rows.Scan(&d.ID, &d.Title, &d.Type, &d.Number, &d.Year, &d.Authority, &d.Status, &d.CreatedAt, &d.UpdatedAt); err != nil {
			return nil, 0, err
		}
		docs = append(docs, d)
	}

	return docs, total, rows.Err()
}

// Units
func (r *Repository) CreateUnit(ctx context.Context, unit *Unit) error {
	query := `
		INSERT INTO units (document_id, level, code, text, parent_id, order_index)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, created_at`

	return r.db.QueryRow(ctx, query, unit.DocumentID, unit.Level, unit.Code,
		unit.Text, unit.ParentID, unit.OrderIndex).
		Scan(&unit.ID, &unit.CreatedAt)
}

func (r *Repository) GetUnit(ctx context.Context, id uuid.UUID) (*Unit, error) {
	query := `
		SELECT id, document_id, level, code, text, parent_id, order_index, created_at
		FROM units WHERE id = $1`

	unit := &Unit{}
	err := r.db.QueryRow(ctx, query, id).Scan(
		&unit.ID, &unit.DocumentID, &unit.Level, &unit.Code,
		&unit.Text, &unit.ParentID, &unit.OrderIndex, &unit.CreatedAt)
	if err != nil {
		return nil, err
	}
	return unit, nil
}

func (r *Repository) GetUnitsWithDocument(ctx context.Context, unitID uuid.UUID) (*Unit, *Document, error) {
	query := `
		SELECT u.id, u.document_id, u.level, u.code, u.text, u.parent_id, u.order_index, u.created_at,
		       d.id, d.title, d.type, d.number, d.year, d.authority, d.status, d.created_at, d.updated_at
		FROM units u
		JOIN documents d ON u.document_id = d.id
		WHERE u.id = $1`

	unit := &Unit{}
	doc := &Document{}
	err := r.db.QueryRow(ctx, query, unitID).Scan(
		&unit.ID, &unit.DocumentID, &unit.Level, &unit.Code,
		&unit.Text, &unit.ParentID, &unit.OrderIndex, &unit.CreatedAt,
		&doc.ID, &doc.Title, &doc.Type, &doc.Number, &doc.Year,
		&doc.Authority, &doc.Status, &doc.CreatedAt, &doc.UpdatedAt)
	if err != nil {
		return nil, nil, err
	}
	return unit, doc, nil
}

// GetUnitsByDocument lists units of a document with pagination
func (r *Repository) GetUnitsByDocument(ctx context.Context, docID uuid.UUID, limit, offset int) ([]Unit, int, error) {
	countQuery := `SELECT COUNT(*) FROM units WHERE document_id = $1`
	var total int
	if err := r.db.QueryRow(ctx, countQuery, docID).Scan(&total); err != nil {
		return nil, 0, err
	}

	query := `
		SELECT id, document_id, level, code, text, parent_id, order_index, created_at
		FROM units
		WHERE document_id = $1
		ORDER BY order_index ASC, created_at ASC
		LIMIT $2 OFFSET $3`

	rows, err := r.db.Query(ctx, query, docID, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var units []Unit
	for rows.Next() {
		u := Unit{}
		if err := rows.Scan(&u.ID, &u.DocumentID, &u.Level, &u.Code, &u.Text, &u.ParentID, &u.OrderIndex, &u.CreatedAt); err != nil {
			return nil, 0, err
		}
		units = append(units, u)
	}

	return units, total, rows.Err()
}

// GetUnitTreeByDocument builds a nested tree of units for a document
func (r *Repository) GetUnitTreeByDocument(ctx context.Context, docID uuid.UUID) ([]UnitTree, error) {
	query := `
		SELECT id, document_id, level, code, text, parent_id, order_index, created_at
		FROM units
		WHERE document_id = $1
		ORDER BY order_index ASC, created_at ASC`

	rows, err := r.db.Query(ctx, query, docID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	nodes := make(map[uuid.UUID]*UnitTree)
	var roots []UnitTree

	for rows.Next() {
		u := Unit{}
		if err := rows.Scan(&u.ID, &u.DocumentID, &u.Level, &u.Code, &u.Text, &u.ParentID, &u.OrderIndex, &u.CreatedAt); err != nil {
			return nil, err
		}
		n := UnitTree{Unit: u, Children: []UnitTree{}}
		nodes[u.ID] = &n
	}

	// build tree
	for _, n := range nodes {
		if n.ParentID != nil {
			if parent, ok := nodes[*n.ParentID]; ok {
				parent.Children = append(parent.Children, *n)
				continue
			}
		}
		roots = append(roots, *n)
	}

	// sort children by order_index for consistent tree ordering
	var sortChildren func(items []UnitTree)
	sortChildren = func(items []UnitTree) {
		sort.SliceStable(items, func(i, j int) bool { return items[i].OrderIndex < items[j].OrderIndex })
		for idx := range items {
			if len(items[idx].Children) > 0 {
				sortChildren(items[idx].Children)
			}
		}
	}
	sortChildren(roots)

	return roots, rows.Err()
}

// GetCitations returns outbound and inbound citations for a unit
func (r *Repository) GetCitations(ctx context.Context, unitID uuid.UUID) ([]CitationView, []CitationView, error) {
	// outbound: unit -> targets
	outQuery := `
		SELECT c.id, c.source_unit_id, c.target_unit_id, COALESCE(c.note,''),
		       COALESCE(u.code,''), u.level, u.document_id, d.title,
		       LEFT(u.text, 320)
		FROM citations c
		JOIN units u ON c.target_unit_id = u.id
		JOIN documents d ON u.document_id = d.id
		WHERE c.source_unit_id = $1
		ORDER BY u.order_index ASC, c.created_at DESC`

	// inbound: others -> unit (so peer is source unit)
	inQuery := `
		SELECT c.id, c.source_unit_id, c.target_unit_id, COALESCE(c.note,''),
		       COALESCE(u.code,''), u.level, u.document_id, d.title,
		       LEFT(u.text, 320)
		FROM citations c
		JOIN units u ON c.source_unit_id = u.id
		JOIN documents d ON u.document_id = d.id
		WHERE c.target_unit_id = $1
		ORDER BY u.order_index ASC, c.created_at DESC`

	outbound, err := r.scanCitationRows(ctx, outQuery, unitID)
	if err != nil {
		return nil, nil, err
	}
	inbound, err := r.scanCitationRows(ctx, inQuery, unitID)
	if err != nil {
		return nil, nil, err
	}
	return outbound, inbound, nil
}

func (r *Repository) scanCitationRows(ctx context.Context, query string, unitID uuid.UUID) ([]CitationView, error) {
	rows, err := r.db.Query(ctx, query, unitID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []CitationView
	for rows.Next() {
		var v CitationView
		if err := rows.Scan(&v.ID, &v.SourceUnitID, &v.TargetUnitID, &v.Note, &v.PeerCode, &v.PeerLevel, &v.PeerDocumentID, &v.PeerDocument, &v.PeerSnippet); err != nil {
			return nil, err
		}
		items = append(items, v)
	}
	return items, rows.Err()
}

// SearchUnits finds units by keyword with document title for recommendation/search
func (r *Repository) SearchUnits(ctx context.Context, f UnitSearchFilter) ([]UnitView, int, error) {
	keyword := strings.TrimSpace(f.Keyword)
	if keyword == "" {
		return []UnitView{}, 0, nil
	}

	// build where clauses
	var args []any
	clauses := []string{}

	clauses = append(clauses, fmt.Sprintf("to_tsvector('simple', u.text) @@ plainto_tsquery('simple', $%d)", len(args)+1))
	args = append(args, keyword)

	// fallback match on code/title for broader recall
	clauses = append(clauses, fmt.Sprintf("(LOWER(COALESCE(u.code,'')) LIKE LOWER($%d) OR LOWER(d.title) LIKE LOWER($%d))", len(args)+1, len(args)+1))
	args = append(args, "%"+keyword+"%")

	if len(f.DocTypes) > 0 {
		clauses = append(clauses, fmt.Sprintf("d.type = ANY($%d)", len(args)+1))
		args = append(args, f.DocTypes)
	}
	if len(f.Levels) > 0 {
		clauses = append(clauses, fmt.Sprintf("u.level = ANY($%d)", len(args)+1))
		args = append(args, f.Levels)
	}
	if f.YearFrom != nil {
		clauses = append(clauses, fmt.Sprintf("d.year >= $%d", len(args)+1))
		args = append(args, *f.YearFrom)
	}
	if f.YearTo != nil {
		clauses = append(clauses, fmt.Sprintf("d.year <= $%d", len(args)+1))
		args = append(args, *f.YearTo)
	}

	where := "WHERE " + strings.Join(clauses, " AND ")

	countQuery := `
		SELECT COUNT(*)
		FROM units u
		JOIN documents d ON u.document_id = d.id
		` + where

	var total int
	if err := r.db.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	query := `
		SELECT u.id, u.document_id, u.level, u.code, u.text, u.parent_id, u.order_index, u.created_at,
		       d.title as document_title,
		       ts_rank(to_tsvector('simple', u.text), plainto_tsquery('simple', $1)) as rank
		FROM units u
		JOIN documents d ON u.document_id = d.id
		` + where + `
		ORDER BY rank DESC, u.order_index ASC
		LIMIT $%d OFFSET $%d`

	args = append(args, f.Limit, f.Offset)
	query = fmt.Sprintf(query, len(args)-1, len(args))

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var units []UnitView
	for rows.Next() {
		u := UnitView{}
		var rank float32
		if err := rows.Scan(&u.ID, &u.DocumentID, &u.Level, &u.Code, &u.Text, &u.ParentID, &u.OrderIndex, &u.CreatedAt, &u.DocumentTitle, &rank); err != nil {
			return nil, 0, err
		}
		units = append(units, u)
	}

	return units, total, rows.Err()
}

// UpsertUnitEmbedding stores or updates an embedding for a unit.
func (r *Repository) UpsertUnitEmbedding(ctx context.Context, unitID uuid.UUID, embedding []float32, model string) error {
	vec := pgvector.NewVector(embedding)
	query := `
		INSERT INTO unit_embeddings (unit_id, embedding, model)
		VALUES ($1, $2, $3)
		ON CONFLICT (unit_id)
		DO UPDATE SET embedding = EXCLUDED.embedding,
		              model = EXCLUDED.model,
		              updated_at = CURRENT_TIMESTAMP`

	_, err := r.db.Exec(ctx, query, unitID, vec, model)
	return err
}

// SearchUnitsByEmbedding performs semantic search using a query embedding with optional filters.
func (r *Repository) SearchUnitsByEmbedding(ctx context.Context, embedding []float32, f UnitSearchFilter) ([]UnitSimilarityView, int, error) {
	if len(embedding) == 0 {
		return []UnitSimilarityView{}, 0, nil
	}

	limit := f.Limit
	if limit <= 0 {
		limit = 10
	}
	offset := f.Offset
	if offset < 0 {
		offset = 0
	}

	buildFilters := func(startIdx int) ([]string, []any) {
		idx := startIdx
		clauses := []string{}
		args := []any{}

		if len(f.DocTypes) > 0 {
			clauses = append(clauses, fmt.Sprintf("d.type = ANY($%d)", idx))
			args = append(args, f.DocTypes)
			idx++
		}
		if len(f.Levels) > 0 {
			clauses = append(clauses, fmt.Sprintf("u.level = ANY($%d)", idx))
			args = append(args, f.Levels)
			idx++
		}
		if f.YearFrom != nil {
			clauses = append(clauses, fmt.Sprintf("d.year >= $%d", idx))
			args = append(args, *f.YearFrom)
			idx++
		}
		if f.YearTo != nil {
			clauses = append(clauses, fmt.Sprintf("d.year <= $%d", idx))
			args = append(args, *f.YearTo)
			idx++
		}

		return clauses, args
	}

	// Count query does not need the vector argument, so placeholders start at 1.
	countClauses, countArgs := buildFilters(1)
	whereCount := ""
	if len(countClauses) > 0 {
		whereCount = "WHERE " + strings.Join(countClauses, " AND ")
	}

	countQuery := `
		SELECT COUNT(*)
		FROM unit_embeddings e
		JOIN units u ON e.unit_id = u.id
		JOIN documents d ON u.document_id = d.id
		` + whereCount

	var total int
	if err := r.db.QueryRow(ctx, countQuery, countArgs...).Scan(&total); err != nil {
		return nil, 0, err
	}

	// Search query uses the vector as the first argument; filters start at $2.
	searchClauses, searchFilterArgs := buildFilters(2)
	whereSearch := ""
	if len(searchClauses) > 0 {
		whereSearch = "WHERE " + strings.Join(searchClauses, " AND ")
	}

	vec := pgvector.NewVector(embedding)
	args := []any{vec}
	args = append(args, searchFilterArgs...)
	args = append(args, limit, offset)

	query := `
		SELECT u.id, u.document_id, u.level, u.code, u.text, u.parent_id, u.order_index, u.created_at,
		       d.title as document_title,
		       e.embedding <-> $1 as distance
		FROM unit_embeddings e
		JOIN units u ON e.unit_id = u.id
		JOIN documents d ON u.document_id = d.id
		` + whereSearch + `
		AND (e.embedding <-> $1) < 0.6
		ORDER BY distance ASC, u.order_index ASC
		LIMIT $%d OFFSET $%d`

	query = fmt.Sprintf(query, len(args)-1, len(args))

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var units []UnitSimilarityView
	for rows.Next() {
		u := UnitSimilarityView{}
		if err := rows.Scan(&u.ID, &u.DocumentID, &u.Level, &u.Code, &u.Text, &u.ParentID, &u.OrderIndex, &u.CreatedAt,
			&u.DocumentTitle, &u.Distance); err != nil {
			return nil, 0, err
		}
		units = append(units, u)
	}

	return units, total, rows.Err()
}

// Concepts
func (r *Repository) CreateConcept(ctx context.Context, concept *Concept) error {
	query := `
		INSERT INTO concepts (name, description, synonyms, keywords, concept_type)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, created_at`

	return r.db.QueryRow(ctx, query, concept.Name, concept.Description,
		concept.Synonyms, concept.Keywords, concept.Type).
		Scan(&concept.ID, &concept.CreatedAt)
}

func (r *Repository) GetOrCreateConcept(ctx context.Context, name string, conceptType string) (*Concept, error) {
	// Try to get existing
	query := `SELECT id, name, description, synonyms, keywords, concept_type, created_at 
	          FROM concepts WHERE name = $1`

	concept := &Concept{}
	err := r.db.QueryRow(ctx, query, name).Scan(
		&concept.ID, &concept.Name, &concept.Description,
		&concept.Synonyms, &concept.Keywords, &concept.Type, &concept.CreatedAt)

	if err == nil {
		return concept, nil
	}
	if err != pgx.ErrNoRows {
		return nil, err
	}

	// Create new
	concept = &Concept{
		Name:     name,
		Type:     conceptType,
		Synonyms: []string{},
		Keywords: []string{},
	}

	if err := r.CreateConcept(ctx, concept); err != nil {
		return nil, err
	}
	return concept, nil
}

// UpsertConcept creates or updates a concept with synonyms
func (r *Repository) UpsertConcept(ctx context.Context, name string, synonyms []string, conceptType string) (*Concept, error) {
	if conceptType == "" {
		conceptType = "general"
	}

	// Try to get existing
	query := `SELECT id, name, description, synonyms, keywords, concept_type, created_at 
	          FROM concepts WHERE name = $1`

	concept := &Concept{}
	err := r.db.QueryRow(ctx, query, name).Scan(
		&concept.ID, &concept.Name, &concept.Description,
		&concept.Synonyms, &concept.Keywords, &concept.Type, &concept.CreatedAt)

	if err == nil {
		// Update existing with new synonyms
		if len(synonyms) > 0 {
			// Merge synonyms
			existingSet := make(map[string]bool)
			for _, s := range concept.Synonyms {
				existingSet[s] = true
			}
			for _, s := range synonyms {
				if !existingSet[s] {
					concept.Synonyms = append(concept.Synonyms, s)
				}
			}

			updateQuery := `UPDATE concepts SET synonyms = $1 WHERE id = $2`
			_, err := r.db.Exec(ctx, updateQuery, concept.Synonyms, concept.ID)
			if err != nil {
				return nil, err
			}
		}
		return concept, nil
	}

	if err != pgx.ErrNoRows {
		return nil, err
	}

	// Create new
	concept = &Concept{
		Name:     name,
		Type:     conceptType,
		Synonyms: synonyms,
		Keywords: []string{},
	}

	if err := r.CreateConcept(ctx, concept); err != nil {
		return nil, err
	}
	return concept, nil
}

func (r *Repository) FindConceptCandidates(ctx context.Context, term string) ([]QueryCandidate, error) {
	term = strings.ToLower(strings.TrimSpace(term))
	if term == "" {
		return nil, nil
	}

	query := `
		SELECT id, name, concept_type, 
		       CASE 
		         WHEN LOWER(name) = $1 THEN 1.0
		         WHEN similarity(LOWER(name), $1) > 0.6 THEN CAST(similarity(LOWER(name), $1) AS float4)
		         ELSE 0.7
		       END as score,
		       CASE 
		         WHEN LOWER(name) = $1 THEN 'exact'
		         WHEN similarity(LOWER(name), $1) > 0.6 THEN 'trigram'
		         ELSE 'fuzzy'
		       END as match_type
		FROM concepts 
		WHERE LOWER(name) LIKE '%' || $1 || '%'
		   OR similarity(LOWER(name), $1) > 0.6
		ORDER BY score DESC, length(name) ASC, name
		LIMIT 20`

	rows, err := r.db.Query(ctx, query, term)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var candidates []QueryCandidate
	for rows.Next() {
		var id uuid.UUID
		var name, conceptType, matchType string
		var score float32

		if err := rows.Scan(&id, &name, &conceptType, &score, &matchType); err != nil {
			return nil, err
		}

		candidates = append(candidates, QueryCandidate{
			Type:      "subject", // will be set by caller
			ConceptID: &id,
			Name:      name,
			Score:     score,
			MatchType: matchType,
		})
	}

	return candidates, rows.Err()
}

// Relations
func (r *Repository) CreateRelation(ctx context.Context, relation *Relation) error {
	query := `
		INSERT INTO relations (name, description, keywords, relation_type)
		VALUES ($1, $2, $3, $4)
		RETURNING id, created_at`

	return r.db.QueryRow(ctx, query, relation.Name, relation.Description,
		relation.Keywords, relation.RelationType).
		Scan(&relation.ID, &relation.CreatedAt)
}

func (r *Repository) GetOrCreateRelation(ctx context.Context, name string, relationType string) (*Relation, error) {
	// Try to get existing
	query := `SELECT id, name, description, keywords, relation_type, created_at 
	          FROM relations WHERE name = $1`

	relation := &Relation{}
	err := r.db.QueryRow(ctx, query, name).Scan(
		&relation.ID, &relation.Name, &relation.Description,
		&relation.Keywords, &relation.RelationType, &relation.CreatedAt)

	if err == nil {
		return relation, nil
	}
	if err != pgx.ErrNoRows {
		return nil, err
	}

	// Create new
	relation = &Relation{
		Name:         name,
		RelationType: relationType,
		Keywords:     []string{},
	}

	if err := r.CreateRelation(ctx, relation); err != nil {
		return nil, err
	}
	return relation, nil
}

// UpsertRelation creates or updates a relation with keywords
func (r *Repository) UpsertRelation(ctx context.Context, name string, keywords []string, relationType string) (*Relation, error) {
	if relationType == "" {
		relationType = "general"
	}

	// Try to get existing
	query := `SELECT id, name, description, keywords, relation_type, created_at 
	          FROM relations WHERE name = $1`

	relation := &Relation{}
	err := r.db.QueryRow(ctx, query, name).Scan(
		&relation.ID, &relation.Name, &relation.Description,
		&relation.Keywords, &relation.RelationType, &relation.CreatedAt)

	if err == nil {
		// Update existing with new keywords
		if len(keywords) > 0 {
			// Merge keywords
			existingSet := make(map[string]bool)
			for _, k := range relation.Keywords {
				existingSet[k] = true
			}
			for _, k := range keywords {
				if !existingSet[k] {
					relation.Keywords = append(relation.Keywords, k)
				}
			}

			updateQuery := `UPDATE relations SET keywords = $1 WHERE id = $2`
			_, err := r.db.Exec(ctx, updateQuery, relation.Keywords, relation.ID)
			if err != nil {
				return nil, err
			}
		}
		return relation, nil
	}

	if err != pgx.ErrNoRows {
		return nil, err
	}

	// Create new
	relation = &Relation{
		Name:         name,
		RelationType: relationType,
		Keywords:     keywords,
	}

	if err := r.CreateRelation(ctx, relation); err != nil {
		return nil, err
	}
	return relation, nil
}

func (r *Repository) FindRelationCandidates(ctx context.Context, term string) ([]QueryCandidate, error) {
	term = strings.ToLower(strings.TrimSpace(term))
	if term == "" {
		return nil, nil
	}

	query := `
		SELECT id, name, relation_type,
		       CASE 
		         WHEN LOWER(name) = $1 THEN 1.0
		         WHEN $1 = ANY(ARRAY(SELECT LOWER(unnest(keywords)))) THEN 0.9
		         WHEN LOWER(name) LIKE $1 || '%' THEN 0.75
		         WHEN LOWER(name) LIKE '%' || $1 || '%' THEN 0.7
		         ELSE 0.0
		       END as score,
		       CASE 
		         WHEN LOWER(name) = $1 THEN 'exact'
		         WHEN $1 = ANY(ARRAY(SELECT LOWER(unnest(keywords)))) THEN 'keyword'
		         WHEN LOWER(name) LIKE $1 || '%' THEN 'prefix'
		         ELSE 'fuzzy'
		       END as match_type
		FROM relations 
		WHERE LOWER(name) = $1 
		   OR $1 = ANY(ARRAY(SELECT LOWER(unnest(keywords))))
		   OR LOWER(name) LIKE '%' || $1 || '%'
		ORDER BY score DESC, length(name) ASC, name
		LIMIT 10`

	rows, err := r.db.Query(ctx, query, term)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var candidates []QueryCandidate
	for rows.Next() {
		var id uuid.UUID
		var name, relationType, matchType string
		var score float32

		if err := rows.Scan(&id, &name, &relationType, &score, &matchType); err != nil {
			return nil, err
		}

		candidates = append(candidates, QueryCandidate{
			Type:       "relation",
			RelationID: &id,
			Name:       name,
			Score:      score,
			MatchType:  matchType,
		})
	}

	return candidates, rows.Err()
}

// Triples
func (r *Repository) CreateTriple(ctx context.Context, triple *Triple) error {
	query := `
		INSERT INTO triples (subject_id, relation_id, object_id, unit_id, doc_ref, confidence, context)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, created_at`

	return r.db.QueryRow(ctx, query, triple.SubjectID, triple.RelationID, triple.ObjectID,
		triple.UnitID, triple.DocRef, triple.Confidence, triple.Context).
		Scan(&triple.ID, &triple.CreatedAt)
}

// InsertTriple inserts a triple with TF-IDF and blacklist support
func (r *Repository) InsertTriple(ctx context.Context, triple *Triple) error {
	query := `
		INSERT INTO triples (subject_id, relation_id, object_id, unit_id, doc_ref, confidence, tfidf, is_blacklisted, context)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id, created_at`

	return r.db.QueryRow(ctx, query, triple.SubjectID, triple.RelationID, triple.ObjectID,
		triple.UnitID, triple.DocRef, triple.Confidence, triple.TfIdf, triple.IsBlacklisted, triple.Context).
		Scan(&triple.ID, &triple.CreatedAt)
}

func (r *Repository) FindTriplesByStar(ctx context.Context, star QueryStar) ([]TripleView, error) {
	// Build dynamic query based on available candidates
	baseQuery := `
		SELECT t.id, t.subject_id, t.relation_id, t.object_id, t.unit_id, t.doc_ref, 
		       t.confidence, t.tfidf, t.is_blacklisted, t.context, t.created_at,
		       cs.name as subject_name, cr.name as relation_name, co.name as object_name,
		       u.text as unit_text, d.title as document_title, d.id as document_id
		FROM triples t
		JOIN concepts cs ON t.subject_id = cs.id
		JOIN relations cr ON t.relation_id = cr.id  
		JOIN concepts co ON t.object_id = co.id
		JOIN units u ON t.unit_id = u.id
		JOIN documents d ON u.document_id = d.id
		WHERE t.is_blacklisted = false`

	args := []interface{}{}
	argCount := 0

	// Add subject filters
	if len(star.SubjectCandidates) > 0 {
		var subjectIDs []uuid.UUID
		for _, c := range star.SubjectCandidates {
			if c.ConceptID != nil {
				subjectIDs = append(subjectIDs, *c.ConceptID)
			}
		}
		if len(subjectIDs) > 0 {
			baseQuery += fmt.Sprintf(" AND t.subject_id = ANY($%d)", argCount+1)
			args = append(args, subjectIDs)
			argCount++
		}
	}

	// Add relation filters
	if len(star.RelationCandidates) > 0 {
		var relationIDs []uuid.UUID
		for _, c := range star.RelationCandidates {
			if c.RelationID != nil {
				relationIDs = append(relationIDs, *c.RelationID)
			}
		}
		if len(relationIDs) > 0 {
			baseQuery += fmt.Sprintf(" AND t.relation_id = ANY($%d)", argCount+1)
			args = append(args, relationIDs)
			argCount++
		}
	}

	// Add object filters
	if len(star.ObjectCandidates) > 0 {
		var objectIDs []uuid.UUID
		for _, c := range star.ObjectCandidates {
			if c.ConceptID != nil {
				objectIDs = append(objectIDs, *c.ConceptID)
			}
		}
		if len(objectIDs) > 0 {
			baseQuery += fmt.Sprintf(" AND t.object_id = ANY($%d)", argCount+1)
			args = append(args, objectIDs)
			argCount++
		}
	}

	baseQuery += " ORDER BY t.tfidf DESC NULLS LAST, t.confidence DESC, t.created_at DESC LIMIT 50"

	rows, err := r.db.Query(ctx, baseQuery, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var triples []TripleView
	for rows.Next() {
		tv := TripleView{}
		err := rows.Scan(
			&tv.ID, &tv.SubjectID, &tv.RelationID, &tv.ObjectID, &tv.UnitID,
			&tv.DocRef, &tv.Confidence, &tv.TfIdf, &tv.IsBlacklisted, &tv.Context, &tv.CreatedAt,
			&tv.SubjectName, &tv.RelationName, &tv.ObjectName,
			&tv.UnitText, &tv.DocumentTitle, &tv.DocumentID)
		if err != nil {
			return nil, err
		}
		triples = append(triples, tv)
	}

	return triples, rows.Err()
}
