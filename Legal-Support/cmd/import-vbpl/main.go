package main

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"os"
	"regexp"
	"strconv"
	"strings"

	_ "github.com/go-sql-driver/mysql"

	"example.com/legallaw/internal/config"
	"example.com/legallaw/internal/db"
	"example.com/legallaw/internal/graph"
)

type VBPLDoc struct {
	ID      int64
	Content string
}

type VBPLUnit struct {
	ID      int64
	Parent  sql.NullInt64
	Content string
}

func main() {
	ctx := context.Background()
	cfg := config.Load()

	mysqlDSN := getenv("MYSQL_DSN", "root:123456789@tcp(localhost:3307)/law?parseTime=true&charset=utf8mb4")
	docType := getenv("VBPL_DOCUMENT_TYPE", "vbpl")
	titlePrefix := getenv("VBPL_TITLE_PREFIX", "VBPL")

	// Target Postgres
	pg, err := db.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("connect postgres: %v", err)
	}
	defer pg.Close()

	// Source MySQL
	mysqlDB, err := sql.Open("mysql", mysqlDSN)
	if err != nil {
		log.Fatalf("connect mysql: %v", err)
	}
	defer mysqlDB.Close()

	if err := mysqlDB.Ping(); err != nil {
		log.Fatalf("ping mysql: %v", err)
	}

	repo := graph.NewRepository(pg)
	var embedder graph.EmbeddingProvider
	if cfg.EmbeddingEnabled && cfg.EmbeddingAPIKey != "" {
		embedder = graph.NewOpenAIEmbeddingProvider(cfg.EmbeddingAPIKey, cfg.EmbeddingModel)
	}
	ingest := graph.NewIngestionService(repo, embedder, cfg.EmbeddingModel)

	docs, err := loadDocs(ctx, mysqlDB)
	if err != nil {
		log.Fatalf("load vbpl docs: %v", err)
	}

	log.Printf("Found %d VBPL documents", len(docs))
	imported := 0

	for _, doc := range docs {
		units, err := loadUnits(ctx, mysqlDB, doc.ID)
		if err != nil {
			log.Printf("skip vbpl %d: %v", doc.ID, err)
			continue
		}
		if len(units) == 0 {
			// Fallback: if no structured units, create a single unit from full text content
			if strings.TrimSpace(doc.Content) != "" {
				units = []VBPLUnit{
					{
						ID:      doc.ID,
						Parent:  sql.NullInt64{Valid: false},
						Content: doc.Content,
					},
				}
			} else {
				continue
			}
		}

		title := extractTitle(doc.Content)
		if title == "" {
			title = fmt.Sprintf("%s %d", titlePrefix, doc.ID)
		}

		extractedType := extractType(doc.Content)
		finalType := docType
		if extractedType != "" {
			finalType = extractedType
		}

		req := graph.IngestRequest{
			Document: graph.DocumentRequest{
				Title:     title,
				Type:      finalType,
				Number:    nil,
				Year:      nil,
				Authority: nil,
			},
			Units:          make([]graph.UnitRequest, 0, len(units)),
			AutoEmbed:      boolPtr(cfg.EmbeddingEnabled),
			EmbeddingModel: cfg.EmbeddingModel,
		}

		for idx, u := range units {
			code := strconv.FormatInt(u.ID, 10)
			var parentCode *string
			level := "chapter"
			if u.Parent.Valid {
				pc := strconv.FormatInt(u.Parent.Int64, 10)
				parentCode = &pc
				level = "article"
			}
			text := strings.TrimSpace(stripHTML(u.Content))
			if text == "" {
				text = "(empty)"
			}
			req.Units = append(req.Units, graph.UnitRequest{
				Level:      level,
				Code:       &code,
				Text:       text,
				ParentCode: parentCode,
				OrderIndex: idx,
			})
		}

		resp, err := ingest.IngestLegalContent(ctx, req)
		if err != nil {
			log.Printf("ingest vbpl %d failed: %v", doc.ID, err)
			continue
		}
		imported++
		log.Printf("Imported VBPL %d: units=%d embeddings=%d", doc.ID, resp.UnitsCreated, resp.EmbeddingsCreated)
	}

	log.Printf("Done. Imported %d VBPL documents", imported)
}

func loadDocs(ctx context.Context, mysql *sql.DB) ([]VBPLDoc, error) {
	rows, err := mysql.QueryContext(ctx, "SELECT id, noidung FROM vbpl")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []VBPLDoc
	for rows.Next() {
		var d VBPLDoc
		if err := rows.Scan(&d.ID, &d.Content); err != nil {
			return nil, err
		}
		items = append(items, d)
	}
	return items, rows.Err()
}

func loadUnits(ctx context.Context, mysql *sql.DB, docID int64) ([]VBPLUnit, error) {
	rows, err := mysql.QueryContext(ctx, "SELECT id, chi_muc_cha, noi_dung FROM vb_chimuc WHERE id_vb = ? ORDER BY id ASC", docID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []VBPLUnit
	for rows.Next() {
		var u VBPLUnit
		if err := rows.Scan(&u.ID, &u.Parent, &u.Content); err != nil {
			return nil, err
		}
		items = append(items, u)
	}
	return items, rows.Err()
}

var tagRe = regexp.MustCompile(`<[^>]+>`)

func stripHTML(s string) string {
	return tagRe.ReplaceAllString(s, " ")
}

func getenv(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

func boolPtr(v bool) *bool { return &v }

func extractTitle(content string) string {
	text := strings.TrimSpace(stripHTML(content))
	lines := strings.Split(text, "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line != "" {
			// Basic heuristic: A title is usually the first significant line.
			// VBPL docs often start with "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM" or similar standard headers.
			// We might want to skip standard headers.
			if strings.Contains(strings.ToUpper(line), "CỘNG HÒA") || strings.Contains(strings.ToUpper(line), "ĐỘC LẬP") {
				continue
			}
			// Limit length
			if len(line) > 300 {
				return line[:297] + "..."
			}
			return line
		}
	}
	return ""
}

func extractType(content string) string {
	text := strings.TrimSpace(stripHTML(content))
	textUpper := strings.ToUpper(text)

	// Check first 500 chars to avoid false positives later in text
	limit := 500
	if len(textUpper) < limit {
		limit = len(textUpper)
	}
	head := textUpper[:limit]

	if strings.Contains(head, "BỘ LUẬT") {
		return "Luật"
	}
	if strings.Contains(head, "LUẬT") {
		return "Luật"
	}
	if strings.Contains(head, "NGHỊ ĐỊNH") {
		return "Nghị định"
	}
	if strings.Contains(head, "THÔNG TƯ") {
		return "Thông tư"
	}
	if strings.Contains(head, "QUYẾT ĐỊNH") {
		return "Quyết định"
	}
	if strings.Contains(head, "CHỈ THỊ") {
		return "Chỉ thị"
	}
	if strings.Contains(head, "NGHỊ QUYẾT") {
		return "Nghị quyết"
	}
	return ""
}
