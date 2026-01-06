import pandas as pd
from sqlalchemy import create_engine, text
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

# Create vbpl table with proper schema if not exists
with engine.connect() as conn:
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS vbpl (
            id VARCHAR(50) PRIMARY KEY,
            ten VARCHAR(500),
            loai_vb VARCHAR(100),
            so_hieu VARCHAR(100),
            co_quan VARCHAR(255),
            ngay_ban_hanh DATE,
            ngay_hieu_luc DATE,
            tinh_trang VARCHAR(100),
            noidung LONGTEXT
        )
    """))
    conn.commit()
print("Table vbpl ready.")

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

def parse_date(date_str):
    """Parse Vietnamese date string to SQL date format"""
    if not date_str:
        return None
    try:
        # Format: dd/mm/yyyy
        parts = date_str.strip().split('/')
        if len(parts) == 3:
            return f"{parts[2]}-{parts[1]}-{parts[0]}"
    except:
        pass
    return None

def extract_metadata(soup, item_id):
    """Extract document metadata from the page"""
    metadata = {
        'id': item_id,
        'ten': None,
        'loai_vb': None,
        'so_hieu': None,
        'co_quan': None,
        'ngay_ban_hanh': None,
        'ngay_hieu_luc': None,
        'tinh_trang': None,
        'noidung': None
    }
    
    # Extract title from JavaScript variable "title1" - contains full document name
    # Format: var title1 = 'Nghị định 8017/VBHN-BTP Quy định chi tiết...';
    html_str = str(soup)
    title_match = re.search(r"var\s+title1\s*=\s*['\"]([^'\"]+)['\"]", html_str)
    if title_match:
        metadata['ten'] = title_match.group(1).strip()
    
    # Fallback 1: try urlFormComemntGui which also contains title
    if not metadata['ten']:
        url_match = re.search(r"Title1=([^\"&]+)", html_str)
        if url_match:
            from urllib.parse import unquote
            metadata['ten'] = unquote(url_match.group(1).strip())
    
    # Fallback 2: try breadcrumb
    if not metadata['ten']:
        box_tab = soup.find('div', class_='box-tab-vb')
        if box_tab:
            box_map = box_tab.find('div', class_='box-map')
            if box_map:
                items = box_map.find_all('li')
                if items:
                    last_item = items[-1]
                    a_tag = last_item.find('a')
                    if a_tag:
                        title = a_tag.get_text(strip=True)
                        if title and title not in ['CSDL quốc gia về VBPL', 'CSDL Trung ương', 'Văn bản pháp luật']:
                            metadata['ten'] = title
    
    # Extract properties from the properties table
    props_div = soup.find('div', class_='vbProperties') or soup.find('table', class_='vbProperties')
    if props_div:
        rows = props_div.find_all('tr')
        for row in rows:
            cells = row.find_all(['td', 'th'])
            if len(cells) >= 2:
                label = cells[0].get_text(strip=True).lower()
                value = cells[1].get_text(strip=True)
                
                if 'loại văn bản' in label or 'loại vb' in label:
                    metadata['loai_vb'] = value
                elif 'số hiệu' in label or 'số ký hiệu' in label:
                    metadata['so_hieu'] = value
                elif 'cơ quan ban hành' in label or 'nơi ban hành' in label:
                    metadata['co_quan'] = value
                elif 'ngày ban hành' in label:
                    metadata['ngay_ban_hanh'] = parse_date(value)
                elif 'ngày hiệu lực' in label or 'ngày có hiệu lực' in label:
                    metadata['ngay_hieu_luc'] = parse_date(value)
                elif 'tình trạng' in label or 'hiệu lực' in label:
                    metadata['tinh_trang'] = value
    
    # Alternative: look for specific spans/divs with class names
    if not metadata['loai_vb']:
        loai_elem = soup.find('span', class_='loaivb')
        if loai_elem:
            metadata['loai_vb'] = loai_elem.get_text(strip=True)
    
    if not metadata['so_hieu']:
        so_elem = soup.find('span', class_='sohieu')
        if so_elem:
            metadata['so_hieu'] = so_elem.get_text(strip=True)
    
    if not metadata['co_quan']:
        cq_elem = soup.find('span', class_='coquan')
        if cq_elem:
            metadata['co_quan'] = cq_elem.get_text(strip=True)
    
    # Extract content
    fulltext_divs = soup.find_all('div', class_='fulltext')
    if fulltext_divs:
        content_div = fulltext_divs[0]
        toanvan = soup.find('div', id='toanvancontent')
        if toanvan:
            metadata['noidung'] = str(toanvan)
        elif len(content_div.find_all('div')) > 1:
            metadata['noidung'] = str(content_div.find_all('div')[1])
        else:
            metadata['noidung'] = str(content_div)
    
    return metadata

def save_documents(documents):
    """Save list of document dicts to database"""
    if not documents:
        return
    
    df_to_write = pd.DataFrame(documents)
    try:
        # Use replace to handle duplicates
        for _, row in df_to_write.iterrows():
            with engine.connect() as conn:
                conn.execute(text("""
                    INSERT INTO vbpl (id, ten, loai_vb, so_hieu, co_quan, ngay_ban_hanh, ngay_hieu_luc, tinh_trang, noidung)
                    VALUES (:id, :ten, :loai_vb, :so_hieu, :co_quan, :ngay_ban_hanh, :ngay_hieu_luc, :tinh_trang, :noidung)
                    ON DUPLICATE KEY UPDATE 
                        ten = VALUES(ten),
                        loai_vb = VALUES(loai_vb),
                        so_hieu = VALUES(so_hieu),
                        co_quan = VALUES(co_quan),
                        ngay_ban_hanh = VALUES(ngay_ban_hanh),
                        ngay_hieu_luc = VALUES(ngay_hieu_luc),
                        tinh_trang = VALUES(tinh_trang),
                        noidung = VALUES(noidung)
                """), row.to_dict())
                conn.commit()
        print(f"Saved {len(documents)} records to database.")
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

# Crawl all new documents
new_docs = df_vb[~df_vb['id'].isin(existing_ids)]
print(f"Documents to crawl: {len(new_docs)}")

if '32766' in new_docs['id'].values:
    print("ID 32766 (Luật biển Việt Nam) is in the queue.")
else:
    print("ID 32766 (Luật biển Việt Nam) is NOT in the queue (already exists or filtered).")

target_docs = new_docs

print(f"Crawling {len(target_docs)} documents...")

documents_batch = []

for i in range(len(target_docs)):
    item_id = target_docs.iloc[i]['id']
    print(f"{i+1}/{len(target_docs)} Crawling ID {item_id}...")
    
    url_content = f'https://vbpl.vn/TW/Pages/vbpq-toanvan.aspx?ItemID={item_id}'
    
    try:
        response = session.get(url_content, timeout=60, verify=False)
        
        if response.status_code == 200:
            soup = BeautifulSoup(response.content, 'html.parser')
            metadata = extract_metadata(soup, item_id)
            
            if metadata['noidung']:
                documents_batch.append(metadata)
                print(f"  -> Success: {metadata['ten'] or 'No title'}")
            else:
                print("  -> Content not found")
        else:
            print(f"  -> HTTP {response.status_code}")
            if response.status_code == 503:
                print("     Server overloaded. Pausing for 30s...")
                time.sleep(30)
            
    except Exception as e:
        print(f"  -> Error: {e}")
        continue

    # Batch save every 10 docs
    if len(documents_batch) >= 10:
        save_documents(documents_batch)
        documents_batch.clear()
    
    # Be polite
    time.sleep(random.uniform(2, 5))

# Save remaining
save_documents(documents_batch)
print("Done.")
