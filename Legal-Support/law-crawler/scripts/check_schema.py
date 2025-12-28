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
        cursor.execute("DESCRIBE pddieu;")
        result = cursor.fetchall()
        for row in result:
            if row['Field'] == 'mapc':
                print(f"Column 'mapc' type: {row['Type']}")
                
        cursor.execute("DESCRIBE pdchuong;")
        result = cursor.fetchall()
        for row in result:
            if row['Field'] == 'mapc':
                print(f"Column 'pdchuong.mapc' type: {row['Type']}")
finally:
    conn.close()
