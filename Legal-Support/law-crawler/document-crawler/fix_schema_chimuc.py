from sqlalchemy import create_engine, text

# Tạo kết nối với cơ sở dữ liệu
engine = create_engine("mysql+pymysql://root:123456789@localhost:3307/law")

with engine.connect() as conn:
    try:
        print("Altering table vb_chimuc column noi_dung to LONGTEXT...")
        conn.execute(text("ALTER TABLE vb_chimuc MODIFY noi_dung LONGTEXT;"))
        print("Success.")
    except Exception as e:
        print(f"Error: {e}")
