from bs4 import BeautifulSoup
import pandas as pd
from sqlalchemy import create_engine, text
import math

# Tạo kết nối với cơ sở dữ liệu
engine = create_engine("mysql+pymysql://root:123456789@localhost:3307/law")

# Get max ID from vb_chimuc
processed_ids = set()
try:
    with engine.connect() as conn:
        result = conn.execute(text("SELECT MAX(id) FROM vb_chimuc"))
        max_id = result.scalar()
        if max_id is None:
            max_id = 0
            
        # Get processed IDs
        try:
            ids_res = conn.execute(text("SELECT DISTINCT id_vb FROM vb_chimuc"))
            for row in ids_res:
                processed_ids.add(row[0])
        except:
            pass
except:
    max_id = 0

print(f"Starting ID from {max_id}")
print(f"Found {len(processed_ids)} processed documents.")
current_id = max_id

# Get total count
try:
    total_docs = pd.read_sql("SELECT count(*) as count FROM vbpl", con=engine).iloc[0]['count']
except:
    total_docs = 0
    print("Could not count documents, assuming 0 or error.")

print(f"Total documents: {total_docs}")

batch_size = 100
num_batches = math.ceil(total_docs / batch_size) if total_docs > 0 else 1

for batch_idx in range(num_batches):
    offset = batch_idx * batch_size
    print(f"Processing batch {batch_idx + 1}/{num_batches} (Offset: {offset})...")
    
    query = f"SELECT id, noidung FROM vbpl LIMIT {batch_size} OFFSET {offset}"
    df = pd.read_sql(query, con=engine)
    
    if df.empty:
        break

    chi_muc = []
    
    for j in range(len(df)):
        id_vb = df.iloc[j]['id']
        if id_vb in processed_ids:
            continue
            
        contents = df.iloc[j]['noidung']
        if not contents:
            continue
            
        try:
            soup = BeautifulSoup(contents, 'html.parser')
            div = soup.find('div', id='toanvancontent')
            if div:
                texts = [p.get_text().replace('\n', ' ').strip() for p in div.find_all('p')]
            else:
                texts = [p.get_text().replace('\n', ' ').strip() for p in soup.find_all('p')]
            # Filter empty
            texts = [t for t in texts if t]
        except Exception as e:
            print(f"Error parsing doc {id_vb}: {e}")
            continue

        i = 0
        text_acc = ''
        control = 0
        id_chuong = None
        
        # We need to track the ID of the current segment being built
        # But the original logic incremented ID when STARTING a segment.
        # So we need to store that ID.
        # Since 'current_id' changes, we rely on the fact that we process linearly.
        
        # Let's track the ID of the segment we are accumulating
        segment_id = 0 
        
        def save_segment(txt, old_ctrl, seg_id):
            if not txt.strip(): return
            
            # Logic from original:
            # if old == 1 (Chapter) -> save as root
            # if old == 2 (Article) -> save as child of id_chuong
            
            # Enhanced logic:
            if old_ctrl == 1:
                 chi_muc.append({
                    'id_vb': id_vb,
                    'id': seg_id,
                    'noi_dung': txt,
                    'chi_muc_cha': None,
                })
            elif old_ctrl == 2:
                 chi_muc.append({
                    'id_vb': id_vb,
                    'id': seg_id,
                    'noi_dung': txt,
                    'chi_muc_cha': id_chuong,
                })

        while i < len(texts):
            line = texts[i]
            line_upper = line.upper()
            
            if line_upper.startswith('CHƯƠNG') or line_upper.startswith('PHẦN'):
                if text_acc != '':
                    save_segment(text_acc, control, segment_id)
                    text_acc = ''
                
                current_id += 1
                segment_id = current_id
                id_chuong = current_id
                control = 1
                
            elif line_upper.startswith('ĐIỀU') or line_upper.startswith('KHOẢN'): # Basic heuristic
                if text_acc != '':
                    save_segment(text_acc, control, segment_id)
                    text_acc = ''
                
                current_id += 1
                segment_id = current_id
                control = 2
                
            if control > 0:
                text_acc += line + '\n'
            
            i += 1
            
        # Save last segment
        save_segment(text_acc, control, segment_id)

    if chi_muc:
        df_to_write = pd.DataFrame(chi_muc)
        try:
            df_to_write.to_sql('vb_chimuc', con=engine, if_exists='append', index=False)
            print(f"Saved {len(chi_muc)} items from batch {batch_idx + 1}")
        except Exception as e:
            print(f"Error saving batch: {e}")
