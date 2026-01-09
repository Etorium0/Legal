package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"regexp"
	"strings"

	"github.com/google/uuid"
	"github.com/joho/godotenv"

	"example.com/legallaw/internal/config"
	"example.com/legallaw/internal/db"
	"example.com/legallaw/internal/graph"
)

// LegalTriple represents an extracted triple
type LegalTriple struct {
	Subject  string `json:"subject"`
	Relation string `json:"relation"`
	Object   string `json:"object"`
	Context  string `json:"context"`
}

// Common legal relations for Vietnamese law
var legalRelations = map[string][]string{
	"quy_dinh": {
		"quy định", "được quy định", "theo quy định", "quy định tại",
		"quy định về", "căn cứ quy định", "tuân theo quy định",
	},
	"cam": {
		"cấm", "nghiêm cấm", "không được", "bị cấm", "cấm thực hiện",
	},
	"cho_phep": {
		"được phép", "có quyền", "được", "cho phép", "có thể",
	},
	"xu_phat": {
		"phạt", "bị phạt", "xử phạt", "phạt tiền", "phạt tù",
		"bị xử phạt", "hình phạt", "chế tài",
	},
	"giam_nhe": {
		"giảm nhẹ", "được giảm", "giảm mức", "giảm án", "giảm hình phạt",
		"tình tiết giảm nhẹ", "được giảm nhẹ",
	},
	"tang_nang": {
		"tăng nặng", "tình tiết tăng nặng", "bị tăng nặng",
	},
	"mien": {
		"miễn", "được miễn", "miễn trách nhiệm", "miễn hình phạt",
	},
	"yeu_cau": {
		"phải", "bắt buộc", "yêu cầu", "cần phải", "phải có",
	},
	"ap_dung": {
		"áp dụng", "được áp dụng", "áp dụng đối với", "áp dụng cho",
	},
	"bao_gom": {
		"bao gồm", "gồm có", "gồm", "bao hàm",
	},
	"la": {
		"là", "được hiểu là", "được xác định là", "nghĩa là",
	},
	"dan_den": {
		"dẫn đến", "gây ra", "làm cho", "khiến cho",
	},
	"tu_thu": {
		"tự thú", "ra đầu thú", "đầu thú", "tự nguyện khai báo",
	},
	"truy_cuu": {
		"truy cứu", "truy tố", "khởi tố", "điều tra",
	},
	"thoi_hieu": {
		"thời hiệu", "hết thời hiệu", "trong thời hiệu",
	},
}

// Criminal law concepts
var criminalConcepts = []string{
	// Crimes
	"giết người", "cố ý gây thương tích", "hiếp dâm", "cướp tài sản",
	"trộm cắp tài sản", "lừa đảo", "tham nhũng", "hối lộ", "buôn lậu",
	"ma túy", "mua bán người", "bắt cóc", "đánh bạc", "rửa tiền",
	"tội phạm", "hành vi phạm tội", "người phạm tội",
	// Penalties
	"tù chung thân", "tử hình", "phạt tù", "phạt tiền", "cảnh cáo",
	"cải tạo không giam giữ", "trục xuất", "cấm đảm nhiệm chức vụ",
	"tịch thu tài sản", "quản chế",
	// Mitigation
	"tình tiết giảm nhẹ", "tự thú", "đầu thú", "thành khẩn khai báo",
	"ăn năn hối cải", "tự nguyện bồi thường", "khắc phục hậu quả",
	"phạm tội lần đầu", "người chưa thành niên",
	// Aggravation
	"tình tiết tăng nặng", "tái phạm", "tái phạm nguy hiểm",
	"có tổ chức", "dùng hung khí nguy hiểm", "man rợ",
	// Process
	"khởi tố", "điều tra", "truy tố", "xét xử", "thi hành án",
	"thời hiệu truy cứu", "miễn trách nhiệm hình sự",
	// Subjects
	"bị cáo", "bị can", "người bị hại", "nguyên đơn", "bị đơn",
	"luật sư", "kiểm sát viên", "thẩm phán", "hội đồng xét xử",
}

