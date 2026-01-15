package ingest

import (
	"context"
	"fmt"
	"strings"

	"example.com/legallaw/internal/ai/embedding"
	"example.com/legallaw/internal/model"
	"example.com/legallaw/internal/repository"
	"github.com/google/uuid"
)

// Service handles legal content ingestion
type Service struct {
	repo           *repository.Repository
	embedder       embedding.EmbeddingProvider
	embeddingModel string
}

// NewService creates a new ingestion service
func NewService(repo *repository.Repository, embedder embedding.EmbeddingProvider, embeddingModel string) *Service {
	return &Service{repo: repo, embedder: embedder, embeddingModel: embeddingModel}
}

// IngestLegalContent processes and stores legal content
func (s *Service) IngestLegalContent(ctx context.Context, req IngestRequest) (*IngestResponse, error) {
	// Check if document exists to avoid duplicates
	existingDoc, err := s.repo.FindDocumentByMetadata(ctx, req.Document.Title, req.Document.Number, req.Document.Type)
	if err != nil {
		return nil, fmt.Errorf("checking for existing document: %w", err)
	}

	if existingDoc != nil {
		return &IngestResponse{
			DocumentID:        existingDoc.ID,
			ProcessingSummary: fmt.Sprintf("Document '%s' (type=%s) already exists. Skipped re-ingestion.", existingDoc.Title, existingDoc.Type),
		}, nil
	}

	// Create document
	doc := &model.Document{
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
	createdUnits := []model.Unit{}

	for _, unitReq := range req.Units {
		unit := &model.Unit{
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

// createTripleFromRequest creates a triple from a triple request
func (s *Service) createTripleFromRequest(ctx context.Context, req TripleRequest, unitMap map[string]uuid.UUID) error {
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
	triple := &model.Triple{
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
func (s *Service) buildDocRef(doc *model.Document, unit *model.Unit) string {
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
