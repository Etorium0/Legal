package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/joho/godotenv"

	"example.com/legallaw/internal/ai/embedding"
	"example.com/legallaw/internal/config"
	"example.com/legallaw/internal/db"
	"example.com/legallaw/internal/model"
	"example.com/legallaw/internal/repository"
)

func main() {
	_ = godotenv.Load()
	cfg := config.Load()

	ctx := context.Background()

	pool, err := db.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("db connect: %v", err)
	}
	defer pool.Close()

	repo := repository.NewRepository(pool)

	// Initialize embedding provider
	var embedder embedding.EmbeddingProvider
	if cfg.EmbeddingProvider == "gemini" {
		embedder = embedding.NewGeminiEmbeddingProvider(cfg.EmbeddingAPIKey, cfg.EmbeddingModel)
	} else {
		embedder = embedding.NewOpenAIEmbeddingProvider(cfg.EmbeddingAPIKey, cfg.EmbeddingModel)
	}

	if embedder == nil {
		log.Fatal("Embedding provider not configured. Set EMBEDDING_API_KEY and EMBEDDING_PROVIDER")
	}

	// Get batch size from env
	batchSize := 50
	if bs := os.Getenv("BATCH_SIZE"); bs != "" {
		if v, err := strconv.Atoi(bs); err == nil {
			batchSize = v
		}
	}

	// Get specific document IDs or process all
	docIDs := os.Getenv("DOCUMENT_IDS")

	var documents []uuid.UUID
	if docIDs != "" {
		for _, idStr := range strings.Split(docIDs, ",") {
			idStr = strings.TrimSpace(idStr)
			if id, err := uuid.Parse(idStr); err == nil {
				documents = append(documents, id)
			}
		}
	} else {
		// Get all documents
		docs, _, err := repo.SearchDocuments(ctx, "", model.DocumentFilter{}, 10000, 0)
		if err != nil {
			log.Fatalf("Error getting documents: %v", err)
		}
		for _, d := range docs {
			documents = append(documents, d.ID)
		}
	}

	log.Printf("Processing %d documents with batch size %d", len(documents), batchSize)
	log.Printf("Using embedding model: %s", cfg.EmbeddingModel)

	totalUnits := 0
	totalEmbeddings := 0
	startTime := time.Now()

	for docIdx, docID := range documents {
		log.Printf("[%d/%d] Processing document: %s", docIdx+1, len(documents), docID)

		// Get units for this document
		units, total, err := repo.GetUnitsByDocument(ctx, docID, 10000, 0)
		if err != nil {
			log.Printf("Error getting units for document %s: %v", docID, err)
			continue
		}

		log.Printf("  Found %d units", total)
		totalUnits += total

		// Process in batches
		for i := 0; i < len(units); i += batchSize {
			end := i + batchSize
			if end > len(units) {
				end = len(units)
			}

			batch := units[i:end]
			embeddings, err := processUnitBatch(ctx, embedder, repo, batch, cfg.EmbeddingModel)
			if err != nil {
				log.Printf("  Error processing batch %d-%d: %v", i, end, err)
				continue
			}

			totalEmbeddings += embeddings
			log.Printf("  Processed batch %d-%d: %d embeddings", i, end, embeddings)

			// Rate limiting - wait a bit between batches
			time.Sleep(500 * time.Millisecond)
		}
	}

	elapsed := time.Since(startTime)
	log.Printf("Completed! Total units: %d, Total embeddings: %d, Time: %v", totalUnits, totalEmbeddings, elapsed)
}

func processUnitBatch(ctx context.Context, embedder embedding.EmbeddingProvider, repo *repository.Repository, units []model.Unit, modelName string) (int, error) {
	var wg sync.WaitGroup
	var mu sync.Mutex
	embeddings := 0
	errors := 0

	// Process units concurrently but with limit
	semaphore := make(chan struct{}, 5) // Max 5 concurrent embeddings

	for _, unit := range units {
		wg.Add(1)
		go func(u model.Unit) {
			defer wg.Done()
			semaphore <- struct{}{}
			defer func() { <-semaphore }()

			// Skip very short texts
			text := strings.TrimSpace(u.Text)
			if len(text) < 50 {
				return
			}

			// Truncate very long texts
			if len(text) > 8000 {
				text = text[:8000]
			}

			// Generate embedding
			emb, err := embedder.Embed(ctx, text)
			if err != nil {
				mu.Lock()
				errors++
				mu.Unlock()
				log.Printf("    Error embedding unit %s: %v", u.ID, err)
				return
			}

			// Save to database
			if err := repo.UpsertUnitEmbedding(ctx, u.ID, emb, modelName); err != nil {
				mu.Lock()
				errors++
				mu.Unlock()
				log.Printf("    Error saving embedding for unit %s: %v", u.ID, err)
				return
			}

			mu.Lock()
			embeddings++
			mu.Unlock()
		}(unit)
	}

	wg.Wait()

	if errors > 0 {
		return embeddings, fmt.Errorf("%d errors occurred", errors)
	}

	return embeddings, nil
}
