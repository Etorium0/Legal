from sqlalchemy import create_engine, text

# Tạo kết nối với cơ sở dữ liệu
engine = create_engine("mysql+pymysql://root:123456789@localhost:3307/law")

with engine.connect() as conn:
    # Check if table exists
    # Alter table
    try:
        print("Altering table vbpl column noidung to LONGTEXT...")
        conn.execute(text("ALTER TABLE vbpl MODIFY noidung LONGTEXT;"))
        print("Success.")
    except Exception as e:
        print(f"Error: {e}")
