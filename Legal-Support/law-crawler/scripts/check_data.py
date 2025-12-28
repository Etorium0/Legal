import pymysql

conn = pymysql.connect(
    host="localhost",
    port=3307,
    user="root",
    password="123456789",
    database="law",
    cursorclass=pymysql.cursors.DictCursor
)

try:
    with conn.cursor() as cursor:
        cursor.execute("SELECT COUNT(*) as count FROM pddieu;")
        print(f"Total Dieu: {cursor.fetchone()['count']}")
        
        cursor.execute("SELECT COUNT(*) as count FROM pdmuclienquan;")
        print(f"Total Related Items: {cursor.fetchone()['count']}")
finally:
    conn.close()
