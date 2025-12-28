import os
import pymysql

def check_mysql():
    conn = pymysql.connect(
        host="localhost",
        port=3307,
        user="root",
        password="123456789",
        database="law",
        cursorclass=pymysql.cursors.DictCursor
    )
    cursor = conn.cursor()
    
    # Check for specific ID 32766 (Luật biển Việt Nam)
    target_id = 32766
    cursor.execute("SELECT id FROM vbpl WHERE id = %s", (target_id,))
    row = cursor.fetchone()
    if row:
        print(f"Found document with ID {target_id}")
        # Fetch content to verify title inside content?
        cursor.execute("SELECT noidung FROM vbpl WHERE id = %s", (target_id,))
        content_row = cursor.fetchone()
        content = content_row['noidung']
        print(f"Content length: {len(content)}")
        print(f"Start of content: {content[:200]}")
    else:
        print(f"Document with ID {target_id} NOT FOUND in MySQL")

    conn.close()

if __name__ == "__main__":
    check_mysql()
