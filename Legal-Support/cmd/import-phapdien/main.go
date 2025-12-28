package main

import (
	"context"
	"database/sql"
	"log"
	"os"

	_ "github.com/go-sql-driver/mysql"

	"example.com/legallaw/internal/config"
	"example.com/legallaw/internal/db"
	"example.com/legallaw/internal/graph"
)

// PDDeMuc represents a topic in Pháp Điển
type PDDeMuc struct {
	ID        string
	Name      string
	ChuDeName string
}

// PDDieu represents an article in Pháp Điển
type PDDieu struct {
	ID      string
	Title   string
	Content string
	Order   int
}

func main() {
	ctx := context.Background()
	cfg := config.Load()

	mysqlDSN := getenv("MYSQL_DSN", "root:123456789@tcp(localhost:3307)/law?parseTime=true&charset=utf8mb4")
	docType := getenv("PD_DOCUMENT_TYPE", "phapdien")

	// Connect Postgres (target)
	pg, err := db.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("connect postgres: %v", err)
	}
	defer pg.Close()

	// Connect MySQL (source)
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

	demucs, err := loadDeMuc(ctx, mysqlDB)
	if err != nil {
		log.Fatalf("load demuc: %v", err)
	}

	log.Printf("Found %d đề mục to import", len(demucs))
	imported := 0
	for _, d := range demucs {
		dieus, err := loadDieu(ctx, mysqlDB, d.ID)
		if err != nil {
			log.Printf("skip demuc %s: %v", d.ID, err)
			continue
		}
		if len(dieus) == 0 {
			continue
		}

		req := graph.IngestRequest{
			Document: graph.DocumentRequest{
				Title:     d.Name,
				Type:      docType,
				Authority: &d.ChuDeName,
			},
			Units:          make([]graph.UnitRequest, 0, len(dieus)),
			AutoEmbed:      boolPtr(cfg.EmbeddingEnabled),
			EmbeddingModel: cfg.EmbeddingModel,
		}

		for _, dieu := range dieus {
			code := dieu.ID
			text := dieu.Title + "\n" + dieu.Content
			req.Units = append(req.Units, graph.UnitRequest{
				Level:      "article",
				Code:       &code,
				Text:       text,
				OrderIndex: dieu.Order,
			})
		}

		resp, err := ingest.IngestLegalContent(ctx, req)
		if err != nil {
			log.Printf("ingest demuc %s failed: %v", d.ID, err)
			continue
		}
		imported++
		log.Printf("Imported demuc %s (%s): units=%d embeddings=%d", d.ID, d.Name, resp.UnitsCreated, resp.EmbeddingsCreated)
	}

	log.Printf("Done. Imported %d đề mục", imported)
}

func loadDeMuc(ctx context.Context, mysql *sql.DB) ([]PDDeMuc, error) {
	// Join with PDChuDe to get the theme name
	query := `
		SELECT d.id, d.ten, c.ten 
		FROM pddemuc d 
		LEFT JOIN pdchude c ON d.chude_id = c.id
	`
	rows, err := mysql.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []PDDeMuc
	for rows.Next() {
		var d PDDeMuc
		var chude sql.NullString // Handle potential NULLs if left join fails
		if err := rows.Scan(&d.ID, &d.Name, &chude); err != nil {
			return nil, err
		}
		if chude.Valid {
			d.ChuDeName = chude.String
		} else {
			d.ChuDeName = "Khác"
		}
		items = append(items, d)
	}
	return items, rows.Err()
}

func loadDieu(ctx context.Context, mysql *sql.DB, demucID string) ([]PDDieu, error) {
	rows, err := mysql.QueryContext(ctx, "SELECT mapc, ten, noidung, stt FROM pddieu WHERE demuc_id = ? ORDER BY stt ASC", demucID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []PDDieu
	for rows.Next() {
		var d PDDieu
		if err := rows.Scan(&d.ID, &d.Title, &d.Content, &d.Order); err != nil {
			return nil, err
		}
		items = append(items, d)
	}
	return items, rows.Err()
}

func getenv(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

func boolPtr(v bool) *bool { return &v }
