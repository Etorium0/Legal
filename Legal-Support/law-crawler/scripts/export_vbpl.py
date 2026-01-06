"""
Export VBPL (Văn bản pháp luật) data to Legal-Support backend.

Usage:
    cd law-crawler
    python scripts/export_vbpl.py

Environment variables:
    LEGAL_SUPPORTER_URL - Backend URL (default: http://localhost:8080)
    LIMIT - Max documents to export (optional)
"""

import os
import sys
import requests
import re
from bs4 import BeautifulSoup
from sqlalchemy import create_engine, text

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

BACKEND_URL = os.getenv("LEGAL_SUPPORTER_URL", "http://localhost:8080").rstrip("/")
AUTO_EMBED = os.getenv("LEGAL_SUPPORTER_AUTO_EMBED", "false").lower() == "true"
LIMIT = os.getenv("LIMIT")

# MySQL connection
engine = create_engine("mysql+pymysql://root:123456789@localhost:3307/law")


def clean_html(html_content):
    """Convert HTML to clean text"""
    if not html_content:
        return ""
    soup = BeautifulSoup(html_content, 'html.parser')
    # Remove script and style tags
    for tag in soup(['script', 'style']):
        tag.decompose()
    return soup.get_text(separator='\n', strip=True)


def extract_articles_from_content(html_content, doc_id):
    """Extract individual articles (Điều) from document content"""
    if not html_content:
        return []
    
    soup = BeautifulSoup(html_content, 'html.parser')
    text = soup.get_text(separator='\n')
    
    units = []
    
    # Pattern to match "Điều X." or "Điều X:" followed by title
    pattern = r'(Điều\s+\d+[a-z]?\.?\s*[:\.]?\s*)([^\n]+)'
    
    # Find all article starts
    matches = list(re.finditer(pattern, text, re.IGNORECASE))
    
    if not matches:
        # No articles found, create single unit with full content
        clean_text = clean_html(html_content)
        if clean_text:
            units.append({
                "level": "article",
                "code": f"vbpl-{doc_id}-content",
                "text": clean_text[:50000],  # Limit size
                "order_index": 0,
            })
        return units
    
    # Create a root chapter
    units.append({
        "level": "chapter",
        "code": f"vbpl-{doc_id}-root",
        "text": "Nội dung văn bản",
        "order_index": 0,
    })
    
    # Extract each article
    for idx, match in enumerate(matches):
        start_pos = match.start()
        # End position is start of next match, or end of text
        end_pos = matches[idx + 1].start() if idx + 1 < len(matches) else len(text)
        
        article_text = text[start_pos:end_pos].strip()
        article_code = match.group(1).strip().replace(' ', '_').replace('.', '').replace(':', '')
        
        units.append({
            "level": "article",
            "code": f"vbpl-{doc_id}-{article_code}",
            "parent_code": f"vbpl-{doc_id}-root",
            "text": article_text[:30000],  # Limit size
            "order_index": idx + 1,
        })
    
    return units


def get_doc_type(loai_vb):
    """Map Vietnamese document type to standard type"""
    if not loai_vb:
        return "vbpl"
    
    loai_lower = loai_vb.lower()
    if 'luật' in loai_lower:
        return "law"
    elif 'nghị định' in loai_lower:
        return "decree"
    elif 'thông tư' in loai_lower:
        return "circular"
    elif 'quyết định' in loai_lower:
        return "decision"
    elif 'nghị quyết' in loai_lower:
        return "resolution"
    elif 'chỉ thị' in loai_lower:
        return "directive"
    elif 'công văn' in loai_lower:
        return "official_letter"
    else:
        return "vbpl"


def export_document(doc):
    """Export a single document to Legal-Support"""
    doc_id = doc['id']
    
    # Build document title
    title = doc['ten']
    if not title:
        # Construct title from so_hieu and loai_vb
        parts = []
        if doc['loai_vb']:
            parts.append(doc['loai_vb'])
        if doc['so_hieu']:
            parts.append(f"số {doc['so_hieu']}")
        title = ' '.join(parts) if parts else f"VBPL {doc_id}"
    
    # Extract units from content
    units = extract_articles_from_content(doc['noidung'], doc_id)
    
    if not units:
        print(f"[skip] VBPL {doc_id}: no units extracted")
        return False
    
    # Build payload
    payload = {
        "document": {
            "title": title,
            "type": get_doc_type(doc['loai_vb']),
            "number": doc['so_hieu'],
            "authority": doc['co_quan'],
            "issued_date": str(doc['ngay_ban_hanh']) if doc['ngay_ban_hanh'] else None,
            "effective_date": str(doc['ngay_hieu_luc']) if doc['ngay_hieu_luc'] else None,
        },
        "units": units,
        "auto_embed": AUTO_EMBED,
    }
    
    url = f"{BACKEND_URL}/api/v1/query/ingest"
    try:
        resp = requests.post(url, json=payload, timeout=120)
        resp.raise_for_status()
        result = resp.json()
        print(f"[ok] VBPL {doc_id}: {title[:50]}... -> {result.get('document_id')}")
        return True
    except Exception as exc:
        print(f"[fail] VBPL {doc_id}: {exc}")
        return False


def main():
    print(f"Target backend: {BACKEND_URL}")
    print(f"Auto-embed: {AUTO_EMBED}")
    
    # Query VBPL documents
    query = "SELECT id, ten, loai_vb, so_hieu, co_quan, ngay_ban_hanh, ngay_hieu_luc, tinh_trang, noidung FROM vbpl"
    if LIMIT:
        query += f" LIMIT {LIMIT}"
    
    with engine.connect() as conn:
        result = conn.execute(text(query))
        rows = result.fetchall()
        columns = result.keys()
    
    docs = [dict(zip(columns, row)) for row in rows]
    print(f"Found {len(docs)} VBPL documents")
    
    success = 0
    fail = 0
    
    for doc in docs:
        if export_document(doc):
            success += 1
        else:
            fail += 1
    
    print(f"\nDone. Success: {success}, Failed: {fail}")


if __name__ == "__main__":
    main()
