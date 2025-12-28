import pymysql

def check_pddieu():
    conn = pymysql.connect(
        host="localhost",
        port=3307,
        user="root",
        password="123456789",
        database="law",
        cursorclass=pymysql.cursors.DictCursor
    )
    cursor = conn.cursor()
    
    print("\nSearching for '%biển%' in vbqppl column:")
    cursor.execute("SELECT DISTINCT vbqppl FROM pddieu WHERE vbqppl LIKE '%biển%' LIMIT 20")
    rows = cursor.fetchall()
    print(f"Found {len(rows)} distinct titles:")
    for row in rows:
        print(f"Title: {row['vbqppl']}")

    conn.close()

if __name__ == "__main__":
    check_pddieu()
