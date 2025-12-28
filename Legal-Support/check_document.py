import os
import psycopg2
from psycopg2.extras import DictCursor

DATABASE_URL = os.getenv("DATABASE_URL", "postgres://legaluser:legalpass@localhost:5433/legaldb")

def check_document():
    conn = psycopg2.connect(DATABASE_URL)
    with conn.cursor(cursor_factory=DictCursor) as cur:
        # Check for document
        cur.execute("SELECT id, title, number FROM documents WHERE title ILIKE '%Luật biển Việt Nam%'")
        docs = cur.fetchall()
        print(f"Found {len(docs)} documents:")
        for doc in docs:
            print(f"  - {doc['title']} ({doc['number']}) ID: {doc['id']}")
            
            # Check units for this doc
            cur.execute("SELECT id, text FROM units WHERE document_id = %s LIMIT 5", (doc['id'],))
            units = cur.fetchall()
            print(f"    Sample units:")
            for u in units:
                print(f"      [{u['id']}] {u['text'][:100]}...")
                
            # Check triples for this doc
            cur.execute("""
                SELECT t.id, s.name as subj, r.name as rel, o.name as obj 
                FROM triples t
                JOIN concepts s ON t.subject_id = s.id
                JOIN relations r ON t.relation_id = r.id
                JOIN concepts o ON t.object_id = o.id
                JOIN units u ON t.unit_id = u.id
                WHERE u.document_id = %s
            """, (doc['id'],))
            triples = cur.fetchall()
            print(f"    Found {len(triples)} triples:")
            for t in triples:
                print(f"      {t['subj']} --[{t['rel']}]--> {t['obj']}")

if __name__ == "__main__":
    check_document()
