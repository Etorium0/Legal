import psycopg2

try:
    conn = psycopg2.connect(
        host="localhost",
        port=5433,
        user="legaluser",
        password="legalpass",
        dbname="legaldb"
    )
    cur = conn.cursor()
    
    # Order matters due to foreign keys
    tables = ["triples", "units", "documents", "concepts", "relations"]
    
    for table in tables:
        cur.execute(f"TRUNCATE TABLE {table} CASCADE;")
        print(f"Truncated {table}")
    
    conn.commit()
    print("All tables truncated successfully.")
        
except Exception as e:
    print(f"Error: {e}")
    conn.rollback()
finally:
    if 'conn' in locals() and conn:
        conn.close()