func main() {
	_ = godotenv.Load()
	cfg := config.Load()

	ctx := context.Background()

	pool, err := db.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("db connect: %v", err)
	}
	defer pool.Close()

	repo := graph.NewRepository(pool)

	// Get document IDs for criminal law
	docIDs := os.Getenv("DOCUMENT_IDS")
	if docIDs == "" {
		// Default: Hình sự, Tố tụng hình sự, Thi hành án hình sự
		docIDs = "f784adb8-b34d-41af-9056-255293a38a9d,0693ff97-7174-46b4-aafd-906fd4c0e706,761aa168-fd60-4669-9d68-89723dd00fe9"
	}

	// First, create/upsert all criminal concepts
	log.Println("Creating criminal law concepts...")
	conceptMap := make(map[string]*graph.Concept)
	for _, conceptName := range criminalConcepts {
		concept, err := repo.UpsertConcept(ctx, conceptName, nil, "criminal")
		if err != nil {
			log.Printf("Error creating concept %s: %v", conceptName, err)
			continue
		}
		conceptMap[strings.ToLower(conceptName)] = concept
	}
	log.Printf("Created %d criminal concepts", len(conceptMap))

	// Create relations
	log.Println("Creating legal relations...")
	relationMap := make(map[string]*graph.Relation)
	for relName, keywords := range legalRelations {
		relation, err := repo.UpsertRelation(ctx, relName, keywords, "legal")
		if err != nil {
			log.Printf("Error creating relation %s: %v", relName, err)
			continue
		}
		relationMap[relName] = relation
	}
	log.Printf("Created %d relations", len(relationMap))

	// Process each document
	for _, docIDStr := range strings.Split(docIDs, ",") {
		docIDStr = strings.TrimSpace(docIDStr)
		docID, err := uuid.Parse(docIDStr)
		if err != nil {
			log.Printf("Invalid document ID: %s", docIDStr)
			continue
		}

		log.Printf("Processing document: %s", docIDStr)
		processDocument(ctx, repo, docID, conceptMap, relationMap)
	}

	log.Println("Triple extraction completed!")
}

func processDocument(ctx context.Context, repo *graph.Repository, docID uuid.UUID, conceptMap map[string]*graph.Concept, relationMap map[string]*graph.Relation) {
	// Get all units for this document
	units, total, err := repo.GetUnitsByDocument(ctx, docID, 10000, 0)
	if err != nil {
		log.Printf("Error getting units: %v", err)
		return
	}

	log.Printf("Found %d units in document", total)

	triplesCreated := 0
	for _, unit := range units {
		if unit.Level != "article" && unit.Level != "clause" && unit.Level != "point" {
			continue
		}

		triples := extractTriplesFromText(unit.Text, conceptMap, relationMap)
		for _, triple := range triples {
			if triple.Subject == nil || triple.Relation == nil || triple.Object == nil {
				continue
			}

			// Create doc_ref from unit code
			docRef := ""
			if unit.Code != nil {
				docRef = *unit.Code
			}
			if docRef == "" {
				docRef = unit.ID.String()
			}

			tripleContext := triple.Context
			err := repo.InsertTriple(ctx, &graph.Triple{
				SubjectID:     triple.Subject.ID,
				RelationID:    triple.Relation.ID,
				ObjectID:      triple.Object.ID,
				UnitID:        unit.ID,
				DocRef:        docRef,
				Confidence:    triple.Confidence,
				TfIdf:         triple.TfIdf,
				IsBlacklisted: false,
				Context:       &tripleContext,
			})
			if err != nil {
				// Might be duplicate, ignore
				continue
			}
			triplesCreated++
		}
	}

	log.Printf("Created %d triples for document", triplesCreated)
}

