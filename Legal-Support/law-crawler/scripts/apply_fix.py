import psycopg2

DB_URL = "postgres://legaluser:legalpass@localhost:5433/legaldb?sslmode=disable"

commands = [
    "CREATE INDEX IF NOT EXISTS idx_concepts_name_trgm ON concepts USING gin (LOWER(name) gin_trgm_ops);",
    "CREATE INDEX IF NOT EXISTS idx_relations_name_trgm ON relations USING gin (LOWER(name) gin_trgm_ops);"
]

try:
    conn = psycopg2.connect(DB_URL)
    conn.autocommit = True
    cur = conn.cursor()
    
    for cmd in commands:
        print(f"Executing: {cmd}")
        cur.execute(cmd)
        print("Done.")

    cur.close()
    conn.close()
    print("Indexes created successfully.")
except Exception as e:
    print(f"Error: {e}")
