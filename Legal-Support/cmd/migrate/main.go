package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"sort"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"

	"example.com/legallaw/internal/config"
)

func main() {
	_ = godotenv.Load()
	cfg := config.Load()

	pool, err := pgxpool.New(context.Background(), cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer pool.Close()

	// Get all migration files
	migrationsDir := "migrations"
	files, err := filepath.Glob(filepath.Join(migrationsDir, "*.sql"))
	if err != nil {
		log.Fatalf("Failed to read migrations directory: %v", err)
	}

	sort.Strings(files)

	// Create migrations table if not exists
	_, err = pool.Exec(context.Background(), `
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version VARCHAR(255) PRIMARY KEY,
			applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)
	`)
	if err != nil {
		log.Fatalf("Failed to create schema_migrations table: %v", err)
	}

	// Run migrations
	for _, file := range files {
		filename := filepath.Base(file)

		// Check if already applied
		var exists bool
		err = pool.QueryRow(context.Background(),
			"SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE version = $1)",
			filename).Scan(&exists)
		if err != nil {
			log.Fatalf("Failed to check migration status: %v", err)
		}

		if exists {
			log.Printf("✓ %s (already applied)", filename)
			continue
		}

		// Read and execute migration
		content, err := os.ReadFile(file)
		if err != nil {
			log.Fatalf("Failed to read migration file %s: %v", filename, err)
		}

		log.Printf("Running migration: %s", filename)
		_, err = pool.Exec(context.Background(), string(content))
		if err != nil {
			log.Fatalf("Failed to execute migration %s: %v", filename, err)
		}

		// Mark as applied
		_, err = pool.Exec(context.Background(),
			"INSERT INTO schema_migrations (version) VALUES ($1)",
			filename)
		if err != nil {
			log.Fatalf("Failed to mark migration as applied: %v", err)
		}

		log.Printf("✓ %s (applied)", filename)
	}

	fmt.Println("\n✅ All migrations completed successfully!")
}
