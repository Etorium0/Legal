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
    
    cur.execute("SELECT COUNT(*) FROM documents;")
    doc_count = cur.fetchone()[0]
    print(f"Total Documents: {doc_count}")
    
    cur.execute("SELECT COUNT(*) FROM units;")
    unit_count = cur.fetchone()[0]
    print(f"Total Units: {unit_count}")

    cur.execute("SELECT COUNT(*) FROM triples;")
    triple_count = cur.fetchone()[0]
    print(f"Total Triples: {triple_count}")
    
    cur.execute("SELECT type, COUNT(*) FROM documents GROUP BY type;")
    rows = cur.fetchall()
    print("Documents by Type:")
    for row in rows:
        print(f"  {row[0]}: {row[1]}")
        
except Exception as e:
    print(f"Error: {e}")
finally:
    if 'conn' in locals() and conn:
        conn.close()
