package main

import (
	"context"
	"fmt"
	"os"

	"github.com/jackc/pgx/v5"
)

func main() {
	url := "postgres://legaluser:legalpass@127.0.0.1:5433/legaldb?sslmode=disable"
	conn, err := pgx.Connect(context.Background(), url)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Unable to connect to database: %v\n", err)
		os.Exit(1)
	}
	defer conn.Close(context.Background())

	rows, err := conn.Query(context.Background(), "SELECT title FROM documents WHERE title ILIKE '%giao th%ng%'")
	if err != nil {
		fmt.Fprintf(os.Stderr, "Query failed: %v\n", err)
		os.Exit(1)
	}
	defer rows.Close()

	fmt.Println("--- Suspicious Document Titles ---")
	for rows.Next() {
		var title string
		err := rows.Scan(&title)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Scan failed: %v\n", err)
			continue
		}
		fmt.Println(title)
		fmt.Printf("Bytes: %x\n", []byte(title))
	}
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
