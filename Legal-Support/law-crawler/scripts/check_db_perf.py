import psycopg2
import os

DB_URL = "postgres://legaluser:legalpass@localhost:5433/legaldb?sslmode=disable"

try:
    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()
    
    # Check extensions
    cur.execute("SELECT * FROM pg_extension WHERE extname = 'pg_trgm';")
    ext = cur.fetchone()
    print(f"pg_trgm installed: {ext is not None}")
    
    # Check concept count
    cur.execute("SELECT COUNT(*) FROM concepts;")
    count = cur.fetchone()[0]
    print(f"Concepts count: {count}")

    # Check triple count
    cur.execute("SELECT COUNT(*) FROM triples;")
    t_count = cur.fetchone()[0]
    print(f"Triples count: {t_count}")
    
    # Check indexes
    cur.execute("SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'concepts';")
    indexes = cur.fetchall()
    print("\nIndexes on concepts:")
    for idx in indexes:
        print(f"- {idx[0]}: {idx[1]}")

    cur.close()
    conn.close()
except Exception as e:
    print(f"Error: {e}")
