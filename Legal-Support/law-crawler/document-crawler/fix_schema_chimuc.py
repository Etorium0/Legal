from sqlalchemy import create_engine, text

# Tạo kết nối với cơ sở dữ liệu
engine = create_engine("mysql+pymysql://root:123456789@localhost:3307/law")

with engine.connect() as conn:
    try:
        print("Creating table vb_chimuc if not exists...")
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS vb_chimuc (
                id_vb VARCHAR(255),
                id BIGINT,
                noi_dung LONGTEXT,
                chi_muc_cha BIGINT
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """))
        print("Altering table vb_chimuc column noi_dung to LONGTEXT (just in case)...")
        conn.execute(text("ALTER TABLE vb_chimuc MODIFY noi_dung LONGTEXT;"))
        print("Success.")
    except Exception as e:
        print(f"Error: {e}")
