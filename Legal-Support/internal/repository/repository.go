package repository

import (
	"context"
	"fmt"
	"sort"
	"strings"

	"example.com/legallaw/internal/model"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	pgvector "github.com/pgvector/pgvector-go"
)

// Repository provides database operations for the legal knowledge graph
type Repository struct {
	db *pgxpool.Pool
}

// NewRepository creates a new graph repository
func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

// Documents
func (r *Repository) CreateDocument(ctx context.Context, doc *model.Document) error {
	query := `
		INSERT INTO documents (title, type, number, year, authority, status)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, created_at, updated_at`

	return r.db.QueryRow(ctx, query, doc.Title, doc.Type, doc.Number, doc.Year, doc.Authority, doc.Status).
		Scan(&doc.ID, &doc.CreatedAt, &doc.UpdatedAt)
}

// UpdateDocument updates basic metadata fields for a document
func (r *Repository) UpdateDocument(ctx context.Context, doc *model.Document) error {
	query := `
			UPDATE documents
			SET title = $2, type = $3, number = $4, year = $5, authority = $6, status = $7, updated_at = NOW()
			WHERE id = $1
			RETURNING updated_at`

	return r.db.QueryRow(ctx, query, doc.ID, doc.Title, doc.Type, doc.Number, doc.Year, doc.Authority, doc.Status).
		Scan(&doc.UpdatedAt)
}

