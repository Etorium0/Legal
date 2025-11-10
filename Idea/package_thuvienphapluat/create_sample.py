import pandas as pd

# Đọc file Excel gốc
df = pd.read_excel('ket_qua_tim_kiem_tu_hinh.xlsx')

# Lấy 3 dòng đầu tiên để test
df_sample = df.head(3)

# Lưu ra file mới
df_sample.to_excel('test_sample_3dong.xlsx', index=False)
print(f"Đã tạo file test với {len(df_sample)} dòng")