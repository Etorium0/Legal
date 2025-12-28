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
        cursor.execute("SHOW CREATE TABLE pddieu;")
        result = cursor.fetchone()
        print(result['Create Table'])
finally:
    conn.close()