func (r *Repository) GetDocument(ctx context.Context, id uuid.UUID) (*model.Document, error) {
	query := `
		SELECT id, title, type, number, year, authority, status, created_at, updated_at
		FROM documents WHERE id = $1`

	doc := &model.Document{}
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
func (r *Repository) FindDocumentByMetadata(ctx context.Context, title string, number *string, docType string) (*model.Document, error) {
	query := `
		SELECT id, title, type, number, year, authority, status, created_at, updated_at
		FROM documents
		WHERE type = $1 AND (LOWER(title) = LOWER($2) OR ($3::text IS NOT NULL AND LOWER(number) = LOWER($3)))`

	doc := &model.Document{}
	err := r.db.QueryRow(ctx, query, docType, title, number).Scan(
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
func (r *Repository) SearchDocuments(ctx context.Context, search string, filter model.DocumentFilter, limit, offset int) ([]model.Document, int, error) {
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

	var docs []model.Document
	for rows.Next() {
		d := model.Document{}
		if err := rows.Scan(&d.ID, &d.Title, &d.Type, &d.Number, &d.Year, &d.Authority, &d.Status, &d.CreatedAt, &d.UpdatedAt); err != nil {
			return nil, 0, err
		}
		docs = append(docs, d)
	}

	return docs, total, rows.Err()
}

// Units
func (r *Repository) CreateUnit(ctx context.Context, unit *model.Unit) error {
	query := `
		INSERT INTO units (document_id, level, code, text, parent_id, order_index)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, created_at`

	return r.db.QueryRow(ctx, query, unit.DocumentID, unit.Level, unit.Code,
		unit.Text, unit.ParentID, unit.OrderIndex).
		Scan(&unit.ID, &unit.CreatedAt)
}

func (r *Repository) GetUnit(ctx context.Context, id uuid.UUID) (*model.Unit, error) {
	query := `
		SELECT id, document_id, level, code, text, parent_id, order_index, created_at
		FROM units WHERE id = $1`

	unit := &model.Unit{}
	err := r.db.QueryRow(ctx, query, id).Scan(
		&unit.ID, &unit.DocumentID, &unit.Level, &unit.Code,
		&unit.Text, &unit.ParentID, &unit.OrderIndex, &unit.CreatedAt)
	if err != nil {
		return nil, err
	}
	return unit, nil
}

func (r *Repository) GetUnitsWithDocument(ctx context.Context, unitID uuid.UUID) (*model.Unit, *model.Document, error) {
	query := `
		SELECT u.id, u.document_id, u.level, u.code, u.text, u.parent_id, u.order_index, u.created_at,
		       d.id, d.title, d.type, d.number, d.year, d.authority, d.status, d.created_at, d.updated_at
		FROM units u
		JOIN documents d ON u.document_id = d.id
		WHERE u.id = $1`

	unit := &model.Unit{}
	doc := &model.Document{}
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
func (r *Repository) GetUnitsByDocument(ctx context.Context, docID uuid.UUID, limit, offset int) ([]model.Unit, int, error) {
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

	var units []model.Unit
	for rows.Next() {
		u := model.Unit{}
		if err := rows.Scan(&u.ID, &u.DocumentID, &u.Level, &u.Code, &u.Text, &u.ParentID, &u.OrderIndex, &u.CreatedAt); err != nil {
			return nil, 0, err
		}
		units = append(units, u)
	}

	return units, total, rows.Err()
}

// GetUnitTreeByDocument builds a nested tree of units for a document
func (r *Repository) GetUnitTreeByDocument(ctx context.Context, docID uuid.UUID) ([]model.UnitTree, error) {
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

	nodes := make(map[uuid.UUID]*model.UnitTree)
	var roots []model.UnitTree

	for rows.Next() {
		u := model.Unit{}
		if err := rows.Scan(&u.ID, &u.DocumentID, &u.Level, &u.Code, &u.Text, &u.ParentID, &u.OrderIndex, &u.CreatedAt); err != nil {
			return nil, err
		}
		n := model.UnitTree{Unit: u, Children: []model.UnitTree{}}
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
	var sortChildren func(items []model.UnitTree)
	sortChildren = func(items []model.UnitTree) {
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
func (r *Repository) GetCitations(ctx context.Context, unitID uuid.UUID) ([]model.CitationView, []model.CitationView, error) {
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

func (r *Repository) scanCitationRows(ctx context.Context, query string, unitID uuid.UUID) ([]model.CitationView, error) {
	rows, err := r.db.Query(ctx, query, unitID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []model.CitationView
	for rows.Next() {
		var v model.CitationView
		if err := rows.Scan(&v.ID, &v.SourceUnitID, &v.TargetUnitID, &v.Note, &v.PeerCode, &v.PeerLevel, &v.PeerDocumentID, &v.PeerDocument, &v.PeerSnippet); err != nil {
			return nil, err
		}
		items = append(items, v)
	}
	return items, rows.Err()
}

// SearchUnits finds units by keyword with document title for recommendation/search
func (r *Repository) SearchUnits(ctx context.Context, f model.UnitSearchFilter) ([]model.UnitView, int, error) {
	keyword := strings.TrimSpace(f.Keyword)
	if keyword == "" {
		return []model.UnitView{}, 0, nil
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

	var units []model.UnitView
	for rows.Next() {
		u := model.UnitView{}
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
func (r *Repository) SearchUnitsByEmbedding(ctx context.Context, embedding []float32, f model.UnitSearchFilter) ([]model.UnitSimilarityView, int, error) {
	if len(embedding) == 0 {
		return []model.UnitSimilarityView{}, 0, nil
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
	// Always include the distance filter as a base condition
	distanceClause := "(e.embedding <-> $1) < 0.95"
	whereSearch := "WHERE " + distanceClause
	if len(searchClauses) > 0 {
		whereSearch = "WHERE " + distanceClause + " AND " + strings.Join(searchClauses, " AND ")
	}

	vec := pgvector.NewVector(embedding)
	args := []any{vec}
	args = append(args, searchFilterArgs...)
	args = append(args, limit, offset)

	// Increased distance threshold from 0.85 to 0.95 for better recall with Gemini embeddings
	// Gemini text-embedding-004 tends to produce higher distances than OpenAI embeddings
	query := `
		SELECT u.id, u.document_id, u.level, u.code, u.text, u.parent_id, u.order_index, u.created_at,
		       d.title as document_title,
		       e.embedding <-> $1 as distance
		FROM unit_embeddings e
		JOIN units u ON e.unit_id = u.id
		JOIN documents d ON u.document_id = d.id
		` + whereSearch + `
		ORDER BY distance ASC, u.order_index ASC
		LIMIT $%d OFFSET $%d`

	query = fmt.Sprintf(query, len(args)-1, len(args))

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var units []model.UnitSimilarityView
	for rows.Next() {
		u := model.UnitSimilarityView{}
		if err := rows.Scan(&u.ID, &u.DocumentID, &u.Level, &u.Code, &u.Text, &u.ParentID, &u.OrderIndex, &u.CreatedAt,
			&u.DocumentTitle, &u.Distance); err != nil {
			return nil, 0, err
		}
		units = append(units, u)
	}

	return units, total, rows.Err()
}

// SearchUnitsByKeywords performs keyword-based search on units text.
// Ranks results by number of keywords matched and relevance.
// Requires at least 2 keywords to match for better precision.
// Searches BOTH text (Vietnamese with diacritics) AND text_unaccent (without diacritics)
// to support both input formats.
func (r *Repository) SearchUnitsByKeywords(ctx context.Context, keywords []string, limit int) ([]model.UnitSimilarityView, error) {
	if len(keywords) == 0 {
		return nil, nil
	}

	if limit <= 0 {
		limit = 10
	}

	// Build OR conditions for each keyword - search BOTH text and text_unaccent
	var conditions []string
	var matchCounts []string
	var args []any

	for i, kw := range keywords {
		// Search in: unit text (with/without diacritics) AND document title
		// Document title matches get bonus weight (2x) because they indicate specific law references
		conditions = append(conditions, fmt.Sprintf("(u.text ILIKE $%d OR u.text_unaccent ILIKE $%d OR d.title ILIKE $%d)", i+1, i+1, i+1))
		// Count matches with bonus for title matches (title match = 2 points, content match = 1 point)
		matchCounts = append(matchCounts, fmt.Sprintf("CASE WHEN d.title ILIKE $%d THEN 2 WHEN u.text ILIKE $%d OR u.text_unaccent ILIKE $%d THEN 1 ELSE 0 END", i+1, i+1, i+1))
		args = append(args, "%"+kw+"%")
	}
	args = append(args, limit)

	// Require at least 2 keywords to match for better precision
	minMatches := 2
	if len(keywords) == 1 {
		minMatches = 1
	}

	// Query ranks by number of keyword matches (more matches = better)
	// Distance is calculated as inverse of match count (lower = better)
	// Title matches count double, so max score is 2*len(keywords)
	matchCountExpr := strings.Join(matchCounts, " + ")
	maxScore := len(keywords) * 2 // Maximum possible score with all title matches
	query := fmt.Sprintf(`
		SELECT u.id, u.document_id, u.level, u.code, u.text, u.parent_id, u.order_index, u.created_at,
		       d.title as document_title,
		       (1.0 - ((%s)::float / %d.0)) * 0.5 as distance
		FROM units u
		JOIN documents d ON u.document_id = d.id
		WHERE (%s) AND (%s) >= %d
		ORDER BY (%s) DESC, u.order_index ASC
		LIMIT $%d`,
		matchCountExpr,
		maxScore,
		strings.Join(conditions, " OR "),
		matchCountExpr,
		minMatches,
		matchCountExpr,
		len(args))

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var units []model.UnitSimilarityView
	for rows.Next() {
		u := model.UnitSimilarityView{}
		if err := rows.Scan(&u.ID, &u.DocumentID, &u.Level, &u.Code, &u.Text, &u.ParentID, &u.OrderIndex, &u.CreatedAt,
			&u.DocumentTitle, &u.Distance); err != nil {
			return nil, err
		}
		units = append(units, u)
	}

	return units, rows.Err()
}

// SearchUnitsByLegalRef searches units by legal references extracted from text
// Patterns: "Điều X|DocTitle" (with document context) or "Điều X" (standalone)
// The pháp điển pattern like "Điều 9.1.LQ.472" is in the TEXT column
func (r *Repository) SearchUnitsByLegalRef(ctx context.Context, refs []string, limit int) ([]model.UnitSimilarityView, error) {
	if len(refs) == 0 {
		return nil, nil
	}

	if limit <= 0 {
		limit = 20
	}

	// Build OR conditions for each reference
	var conditions []string
	var args []interface{}
	argIdx := 1

	for _, ref := range refs {
		// Check if ref has document context (format: "Điều X|DocTitle")
		if strings.Contains(ref, "|") {
			parts := strings.SplitN(ref, "|", 2)
			if len(parts) == 2 {
				dieuPart := strings.TrimSpace(parts[0]) // "Điều X"
				docPart := strings.TrimSpace(parts[1])  // Document name like "Dân sự", "Hình sự"

				num := strings.TrimPrefix(dieuPart, "Điều ")
				num = strings.TrimSpace(num)

				// Search for pháp điển pattern "Điều X.X.LQ.{num}" in text AND EXACT document title match
				// Use exact match (=) for document title to avoid "Tố tụng hình sự" matching "Hình sự"
				conditions = append(conditions, fmt.Sprintf(
					"(u.text ILIKE $%d AND d.title = $%d)",
					argIdx, argIdx+1))
				args = append(args, "%Điều %.LQ."+num+".%")
				args = append(args, docPart) // Exact match, no wildcards
				argIdx += 2
			}
		} else if strings.HasPrefix(ref, "Điều ") {
			// Standalone "Điều X" - search broadly in text
			num := strings.TrimPrefix(ref, "Điều ")
			num = strings.TrimSpace(num)
			// Search for pháp điển pattern in TEXT
			conditions = append(conditions, fmt.Sprintf(
				"(u.text ILIKE $%d OR u.text_unaccent ILIKE $%d)",
				argIdx, argIdx))
			args = append(args, "%Điều %.LQ."+num+".%")
			argIdx++
		} else {
			// For other patterns (Luật, Bộ luật), search in text and document title
			conditions = append(conditions, fmt.Sprintf(
				"(u.text ILIKE $%d OR u.text_unaccent ILIKE $%d OR d.title ILIKE $%d)",
				argIdx, argIdx, argIdx))
			args = append(args, "%"+ref+"%")
			argIdx++
		}
	}

	if len(conditions) == 0 {
		return nil, nil
	}

	args = append(args, limit)

	query := fmt.Sprintf(`
		SELECT u.id, u.document_id, u.level, u.code, u.text, u.parent_id, u.order_index, u.created_at,
		       d.title as document_title,
		       0.1 as distance
		FROM units u
		JOIN documents d ON u.document_id = d.id
		WHERE %s
		ORDER BY u.level = 'article' DESC, u.order_index ASC
		LIMIT $%d`,
		strings.Join(conditions, " OR "),
		argIdx)

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var units []model.UnitSimilarityView
	for rows.Next() {
		u := model.UnitSimilarityView{}
		if err := rows.Scan(&u.ID, &u.DocumentID, &u.Level, &u.Code, &u.Text, &u.ParentID, &u.OrderIndex, &u.CreatedAt,
			&u.DocumentTitle, &u.Distance); err != nil {
			return nil, err
		}
		units = append(units, u)
	}

	return units, rows.Err()
}

// SearchTriplesByKeywords searches triples by matching keywords against unit text using ILIKE
// This is more accurate for Vietnamese text than full-text search
func (r *Repository) SearchTriplesByKeywords(ctx context.Context, keywords []string, limit int) ([]model.TripleSearchResult, error) {
	if len(keywords) == 0 {
		return nil, nil
	}
	if limit <= 0 {
		limit = 20
	}

	// Limit keywords to avoid overly complex queries
	maxKeywords := 6
	if len(keywords) > maxKeywords {
		keywords = keywords[:maxKeywords]
	}

	// Build ILIKE conditions for each keyword on text_unaccent column
	// This allows searching with non-diacritic Vietnamese input
	var conditions []string
	var args []interface{}
	argIdx := 1

	for _, kw := range keywords {
		if len(kw) >= 2 { // Only use keywords with at least 2 chars
			// Search on text_unaccent column for diacritic-insensitive matching
			conditions = append(conditions, fmt.Sprintf("u.text_unaccent ILIKE $%d", argIdx))
			args = append(args, "%"+kw+"%")
			argIdx++
		}
	}

	if len(conditions) == 0 {
		return nil, nil
	}

	// Use OR for keywords matching, then count how many matched
	whereClause := "(" + strings.Join(conditions, " OR ") + ")"

	// Build scoring expression to count keyword matches
	var scoreExprParts []string
	for i := range conditions {
		scoreExprParts = append(scoreExprParts, fmt.Sprintf("CASE WHEN u.text_unaccent ILIKE $%d THEN 1 ELSE 0 END", i+1))
	}
	scoreExpr := strings.Join(scoreExprParts, " + ")

	args = append(args, limit*3) // Fetch more to deduplicate later
	limitArg := fmt.Sprintf("$%d", argIdx)

	// Use subquery to first get unique units ordered by keyword matches,
	// then join back to get triple details
	query := fmt.Sprintf(`
		WITH ranked_units AS (
			SELECT DISTINCT u.id as unit_id, (%s) as keyword_matches
			FROM units u
			WHERE %s
			ORDER BY keyword_matches DESC
			LIMIT %s
		)
		SELECT t.id, t.subject_id, t.relation_id, t.object_id, t.unit_id, t.doc_ref,
		       t.confidence, t.tfidf, t.is_blacklisted, t.context, t.created_at,
		       cs.name as subject_name, cr.name as relation_name, co.name as object_name,
		       u.text as unit_text, d.title as document_title, d.id as document_id,
		       ru.keyword_matches
		FROM ranked_units ru
		JOIN units u ON ru.unit_id = u.id
		JOIN triples t ON t.unit_id = u.id
		JOIN concepts cs ON t.subject_id = cs.id
		JOIN relations cr ON t.relation_id = cr.id
		JOIN concepts co ON t.object_id = co.id
		JOIN documents d ON u.document_id = d.id
		WHERE t.is_blacklisted = false
		ORDER BY ru.keyword_matches DESC, t.tfidf DESC NULLS LAST, t.confidence DESC`,
		scoreExpr, whereClause, limitArg)

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []model.TripleSearchResult
	for rows.Next() {
		tr := model.TripleSearchResult{}
		var keywordMatches int
		err := rows.Scan(
			&tr.ID, &tr.SubjectID, &tr.RelationID, &tr.ObjectID, &tr.UnitID,
			&tr.DocRef, &tr.Confidence, &tr.TfIdf, &tr.IsBlacklisted, &tr.Context, &tr.CreatedAt,
			&tr.SubjectName, &tr.RelationName, &tr.ObjectName,
			&tr.UnitText, &tr.DocumentTitle, &tr.DocumentID,
			&keywordMatches)
		if err != nil {
			return nil, err
		}
		tr.KeywordMatches = keywordMatches
		// Score = weighted combination of keyword matches, tfidf, and confidence
		tr.MatchScore = float32(keywordMatches)/float32(len(keywords))*0.5 + tr.TfIdf*0.25 + tr.Confidence*0.25
		results = append(results, tr)
	}

	// Sort by match score descending
	sort.Slice(results, func(i, j int) bool {
		return results[i].MatchScore > results[j].MatchScore
	})

	// Limit results after sorting
	if len(results) > limit {
		results = results[:limit]
	}

	return results, rows.Err()
}

// GetUnitsByTriples retrieves unique units from triple results, with proper citations
func (r *Repository) GetUnitsByTriples(ctx context.Context, triples []model.TripleSearchResult, limit int) ([]model.UnitSimilarityView, error) {
	if len(triples) == 0 {
		return nil, nil
	}

	// Collect unique unit IDs preserving order (higher scoring first)
	seen := make(map[uuid.UUID]bool)
	var unitIDs []uuid.UUID
	unitScores := make(map[uuid.UUID]float32)

	for _, t := range triples {
		if !seen[t.UnitID] {
			seen[t.UnitID] = true
			unitIDs = append(unitIDs, t.UnitID)
			unitScores[t.UnitID] = t.MatchScore
		} else {
			// Accumulate score if same unit found from multiple triples
			unitScores[t.UnitID] += t.MatchScore * 0.5
		}
	}

	if limit > 0 && len(unitIDs) > limit {
		unitIDs = unitIDs[:limit]
	}

	// Fetch units
	query := `
		SELECT u.id, u.document_id, u.level, u.code, u.text, u.parent_id, u.order_index, u.created_at,
		       d.title as document_title
		FROM units u
		JOIN documents d ON u.document_id = d.id
		WHERE u.id = ANY($1)`

	rows, err := r.db.Query(ctx, query, unitIDs)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	unitMap := make(map[uuid.UUID]model.UnitSimilarityView)
	for rows.Next() {
		u := model.UnitSimilarityView{}
		err := rows.Scan(&u.ID, &u.DocumentID, &u.Level, &u.Code, &u.Text, &u.ParentID, &u.OrderIndex, &u.CreatedAt, &u.DocumentTitle)
		if err != nil {
			return nil, err
		}
		// Convert score to distance (lower = better)
		u.Distance = 1.0 - unitScores[u.ID]/(unitScores[u.ID]+1.0)
		unitMap[u.ID] = u
	}

	// Preserve original order
	var results []model.UnitSimilarityView
	for _, id := range unitIDs {
		if u, ok := unitMap[id]; ok {
			results = append(results, u)
		}
	}

	return results, rows.Err()
}

// Concepts
func (r *Repository) CreateConcept(ctx context.Context, concept *model.Concept) error {
	query := `
		INSERT INTO concepts (name, description, synonyms, keywords, concept_type)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, created_at`

	return r.db.QueryRow(ctx, query, concept.Name, concept.Description, concept.Synonyms,
		concept.Keywords, concept.Type).
		Scan(&concept.ID, &concept.CreatedAt)
}

func (r *Repository) UpsertConcept(ctx context.Context, name string, synonyms []string, conceptType string) (*model.Concept, error) {
	// First try to find existing
	query := `SELECT id, name, description, synonyms, keywords, concept_type, created_at FROM concepts WHERE LOWER(name) = LOWER($1)`
	concept := &model.Concept{}
	err := r.db.QueryRow(ctx, query, name).Scan(
		&concept.ID, &concept.Name, &concept.Description, &concept.Synonyms,
		&concept.Keywords, &concept.Type, &concept.CreatedAt)

	if err == nil {
		return concept, nil
	}

	// Create new
	concept = &model.Concept{
		Name:     name,
		Synonyms: synonyms,
		Type:     conceptType,
		Keywords: []string{},
	}
	if err := r.CreateConcept(ctx, concept); err != nil {
		return nil, err
	}
	return concept, nil
}

func (r *Repository) GetOrCreateConcept(ctx context.Context, name string, conceptType string) (*model.Concept, error) {
	return r.UpsertConcept(ctx, name, []string{}, conceptType)
}

// GetAllConcepts retrieves all concepts from the database
func (r *Repository) GetAllConcepts(ctx context.Context) ([]model.Concept, error) {
	query := `SELECT id, name, description, synonyms, keywords, concept_type, created_at FROM concepts`
	rows, err := r.db.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var concepts []model.Concept
	for rows.Next() {
		var c model.Concept
		if err := rows.Scan(&c.ID, &c.Name, &c.Description, &c.Synonyms, &c.Keywords, &c.Type, &c.CreatedAt); err != nil {
			return nil, err
		}
		concepts = append(concepts, c)
	}
	return concepts, nil
}

// FindConceptCandidates finds potential concepts matching a term
func (r *Repository) FindConceptCandidates(ctx context.Context, term string) ([]model.QueryCandidate, error) {
	term = strings.ToLower(strings.TrimSpace(term))
	if term == "" {
		return nil, nil
	}

	query := `
		SELECT id, name, concept_type,
		       CASE 
		         WHEN LOWER(name) = $1 THEN 1.0
		         WHEN $1 = ANY(ARRAY(SELECT LOWER(unnest(synonyms)))) THEN 0.9
		         WHEN LOWER(name) LIKE $1 || '%' THEN 0.8
		         WHEN LOWER(name) LIKE '%' || $1 || '%' THEN 0.6
		         ELSE 0.0
		       END as score,
		       CASE 
		         WHEN LOWER(name) = $1 THEN 'exact'
		         WHEN $1 = ANY(ARRAY(SELECT LOWER(unnest(synonyms)))) THEN 'synonym'
		         WHEN LOWER(name) LIKE $1 || '%' THEN 'prefix'
		         ELSE 'fuzzy'
		       END as match_type
		FROM concepts 
		WHERE LOWER(name) = $1 
		   OR $1 = ANY(ARRAY(SELECT LOWER(unnest(synonyms))))
		   OR LOWER(name) LIKE '%' || $1 || '%'
		ORDER BY score DESC, length(name) ASC, name
		LIMIT 10`

	rows, err := r.db.Query(ctx, query, term)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var candidates []model.QueryCandidate
	for rows.Next() {
		var id uuid.UUID
		var name, conceptType, matchType string
		var score float32

		if err := rows.Scan(&id, &name, &conceptType, &score, &matchType); err != nil {
			return nil, err
		}

		candidates = append(candidates, model.QueryCandidate{
			Type:      "subject", // Default, caller can adjust
			ConceptID: &id,
			Name:      name,
			Score:     score,
			MatchType: matchType,
		})
	}

	return candidates, rows.Err()
}

// Relations

func (r *Repository) CreateRelation(ctx context.Context, relation *model.Relation) error {
	query := `
		INSERT INTO relations (name, description, keywords, relation_type)
		VALUES ($1, $2, $3, $4)
		RETURNING id, created_at`

	return r.db.QueryRow(ctx, query, relation.Name, relation.Description,
		relation.Keywords, relation.RelationType).
		Scan(&relation.ID, &relation.CreatedAt)
}

func (r *Repository) GetOrCreateRelation(ctx context.Context, name string, relationType string) (*model.Relation, error) {
	// Try to get existing
	query := `SELECT id, name, description, keywords, relation_type, created_at 
	          FROM relations WHERE name = $1`

	relation := &model.Relation{}
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
	relation = &model.Relation{
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
func (r *Repository) UpsertRelation(ctx context.Context, name string, keywords []string, relationType string) (*model.Relation, error) {
	if relationType == "" {
		relationType = "general"
	}

	// Try to get existing
	query := `SELECT id, name, description, keywords, relation_type, created_at 
	          FROM relations WHERE name = $1`

	relation := &model.Relation{}
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
	relation = &model.Relation{
		Name:         name,
		RelationType: relationType,
		Keywords:     keywords,
	}

	if err := r.CreateRelation(ctx, relation); err != nil {
		return nil, err
	}
	return relation, nil
}

// GetAllRelations retrieves all relations from the database
func (r *Repository) GetAllRelations(ctx context.Context) ([]model.Relation, error) {
	query := `SELECT id, name, description, keywords, relation_type, created_at FROM relations`
	rows, err := r.db.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var relations []model.Relation
	for rows.Next() {
		var rel model.Relation
		if err := rows.Scan(&rel.ID, &rel.Name, &rel.Description, &rel.Keywords, &rel.RelationType, &rel.CreatedAt); err != nil {
			return nil, err
		}
		relations = append(relations, rel)
	}
	return relations, nil
}

func (r *Repository) FindRelationCandidates(ctx context.Context, term string) ([]model.QueryCandidate, error) {
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

	var candidates []model.QueryCandidate
	for rows.Next() {
		var id uuid.UUID
		var name, relationType, matchType string
		var score float32

		if err := rows.Scan(&id, &name, &relationType, &score, &matchType); err != nil {
			return nil, err
		}

		candidates = append(candidates, model.QueryCandidate{
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

func (r *Repository) CreateTriple(ctx context.Context, triple *model.Triple) error {
	query := `
		INSERT INTO triples (subject_id, relation_id, object_id, unit_id, doc_ref, confidence, context)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, created_at`

	return r.db.QueryRow(ctx, query, triple.SubjectID, triple.RelationID, triple.ObjectID,
		triple.UnitID, triple.DocRef, triple.Confidence, triple.Context).
		Scan(&triple.ID, &triple.CreatedAt)
}

// InsertTriple inserts a triple with TF-IDF and blacklist support
func (r *Repository) InsertTriple(ctx context.Context, triple *model.Triple) error {
	query := `
		INSERT INTO triples (subject_id, relation_id, object_id, unit_id, doc_ref, confidence, tfidf, is_blacklisted, context)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id, created_at`

	return r.db.QueryRow(ctx, query, triple.SubjectID, triple.RelationID, triple.ObjectID,
		triple.UnitID, triple.DocRef, triple.Confidence, triple.TfIdf, triple.IsBlacklisted, triple.Context).
		Scan(&triple.ID, &triple.CreatedAt)
}

// FindTriplesByStar finds triples matching a star pattern
func (r *Repository) FindTriplesByStar(ctx context.Context, star model.QueryStar) ([]model.TripleView, error) {
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

	var triples []model.TripleView
	for rows.Next() {
		tv := model.TripleView{}
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

// LoadFrequentBigrams loads frequently occurring bigrams from concepts table
// These are used for Vietnamese legal term extraction
func (r *Repository) LoadFrequentBigrams(ctx context.Context, minFrequency int, limit int) (map[string]bool, error) {
	if minFrequency <= 0 {
		minFrequency = 5 // Default: must appear at least 5 times in triples
	}
	if limit <= 0 {
		limit = 1000 // Default: top 1000 bigrams
	}

	// Query concepts that appear frequently in triples (subject or object)
	// This gives us the most important legal bigrams
	query := `
		SELECT c.name, COUNT(*) as freq
		FROM concepts c
		JOIN (
			SELECT subject_id as concept_id FROM triples WHERE is_blacklisted = false
			UNION ALL
			SELECT object_id as concept_id FROM triples WHERE is_blacklisted = false
		) t ON c.id = t.concept_id
		WHERE c.name LIKE '% %'  -- Only bigrams (contains space)
		  AND LENGTH(c.name) > 3  -- Avoid very short terms
		  AND c.name NOT LIKE '%  %'  -- Exclude double spaces (malformed)
		GROUP BY c.name
		HAVING COUNT(*) >= $1
		ORDER BY freq DESC
		LIMIT $2
	`

	rows, err := r.db.Query(ctx, query, minFrequency, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to load bigrams: %w", err)
	}
	defer rows.Close()

	bigrams := make(map[string]bool)
	count := 0
	for rows.Next() {
		var name string
		var freq int
		if err := rows.Scan(&name, &freq); err != nil {
			continue
		}
		// Store in lowercase for case-insensitive matching
		bigrams[strings.ToLower(name)] = true
		count++
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error reading bigrams: %w", err)
	}

	return bigrams, nil
}
