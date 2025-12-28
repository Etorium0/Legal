import psycopg2
import os

db_url = "postgres://legaluser:legalpass@localhost:5433/legaldb"
conn = psycopg2.connect(db_url)
cur = conn.cursor()
# Check Relations
cur.execute("SELECT id, name FROM relations")
rows = cur.fetchall()
print(f"All Relations: {rows}")
conn.close()