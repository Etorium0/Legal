import psycopg2

DB_URL = "postgres://legaluser:legalpass@localhost:5433/legaldb?sslmode=disable"

sql_commands = [
    "CREATE INDEX IF NOT EXISTS idx_concepts_name_trgm ON concepts USING gin (name gin_trgm_ops);",
    "CREATE INDEX IF NOT EXISTS idx_concepts_name_lower_trgm ON concepts USING gin (LOWER(name) gin_trgm_ops);"
]

try:
    conn = psycopg2.connect(DB_URL)
    conn.autocommit = True
    cur = conn.cursor()
    
    for cmd in sql_commands:
        print(f"Executing: {cmd}")
        cur.execute(cmd)
        print("Done.")

    cur.close()
    conn.close()
except Exception as e:
    print(f"Error: {e}")
