package main

import (
	"database/sql"
	"fmt"
	"log"

	_ "github.com/go-sql-driver/mysql"
)

func main() {
	// DSN from import-vbpl/main.go
	dsn := "root:123456789@tcp(localhost:3307)/law?parseTime=true&charset=utf8mb4"
	db, err := sql.Open("mysql", dsn)
	if err != nil {
		log.Fatalf("open: %v", err)
	}
	defer db.Close()

	if err = db.Ping(); err != nil {
		log.Fatalf("ping: %v", err)
	}

	// Try to find the problematic document
	// "Ngh? d?nh 100/2019/ND-CP v? x? ph?t vi ph?m hnh chnh trong linh v?c giao thng du?ng b?"
	// The original title should be "Nghị định 100/2019/NĐ-CP..."
	// We'll search for '100/2019/ND-CP' which should be safe ASCII

	rows, err := db.Query("DESCRIBE vbpl")
	if err != nil {
		log.Fatalf("query: %v", err)
	}
	defer rows.Close()

	fmt.Println("--- VBPL Columns ---")
	for rows.Next() {
		var field, typ, null, key, def, extra sql.NullString
		if err := rows.Scan(&field, &typ, &null, &key, &def, &extra); err != nil {
			log.Fatalf("scan: %v", err)
		}
		fmt.Printf("%s (%s)\n", field.String, typ.String)
	}
}