type ExtractedTriple struct {
	Subject    *graph.Concept
	Relation   *graph.Relation
	Object     *graph.Concept
	Confidence float32
	TfIdf      float32
	Context    string
}

func extractTriplesFromText(text string, conceptMap map[string]*graph.Concept, relationMap map[string]*graph.Relation) []ExtractedTriple {
	var triples []ExtractedTriple
	textLower := strings.ToLower(text)

	// Find all concepts in text
	var foundConcepts []*graph.Concept
	for name, concept := range conceptMap {
		if strings.Contains(textLower, name) {
			foundConcepts = append(foundConcepts, concept)
		}
	}

	if len(foundConcepts) < 2 {
		return triples
	}

	// Find relations in text
	var foundRelations []*graph.Relation
	for relName, relation := range relationMap {
		keywords := legalRelations[relName]
		for _, kw := range keywords {
			if strings.Contains(textLower, kw) {
				foundRelations = append(foundRelations, relation)
				break
			}
		}
	}

	if len(foundRelations) == 0 {
		return triples
	}

	// Create triples from combinations
	// Use sentence-level context for better accuracy
	sentences := splitIntoSentences(text)

	for _, sentence := range sentences {
		sentLower := strings.ToLower(sentence)

		// Find concepts in this sentence
		var sentConcepts []*graph.Concept
		for name, concept := range conceptMap {
			if strings.Contains(sentLower, name) {
				sentConcepts = append(sentConcepts, concept)
			}
		}

		if len(sentConcepts) < 2 {
			continue
		}

		// Find relations in this sentence
		var sentRelations []*graph.Relation
		for relName, relation := range relationMap {
			keywords := legalRelations[relName]
			for _, kw := range keywords {
				if strings.Contains(sentLower, kw) {
					sentRelations = append(sentRelations, relation)
					break
				}
			}
		}

		if len(sentRelations) == 0 {
			continue
		}

		// Create triples within sentence
		for i := 0; i < len(sentConcepts); i++ {
			for j := 0; j < len(sentConcepts); j++ {
				if i == j {
					continue
				}
				for _, rel := range sentRelations {
					// Calculate confidence based on proximity
					confidence := float32(0.7)
					if len(sentConcepts) == 2 && len(sentRelations) == 1 {
						confidence = 0.9 // High confidence for simple sentences
					}

					triples = append(triples, ExtractedTriple{
						Subject:    sentConcepts[i],
						Relation:   rel,
						Object:     sentConcepts[j],
						Confidence: confidence,
						TfIdf:      calculateTfIdf(sentConcepts[i].Name, sentConcepts[j].Name, sentence),
						Context:    truncate(sentence, 500),
					})
				}
			}
		}
	}

	return triples
}

func splitIntoSentences(text string) []string {
	// Split by Vietnamese sentence terminators
	re := regexp.MustCompile(`[.;]\s+|\n+`)
	parts := re.Split(text, -1)

	var sentences []string
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if len(p) > 20 { // Skip very short fragments
			sentences = append(sentences, p)
		}
	}
	return sentences
}

func calculateTfIdf(subject, object, text string) float32 {
	textLower := strings.ToLower(text)
	subjectLower := strings.ToLower(subject)
	objectLower := strings.ToLower(object)

	// Simple TF calculation
	subjectCount := float32(strings.Count(textLower, subjectLower))
	objectCount := float32(strings.Count(textLower, objectLower))

	// Normalize by text length
	textLen := float32(len(text))
	if textLen == 0 {
		return 0
	}

	tf := (subjectCount + objectCount) / (textLen / 100)
	if tf > 1 {
		tf = 1
	}

	return tf
}

func truncate(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen] + "..."
}

// For debugging
func printTriples(triples []LegalTriple) {
	data, _ := json.MarshalIndent(triples, "", "  ")
	fmt.Println(string(data))
}
