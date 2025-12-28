package graph

import (
	"context"
	"fmt"
	"regexp"
	"strings"

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

// Ingestion service handles legal content ingestion
type IngestionService struct {
	repo           *Repository
	embedder       EmbeddingProvider
	embeddingModel string
}

// NewIngestionService creates a new ingestion service
func NewIngestionService(repo *Repository, embedder EmbeddingProvider, embeddingModel string) *IngestionService {
	return &IngestionService{repo: repo, embedder: embedder, embeddingModel: embeddingModel}
}

// IngestLegalContent processes and stores legal content
func (s *IngestionService) IngestLegalContent(ctx context.Context, req IngestRequest) (*IngestResponse, error) {
	// Check if document exists to avoid duplicates
	existingDoc, err := s.repo.FindDocumentByMetadata(ctx, req.Document.Title, req.Document.Number)
	if err != nil {
		return nil, fmt.Errorf("checking for existing document: %w", err)
	}

	if existingDoc != nil {
		return &IngestResponse{
			DocumentID:        existingDoc.ID,
			ProcessingSummary: fmt.Sprintf("Document '%s' already exists. Skipped re-ingestion.", existingDoc.Title),
		}, nil
	}

	// Create document
	doc := &Document{
		Title:     req.Document.Title,
		Type:      req.Document.Type,
		Number:    req.Document.Number,
		Year:      req.Document.Year,
		Authority: req.Document.Authority,
		Status:    "active",
	}

	if err := s.repo.CreateDocument(ctx, doc); err != nil {
		return nil, fmt.Errorf("creating document: %w", err)
	}

	// Track creation counts
	response := &IngestResponse{
		DocumentID: doc.ID,
	}

	// Create units and process their content
	unitMap := make(map[string]uuid.UUID) // code -> unit_id
	createdUnits := []Unit{}

	for _, unitReq := range req.Units {
		unit := &Unit{
			DocumentID: doc.ID,
			Level:      unitReq.Level,
			Code:       unitReq.Code,
			Text:       unitReq.Text,
			OrderIndex: unitReq.OrderIndex,
		}

		// Handle parent relationship
		if unitReq.ParentCode != nil && *unitReq.ParentCode != "" {
			if parentID, exists := unitMap[*unitReq.ParentCode]; exists {
				unit.ParentID = &parentID
			}
		}

		if err := s.repo.CreateUnit(ctx, unit); err != nil {
			return nil, fmt.Errorf("creating unit %s: %w", *unit.Code, err)
		}

		if unit.Code != nil {
			unitMap[*unit.Code] = unit.ID
		}
		response.UnitsCreated++
		createdUnits = append(createdUnits, *unit)
	}

	// Auto-embed unit texts when an embedding provider is configured (default: on).
	if s.embedder != nil {
		model := req.EmbeddingModel
		if model == "" {
			model = s.embeddingModel
		}
		auto := true
		if req.AutoEmbed != nil {
			auto = *req.AutoEmbed
		}
		if auto {
			for _, unit := range createdUnits {
				emb, err := s.embedder.Embed(ctx, unit.Text)
				if err != nil {
					return nil, fmt.Errorf("embedding unit %s: %w", unit.ID, err)
				}
				if err := s.repo.UpsertUnitEmbedding(ctx, unit.ID, emb, model); err != nil {
					return nil, fmt.Errorf("storing embedding for unit %s: %w", unit.ID, err)
				}
				response.EmbeddingsCreated++
			}
		}
	}

	// Create explicit concepts if provided
	for _, conceptReq := range req.Concepts {
		conceptType := conceptReq.Type
		if conceptType == "" {
			conceptType = "general"
		}

		_, err := s.repo.UpsertConcept(ctx, conceptReq.Name, conceptReq.Synonyms, conceptType)
		if err != nil {
			return nil, fmt.Errorf("upserting concept %s: %w", conceptReq.Name, err)
		}
		response.ConceptsCreated++
	}

	// Create explicit relations if provided
	for _, relationReq := range req.Relations {
		relationType := relationReq.Type
		if relationType == "" {
			relationType = "general"
		}

		_, err := s.repo.UpsertRelation(ctx, relationReq.Name, relationReq.Keywords, relationType)
		if err != nil {
			return nil, fmt.Errorf("upserting relation %s: %w", relationReq.Name, err)
		}
		response.RelationsCreated++
	}

	// Create explicit triples if provided
	for _, tripleReq := range req.Triples {
		if err := s.createTripleFromRequest(ctx, tripleReq, unitMap); err != nil {
			return nil, fmt.Errorf("creating triple %s-%s-%s: %w", tripleReq.Subject, tripleReq.Relation, tripleReq.Object, err)
		}
		response.TriplesCreated++
	}

	// Extract additional triples from unit text if no explicit triples provided
	if len(req.Triples) == 0 {
		for unitCode, unitID := range unitMap {
			unit, err := s.repo.GetUnit(ctx, unitID)
			if err != nil {
				continue
			}

			triples, conceptsCreated, relationsCreated, err := s.extractTriplesFromText(ctx, unit, doc)
			if err != nil {
				return nil, fmt.Errorf("extracting triples from unit %s: %w", unitCode, err)
			}

			response.TriplesCreated += len(triples)
			response.ConceptsCreated += conceptsCreated
			response.RelationsCreated += relationsCreated
		}
	}

	response.ProcessingSummary = fmt.Sprintf(
		"Successfully ingested document '%s' with %d units, extracted %d triples, created %d new concepts and %d new relations",
		doc.Title, response.UnitsCreated, response.TriplesCreated, response.ConceptsCreated, response.RelationsCreated)

	return response, nil
}

// extractTriplesFromText analyzes legal text and extracts knowledge triples
func (s *IngestionService) extractTriplesFromText(ctx context.Context, unit *Unit, doc *Document) ([]Triple, int, int, error) {
	text := strings.ToLower(unit.Text)
	docRef := s.buildDocRef(doc, unit)

	var triples []Triple
	var conceptsCreated, relationsCreated int

	// Simple legal pattern extraction - this is a basic implementation
	// In a real system, you'd use NLP/ML for better extraction

	// Pattern 1: "X is prohibited/forbidden/banned"
	prohibitionPatterns := []string{
		`([a-zA-Z\s]+) is prohibited`,
		`([a-zA-Z\s]+) is forbidden`,
		`([a-zA-Z\s]+) is banned`,
		`([a-zA-Z\s]+) shall not be`,
		`no ([a-zA-Z\s]+) shall`,
		`([\p{L}0-9\s,]+) không được ([^.;]+)`,
		`([\p{L}0-9\s,]+) bị nghiêm cấm ([^.;]+)`,
		`([\p{L}0-9\s,]+) nghiêm cấm ([^.;]+)`,
	}

	for _, pattern := range prohibitionPatterns {
		triples = append(triples, s.extractTriplesByPattern(ctx, pattern, "cấm", text, unit.ID, docRef, &conceptsCreated, &relationsCreated)...)
	}

	// Pattern 2: "X requires Y" or "X must Y"
	requirementPatterns := []string{
		`([a-zA-Z\s]+) requires ([a-zA-Z\s]+)`,
		`([a-zA-Z\s]+) must ([a-zA-Z\s]+)`,
		`([a-zA-Z\s]+) shall ([a-zA-Z\s]+)`,
		`([\p{L}0-9\s,]+) phải ([^.;]+)`,
		`([\p{L}0-9\s,]+) có trách nhiệm ([^.;]+)`,
		`([\p{L}0-9\s,]+) bắt buộc ([^.;]+)`,
	}

	for _, pattern := range requirementPatterns {
		triples = append(triples, s.extractTriplesByPattern(ctx, pattern, "phải", text, unit.ID, docRef, &conceptsCreated, &relationsCreated)...)
	}

	// Pattern 3: "Fine of X for Y" or "Penalty of X for Y"
	penaltyPatterns := []string{
		`fine of ([0-9,.\s]+(?:vnd|dong|dollars?)) for ([a-zA-Z\s]+)`,
		`penalty of ([0-9,.\s]+(?:vnd|dong|dollars?)) for ([a-zA-Z\s]+)`,
		`([a-zA-Z\s]+) (?:shall be )?punished by ([a-zA-Z\s0-9,.-]+)`,
		`phạt tiền (?:từ )?([0-9\.\s]+(?:đ|đồng|vnđ)) (?:đến [0-9\.\s]+(?:đ|đồng|vnđ) )?đối với ([^.;]+)`,
		`phạt ([^.;]+) đối với ([^.;]+)`,
		`xử phạt ([^.;]+) đối với ([^.;]+)`,
		`bị phạt ([^.;]+) khi ([^.;]+)`,
	}

	for _, pattern := range penaltyPatterns {
		triples = append(triples, s.extractTriplesByPattern(ctx, pattern, "xử phạt", text, unit.ID, docRef, &conceptsCreated, &relationsCreated)...)
	}

	// Pattern 4: "X applies to Y" or "X covers Y"
	applicationPatterns := []string{
		`([a-zA-Z\s]+) applies to ([a-zA-Z\s]+)`,
		`([a-zA-Z\s]+) covers ([a-zA-Z\s]+)`,
		`this ([a-zA-Z\s]+) applies to ([a-zA-Z\s]+)`,
		`([\p{L}0-9\s,]+) áp dụng cho ([^.;]+)`,
		`([\p{L}0-9\s,]+) áp dụng đối với ([^.;]+)`,
	}

	for _, pattern := range applicationPatterns {
		triples = append(triples, s.extractTriplesByPattern(ctx, pattern, "áp dụng", text, unit.ID, docRef, &conceptsCreated, &relationsCreated)...)
	}

	// Pattern 5: Scope/Regulation (Vietnamese)
	scopePatterns := []string{
		`([\p{L}0-9\s,]+) quy định về ([^.;]+)`,
		`([\p{L}0-9\s,]+) bao gồm ([^.;]+)`,
		`phạm vi điều chỉnh của ([\p{L}0-9\s,]+) là ([^.;]+)`,
		`phạm vi điều chỉnh của ([\p{L}0-9\s,]+) bao gồm ([^.;]+)`,
		`([\p{L}0-9\s,]+) có phạm vi điều chỉnh ([^.;]+)`,
	}

	for _, pattern := range scopePatterns {
		triples = append(triples, s.extractTriplesByPattern(ctx, pattern, "phạm vi điều chỉnh", text, unit.ID, docRef, &conceptsCreated, &relationsCreated)...)
	}

	return triples, conceptsCreated, relationsCreated, nil
}

// extractTriplesByPattern extracts triples using regex patterns
func (s *IngestionService) extractTriplesByPattern(ctx context.Context, pattern, relationName, text string,
	unitID uuid.UUID, docRef string, conceptsCreated, relationsCreated *int) []Triple {

	regex, err := regexp.Compile(pattern)
	if err != nil {
		return nil
	}

	matches := regex.FindAllStringSubmatch(text, -1)
	if len(matches) == 0 {
		return nil
	}

	var triples []Triple

	for _, match := range matches {
		if len(match) < 3 {
			continue
		}

		subjectName := strings.TrimSpace(match[1])
		objectName := strings.TrimSpace(match[2])

		// Vietnamese penalty mapping: carry amount to context and set violation as object
		var extraContext *string
		if relationName == "xử phạt" && strings.Contains(pattern, "đối với") {
			ctx := subjectName
			extraContext = &ctx
			subjectName = "người vi phạm"
			objectName = strings.TrimSpace(match[2])
		}

		if subjectName == "" || objectName == "" {
			continue
		}

		// Create or get concepts
		subject, err := s.repo.GetOrCreateConcept(ctx, subjectName, "entity")
		if err != nil {
			continue
		}
		if subject.CreatedAt.IsZero() { // Check if it was just created
			*conceptsCreated++
		}

		object, err := s.repo.GetOrCreateConcept(ctx, objectName, "entity")
		if err != nil {
			continue
		}
		if object.CreatedAt.IsZero() {
			*conceptsCreated++
		}

		// Create or update relation with keywords
		var relationKeywords []string
		switch relationName {
		case "cấm":
			relationKeywords = []string{"cấm", "nghiêm cấm", "không được", "forbidden", "prohibited", "ban"}
		case "phải":
			relationKeywords = []string{"phải", "bắt buộc", "có trách nhiệm", "must", "shall", "require"}
		case "xử phạt":
			relationKeywords = []string{"xử phạt", "mức phạt", "phạt", "phạt tiền", "bị phạt", "penalty", "fine", "punish"}
		case "áp dụng":
			relationKeywords = []string{"áp dụng", "điều chỉnh", "thực hiện đối với", "applies", "covers"}
		case "phạm vi điều chỉnh":
			relationKeywords = []string{"phạm vi điều chỉnh", "quy định về", "bao gồm", "scope", "regulates"}
		default:
			relationKeywords = []string{relationName}
		}

		relation, err := s.repo.UpsertRelation(ctx, relationName, relationKeywords, "legal_rule")
		if err != nil {
			continue
		}
		if relation.CreatedAt.IsZero() {
			*relationsCreated++
		}

		// Create triple
		triple := Triple{
			SubjectID:  subject.ID,
			RelationID: relation.ID,
			ObjectID:   object.ID,
			UnitID:     unitID,
			DocRef:     docRef,
			Confidence: 0.8,
			Context:    extraContext,
		}

		if err := s.repo.CreateTriple(ctx, &triple); err == nil {
			triples = append(triples, triple)
		}
	}

	return triples
}

// createTripleFromRequest creates a triple from a triple request
func (s *IngestionService) createTripleFromRequest(ctx context.Context, req TripleRequest, unitMap map[string]uuid.UUID) error {
	// Get unit ID from code
	unitID, exists := unitMap[req.UnitCode]
	if !exists {
		return fmt.Errorf("unit code %s not found", req.UnitCode)
	}

	// Get or create subject concept
	subject, err := s.repo.UpsertConcept(ctx, req.Subject, []string{}, "entity")
	if err != nil {
		return fmt.Errorf("upserting subject concept: %w", err)
	}

	// Get or create object concept
	object, err := s.repo.UpsertConcept(ctx, req.Object, []string{}, "entity")
	if err != nil {
		return fmt.Errorf("upserting object concept: %w", err)
	}

	// Get or create relation
	relation, err := s.repo.UpsertRelation(ctx, req.Relation, []string{}, "legal_rule")
	if err != nil {
		return fmt.Errorf("upserting relation: %w", err)
	}

	// Set default TF-IDF if not provided
	tfidf := float32(0.5)
	if req.TfIdf != nil {
		tfidf = *req.TfIdf
	}

	// Create triple
	triple := &Triple{
		SubjectID:     subject.ID,
		RelationID:    relation.ID,
		ObjectID:      object.ID,
		UnitID:        unitID,
		DocRef:        req.DocRef,
		Confidence:    0.9, // High confidence for explicit triples
		TfIdf:         tfidf,
		IsBlacklisted: false,
		Context:       req.Context,
	}

	return s.repo.InsertTriple(ctx, triple)
}

// buildDocRef creates a human-readable document reference
func (s *IngestionService) buildDocRef(doc *Document, unit *Unit) string {
	parts := []string{}

	if doc.Type != "" {
		parts = append(parts, doc.Type)
	}

	if doc.Number != nil && *doc.Number != "" {
		parts = append(parts, *doc.Number)
	}

	if doc.Year != nil && *doc.Year > 0 {
		parts = append(parts, fmt.Sprintf("%d", *doc.Year))
	}

	if unit.Code != nil && *unit.Code != "" {
		parts = append(parts, *unit.Code)
	}

	if len(parts) == 0 {
		return doc.Title
	}

	return strings.Join(parts, " ")
}
