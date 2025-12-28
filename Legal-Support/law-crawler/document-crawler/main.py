import pandas as pd
from sqlalchemy import create_engine
import re
from bs4 import BeautifulSoup
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
import time
import urllib3
import random

# Suppress insecure request warnings
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Tạo kết nối với cơ sở dữ liệu
engine = create_engine("mysql+pymysql://root:123456789@localhost:3307/law")

# Create a session with retry logic
session = requests.Session()
retry = Retry(
    total=5,
    backoff_factor=2,
    status_forcelist=[429, 500, 502, 503, 504],
    allowed_methods=["HEAD", "GET", "OPTIONS"]
)
adapter = HTTPAdapter(max_retries=retry)
session.mount('http://', adapter)
session.mount('https://', adapter)
session.headers.update({
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
})

def get_existing_ids():
    try:
        existing = pd.read_sql('SELECT id FROM vbpl', con=engine)
        return set(existing['id'].astype(str).tolist())
    except:
        return set()

# Đọc dữ liệu từ cơ sở dữ liệu
print("Reading links from pddieu...")
try:
    df = pd.read_sql('SELECT vbqppl_link FROM pddieu GROUP BY vbqppl_link;', con=engine)
except Exception as e:
    print(f"Error reading pddieu: {e}")
    df = pd.DataFrame(columns=['vbqppl_link'])

def get_infor(url):
    if url is None:
        return None
    match = re.search(r'ItemID=(\d+).*#(.*)', url)
    if match:
        item_id = match.group(1)
        return item_id
    else:
        # Try another pattern if the first one fails, or just ignore
        return None

def save_data(list_id, list_noidung):
    if not list_id:
        return
    # Ghi dữ liệu vào cơ sở dữ liệu từ DataFrame
    df_to_write = pd.DataFrame({
        'id': list_id,
        'noidung': list_noidung
    })
    try:
        df_to_write.to_sql('vbpl', con=engine, if_exists='append', index=False)
        print(f"Saved {len(list_id)} records to database.")
    except Exception as e:
        print(f"Error saving to database: {e}")

print("Processing links...")
list_vb = [get_infor(df.iloc[i]['vbqppl_link']) for i in range(len(df))]

df_vb = pd.DataFrame(list_vb, columns=['id'])
# Add manual IDs for important missing laws (Traffic Laws, Law on Sea, etc.)
manual_ids_list = [
    '32766',  # Luật biển Việt Nam
    '12333',  # Luật Giao thông đường bộ 2008
    '170620', # Luật Trật tự, an toàn giao thông đường bộ 2024
    '172475'  # Luật Đường bộ 2024
]
manual_ids = pd.DataFrame([{'id': i} for i in manual_ids_list])
df_vb = pd.concat([df_vb, manual_ids], ignore_index=True)

# Loại bỏ các giá trị None
df_vb = df_vb.dropna()
# Loại bỏ các giá trị trùng nhau
df_vb = df_vb.drop_duplicates()

print(f"Total unique documents found: {len(df_vb)}")

# Filter out existing IDs
existing_ids = get_existing_ids()
print(f"Already have {len(existing_ids)} documents in DB.")

# For now, let's limit to top 100 NEW documents to verify pipeline
# Remove the limit later for full crawl
new_docs = df_vb[~df_vb['id'].isin(existing_ids)]
print(f"Documents to crawl: {len(new_docs)}")

if '32766' in new_docs['id'].values:
    print("ID 32766 (Luật biển Việt Nam) is in the queue.")
else:
    print("ID 32766 (Luật biển Việt Nam) is NOT in the queue (already exists or filtered).")

# Crawl all new documents
target_docs = new_docs


print(f"Crawling {len(target_docs)} documents...")

list_id = []
list_noidung = []

for i in range(len(target_docs)):
    id = target_docs.iloc[i]['id']
    print(f"{i+1}/{len(target_docs)} Crawling ID {id}...")
    
    url_content = f'https://vbpl.vn/TW/Pages/vbpq-toanvan.aspx?ItemID={id}'
    
    try:
        # Increase timeout and verify=False
        response = session.get(url_content, timeout=60, verify=False)
        
        if response.status_code == 200:
            soup = BeautifulSoup(response.content, 'html.parser')
            # Try to find content
            fulltext_divs = soup.find_all('div', class_='fulltext')
            if fulltext_divs:
                # Usually the second div inside fulltext contains the actual content
                # But sometimes structure varies. Let's try to be safer.
                content_div = fulltext_divs[0]
                # Try to get the ToanVan content specifically if possible
                toanvan = soup.find('div', id='toanvancontent')
                if toanvan:
                    noidung = str(toanvan)
                elif len(content_div.find_all('div')) > 1:
                     noidung = str(content_div.find_all('div')[1])
                else:
                    noidung = str(content_div)
                
                list_id.append(id)
                list_noidung.append(noidung)
                print("  -> Success")
            else:
                print("  -> 'fulltext' div not found")
        else:
            print(f"  -> HTTP {response.status_code}")
            if response.status_code == 503:
                 print("     Server overloaded. Pausing for 30s...")
                 time.sleep(30)
            
    except Exception as e:
        print(f"  -> Error: {e}")
        continue

    # Batch save every 10 docs
    if len(list_id) >= 10:
        save_data(list_id, list_noidung)
        list_id.clear()
        list_noidung.clear()
    
    # Be polite
    time.sleep(random.uniform(2, 5))

# Save remaining
save_data(list_id, list_noidung)
print("Done.")
