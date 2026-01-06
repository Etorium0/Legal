"""
Vietnamese NLP Service for Legal-Support
Provides tokenization, entity extraction, and query classification
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import uvicorn
import re
from pyvi import ViTokenizer
import json

app = FastAPI(title="Vietnamese NLP Service", version="1.0.0")


# ===================== MODELS =====================

class TokenizeRequest(BaseModel):
    text: str


class TokenizeResponse(BaseModel):
    original: str
    tokenized: str
    tokens: List[str]


class ClassifyRequest(BaseModel):
    query: str


class ClassifyResponse(BaseModel):
    category: int  # 0: system/greeting, 1: legal question, 2: invalid
    confidence: float
    reason: str


class ExtractEntitiesRequest(BaseModel):
    query: str


class ExtractEntitiesResponse(BaseModel):
    year: Optional[int] = None
    document_number: Optional[str] = None
    document_type: Optional[str] = None
    article: Optional[str] = None
    clause: Optional[str] = None
    authority: Optional[str] = None
    keywords: List[str] = []


class RewriteQueryRequest(BaseModel):
    query: str
    num_variations: int = 3


class RewriteQueryResponse(BaseModel):
    original: str
    variations: List[str]


# ===================== TOKENIZATION =====================

@app.post("/tokenize", response_model=TokenizeResponse)
async def tokenize(request: TokenizeRequest):
    """Tokenize Vietnamese text using pyvi"""
    try:
        text = request.text.strip()
        if not text:
            raise HTTPException(status_code=400, detail="Text cannot be empty")
        
        tokenized = ViTokenizer.tokenize(text)
        tokens = tokenized.split()
        
        return TokenizeResponse(
            original=text,
            tokenized=tokenized,
            tokens=tokens
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ===================== QUERY CLASSIFICATION =====================

# Keywords for classification
GREETING_KEYWORDS = [
    "xin chào", "chào bạn", "chào", "hello", "hi", "hey",
    "bạn là ai", "bạn là gì", "bạn có thể làm gì", "bạn giúp gì",
    "bạn hoạt động", "chức năng", "tính năng", "hướng dẫn",
    "buổi sáng", "buổi tối", "buổi chiều", "chào buổi",
    "bạn khỏe", "tên bạn", "ai tạo ra bạn", "bạn được tạo"
]

LEGAL_KEYWORDS = [
    # Document types
    "luật", "nghị định", "thông tư", "quyết định", "nghị quyết",
    "bộ luật", "pháp lệnh", "hiến pháp", "quy định", "điều lệ",
    "văn bản pháp luật", "quy phạm pháp luật",
    # Legal terms
    "điều", "khoản", "điểm", "mục", "chương",
    "quyền", "nghĩa vụ", "trách nhiệm", "xử phạt", "hình phạt",
    "hợp đồng", "tranh chấp", "khiếu nại", "tố cáo", "khởi kiện",
    "tội phạm", "vi phạm", "bồi thường", "thừa kế", "ly hôn",
    "kết hôn", "hộ khẩu", "căn cước", "giấy phép", "đăng ký",
    "doanh nghiệp", "công ty", "lao động", "bảo hiểm", "thuế",
    "đất đai", "nhà ở", "xây dựng", "môi trường", "giao thông",
    "hành chính", "dân sự", "hình sự", "kinh tế", "thương mại",
    # Question patterns
    "theo quy định", "pháp luật quy định", "được phép", "có quyền",
    "bị cấm", "không được", "phải làm", "cần làm", "thủ tục",
    "điều kiện", "hồ sơ", "giấy tờ", "cơ quan nào", "ở đâu"
]

INVALID_PATTERNS = [
    r"^[0-9\s\W]+$",  # Only numbers and special chars
    r"(đụ|địt|đéo|mẹ mày|con mẹ|vãi|shit|fuck|damn)",  # Profanity
    r"^.{1,5}$",  # Too short (less than 5 chars)
]


@app.post("/classify", response_model=ClassifyResponse)
async def classify_query(request: ClassifyRequest):
    """Classify query into categories: 0=system/greeting, 1=legal, 2=invalid"""
    try:
        query = request.query.strip().lower()
        
        if not query:
            return ClassifyResponse(
                category=2,
                confidence=1.0,
                reason="Empty query"
            )
        
        # Check for invalid patterns
        for pattern in INVALID_PATTERNS:
            if re.search(pattern, query, re.IGNORECASE):
                return ClassifyResponse(
                    category=2,
                    confidence=0.9,
                    reason="Query matches invalid pattern"
                )
        
        # Count keyword matches
        greeting_score = sum(1 for kw in GREETING_KEYWORDS if kw in query)
        legal_score = sum(1 for kw in LEGAL_KEYWORDS if kw in query)
        
        # Normalize scores
        total_words = len(query.split())
        greeting_normalized = greeting_score / max(total_words, 1)
        legal_normalized = legal_score / max(total_words, 1)
        
        # Decision logic
        if greeting_score >= 2 or (greeting_score >= 1 and legal_score == 0 and len(query) < 50):
            return ClassifyResponse(
                category=0,
                confidence=min(0.5 + greeting_normalized, 0.95),
                reason=f"Detected {greeting_score} greeting keywords"
            )
        
        if legal_score >= 1:
            return ClassifyResponse(
                category=1,
                confidence=min(0.5 + legal_normalized * 2, 0.95),
                reason=f"Detected {legal_score} legal keywords"
            )
        
        # Default: assume legal question if long enough
        if len(query) > 20:
            return ClassifyResponse(
                category=1,
                confidence=0.6,
                reason="Query is long enough, assuming legal question"
            )
        
        return ClassifyResponse(
            category=2,
            confidence=0.5,
            reason="Could not determine query category"
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ===================== ENTITY EXTRACTION =====================

# Patterns for entity extraction
YEAR_PATTERN = r"(\d{4})"
DOCUMENT_NUMBER_PATTERN = r"(\d+/\d{4}/[A-Z\-]+|\d+/[A-Z\-]+)"
ARTICLE_PATTERN = r"[Đđ]iều\s+(\d+)"
CLAUSE_PATTERN = r"[Kk]hoản\s+(\d+)"
POINT_PATTERN = r"[Đđ]iểm\s+([a-zđ]|\d+)"

DOCUMENT_TYPE_KEYWORDS = {
    "luật": "luat",
    "bộ luật": "bo_luat",
    "nghị định": "nghi_dinh",
    "thông tư": "thong_tu",
    "quyết định": "quyet_dinh",
    "nghị quyết": "nghi_quyet",
    "pháp lệnh": "phap_lenh",
    "hiến pháp": "hien_phap",
    "công văn": "cong_van",
    "chỉ thị": "chi_thi"
}

AUTHORITY_KEYWORDS = {
    "quốc hội": "quoc_hoi",
    "chính phủ": "chinh_phu",
    "thủ tướng": "thu_tuong",
    "bộ": "bo",
    "ủy ban nhân dân": "ubnd",
    "tòa án": "toa_an",
    "viện kiểm sát": "vien_kiem_sat"
}


@app.post("/extract-entities", response_model=ExtractEntitiesResponse)
async def extract_entities(request: ExtractEntitiesRequest):
    """Extract legal entities from query"""
    try:
        query = request.query.strip()
        query_lower = query.lower()
        
        result = ExtractEntitiesResponse()
        
        # Extract year
        years = re.findall(YEAR_PATTERN, query)
        valid_years = [int(y) for y in years if 1945 <= int(y) <= 2030]
        if valid_years:
            result.year = max(valid_years)  # Take the most recent year
        
        # Extract document number
        doc_numbers = re.findall(DOCUMENT_NUMBER_PATTERN, query)
        if doc_numbers:
            result.document_number = doc_numbers[0]
        
        # Extract article
        articles = re.findall(ARTICLE_PATTERN, query)
        if articles:
            result.article = articles[0]
        
        # Extract clause
        clauses = re.findall(CLAUSE_PATTERN, query)
        if clauses:
            result.clause = clauses[0]
        
        # Extract document type
        for vn_name, code in DOCUMENT_TYPE_KEYWORDS.items():
            if vn_name in query_lower:
                result.document_type = code
                break
        
        # Extract authority
        for vn_name, code in AUTHORITY_KEYWORDS.items():
            if vn_name in query_lower:
                result.authority = code
                break
        
        # Extract keywords (tokenize and filter)
        tokenized = ViTokenizer.tokenize(query)
        tokens = tokenized.split()
        
        # Filter out stop words and short tokens
        stop_words = {
            "là", "của", "và", "có", "được", "trong", "cho", "để", "với", "các",
            "một", "những", "này", "đó", "như", "khi", "nếu", "thì", "sẽ", "đã",
            "về", "từ", "trên", "theo", "tại", "bởi", "vì", "hay", "hoặc",
            "nhưng", "mà", "nào", "gì", "ai", "đâu", "sao", "bao", "nhiêu",
            "thế", "vậy", "ra", "vào", "lên", "xuống", "qua", "lại", "đi", "đến",
            "không", "chưa", "đang", "rồi", "rất", "quá", "lắm", "cũng", "còn"
        }
        
        keywords = [
            t for t in tokens 
            if len(t) > 2 
            and t.lower() not in stop_words
            and not t.isdigit()
        ]
        
        result.keywords = keywords[:10]  # Limit to 10 keywords
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ===================== QUERY EXPANSION =====================

# Vietnamese legal synonyms for query expansion
LEGAL_SYNONYMS = {
    "kết hôn": ["đăng ký kết hôn", "hôn nhân", "lập gia đình", "cưới"],
    "ly hôn": ["chấm dứt hôn nhân", "giải quyết ly hôn", "thuận tình ly hôn", "đơn phương ly hôn"],
    "lao động": ["người lao động", "nhân viên", "công nhân", "người làm công"],
    "doanh nghiệp": ["công ty", "tổ chức kinh tế", "cơ sở kinh doanh", "hộ kinh doanh"],
    "hợp đồng": ["thỏa thuận", "giao kèo", "cam kết", "hợp đồng lao động"],
    "bồi thường": ["đền bù", "chi trả", "bồi hoàn", "thanh toán"],
    "vi phạm": ["xâm phạm", "phạm pháp", "trái pháp luật", "bất hợp pháp"],
    "xử phạt": ["phạt", "chế tài", "xử lý", "trừng phạt"],
    "quyền": ["quyền lợi", "được phép", "có quyền", "quyền hạn"],
    "nghĩa vụ": ["trách nhiệm", "bổn phận", "phải", "bắt buộc"],
    "thừa kế": ["di sản", "di chúc", "hưởng thừa kế", "người thừa kế"],
    "đất đai": ["bất động sản", "nhà đất", "quyền sử dụng đất", "sổ đỏ"],
    "thuế": ["nộp thuế", "kê khai thuế", "nghĩa vụ thuế", "thuế thu nhập"],
    "bảo hiểm": ["bảo hiểm xã hội", "bhxh", "bảo hiểm y tế", "bhyt"],
}


@app.post("/expand-query", response_model=RewriteQueryResponse)
async def expand_query(request: RewriteQueryRequest):
    """Expand query with synonyms and variations"""
    try:
        query = request.query.strip()
        if not query:
            raise HTTPException(status_code=400, detail="Query cannot be empty")
        
        variations = [query]  # Original query first
        query_lower = query.lower()
        
        # Find matching synonyms and create variations
        for term, synonyms in LEGAL_SYNONYMS.items():
            if term in query_lower:
                for syn in synonyms[:2]:  # Limit to 2 synonyms per term
                    variation = re.sub(
                        re.escape(term), 
                        syn, 
                        query, 
                        flags=re.IGNORECASE
                    )
                    if variation not in variations:
                        variations.append(variation)
        
        # Add tokenized version
        tokenized = ViTokenizer.tokenize(query)
        if tokenized != query and tokenized not in variations:
            variations.append(tokenized)
        
        # Limit variations
        variations = variations[:request.num_variations + 1]
        
        return RewriteQueryResponse(
            original=query,
            variations=variations
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ===================== HEALTH CHECK =====================

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "nlp-service"}


# ===================== MAIN =====================

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8090)
