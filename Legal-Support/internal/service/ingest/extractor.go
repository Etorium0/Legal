package ingest

import (
	"context"
	"regexp"
	"strings"

	"example.com/legallaw/internal/model"
	"github.com/google/uuid"
)

// extractTriplesFromText analyzes legal text and extracts knowledge triples
func (s *Service) extractTriplesFromText(ctx context.Context, unit *model.Unit, doc *model.Document) ([]model.Triple, int, int, error) {
	text := strings.ToLower(unit.Text)
	docRef := s.buildDocRef(doc, unit)

	var triples []model.Triple
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
func (s *Service) extractTriplesByPattern(ctx context.Context, pattern, relationName, text string,
	unitID uuid.UUID, docRef string, conceptsCreated, relationsCreated *int) []model.Triple {

	regex, err := regexp.Compile(pattern)
	if err != nil {
		return nil
	}

	matches := regex.FindAllStringSubmatch(text, -1)
	if len(matches) == 0 {
		return nil
	}

	var triples []model.Triple

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
		triple := model.Triple{
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
