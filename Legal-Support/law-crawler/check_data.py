import pandas as pd
from sqlalchemy import create_engine

engine = create_engine('mysql+pymysql://root:123456789@localhost:3307/law')
counts = pd.read_sql('SELECT COUNT(*) as total, SUM(CASE WHEN ten IS NOT NULL THEN 1 ELSE 0 END) as with_title FROM vbpl', con=engine)
print(f"Tong so ban ghi: {counts.iloc[0]['total']}")
print(f"Co title: {counts.iloc[0]['with_title']}")

# Show some titles
df = pd.read_sql('SELECT id, ten FROM vbpl WHERE ten IS NOT NULL ORDER BY id DESC LIMIT 10', con=engine)
for _, row in df.iterrows():
    print(f"\n{row['id']}: {row['ten'][:100]}...")
