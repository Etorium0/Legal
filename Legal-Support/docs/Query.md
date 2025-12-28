# Các Bước Thực Hiện Truy Vấn từ Knowledge Graph

> Mô tả chi tiết quy trình xử lý truy vấn trong hệ thống Legal-Supporter từ câu hỏi tự nhiên → kết quả có trích dẫn.

---

## Tổng Quan Quy Trình

```
Câu hỏi tự nhiên → Tiền xử lý → Tìm ứng viên → Xây dựng Star → Truy vấn Triple → Xếp hạng → Kết quả + Trích dẫn
```

---

## Bước 1: Nhận và Chuẩn Hóa Input

### 1.1 Input từ API
```json
POST /api/v1/query
{
  "text": "What is the fine for not wearing helmet on motorcycle?",
  "debug": true
}
```

### 1.2 Chuẩn hóa câu hỏi
- **Lowercase**: "what is the fine for not wearing helmet on motorcycle?"
- **Tokenize**: ["what", "is", "the", "fine", "for", "not", "wearing", "helmet", "on", "motorcycle", "?"]
- **Remove stopwords**: ["fine", "wearing", "helmet", "motorcycle"]
- **Clean punctuation**: ["fine", "wearing", "helmet", "motorcycle"]

### 1.3 Kết quả Bước 1
```go
terms := []string{"fine", "wearing", "helmet", "motorcycle"}
```

---

## Bước 2: Tìm Ứng Viên (Candidates)

### 2.1 Tìm kiếm Concepts
Với mỗi term, tìm trong bảng `concepts`:

**SQL Query:**
```sql
SELECT id, name, synonyms, concept_type 
FROM concepts 
WHERE LOWER(name) LIKE '%helmet%' 
   OR synonyms @> ARRAY['helmet'];
```

**Kết quả:**
- `helmet` → Concept "mũ bảo hiểm" (ID: uuid-123, synonyms: ["helmet"], score: 0.9)
- `motorcycle` → Concept "xe mô tô" (ID: uuid-456, synonyms: ["motorcycle", "xe máy"], score: 0.9)
- `fine` → Concept "tiền phạt" (ID: uuid-789, score: 1.0)

### 2.2 Tìm kiếm Relations
```sql
SELECT id, name, relation_type 
FROM relations 
WHERE LOWER(name) LIKE '%wearing%';
```

**Kết quả:**
- `wearing` → Relation "đội" (ID: rel-001, score: 0.8)

### 2.3 Cấu trúc Candidates
```go
type QueryCandidate struct {
    Type        string  // "concept" | "relation"
    ID          string  // UUID
    Name        string  // Tên gốc
    Score       float64 // Điểm khớp
    MatchType   string  // "direct" | "synonym"
    OriginalTerm string // Term gốc từ query
}

candidates := []QueryCandidate{
    {Type: "concept", ID: "uuid-123", Name: "mũ bảo hiểm", Score: 0.9, MatchType: "synonym", OriginalTerm: "helmet"},
    {Type: "concept", ID: "uuid-456", Name: "xe mô tô", Score: 0.9, MatchType: "synonym", OriginalTerm: "motorcycle"},
    {Type: "concept", ID: "uuid-789", Name: "tiền phạt", Score: 1.0, MatchType: "direct", OriginalTerm: "fine"},
    {Type: "relation", ID: "rel-001", Name: "đội", Score: 0.8, MatchType: "direct", OriginalTerm: "wearing"},
}
```

---

## Bước 3: Xây Dựng Query Stars

### 3.1 Ý tưởng Star Pattern
Một "Star" là một pattern truy vấn có dạng:
- `(Subject = ?, Relation = ?, Object = ?)`
- Mỗi vị trí có thể chứa một hoặc nhiều candidate IDs

### 3.2 Thuật toán Build Stars
```go
func buildQueryStars(candidates []QueryCandidate) []QueryStar {
    conceptCandidates := filterByType(candidates, "concept")
    relationCandidates := filterByType(candidates, "relation")
    
    stars := []QueryStar{}
    
    // Star 1: Tất cả concepts làm Subject/Object, relations làm Relation
    if len(conceptCandidates) >= 2 && len(relationCandidates) > 0 {
        star := QueryStar{
            SubjectCandidates: conceptCandidates,
            RelationCandidates: relationCandidates,
            ObjectCandidates: conceptCandidates,
        }
        stars = append(stars, star)
    }
    
    // Star 2: Chỉ concepts (bỏ qua relation)
    if len(conceptCandidates) >= 2 {
        star := QueryStar{
            SubjectCandidates: conceptCandidates,
            ObjectCandidates: conceptCandidates,
        }
        stars = append(stars, star)
    }
    
    return stars
}
```

### 3.3 Kết quả Stars
```go
stars := []QueryStar{
    {
        SubjectCandidates: [uuid-123, uuid-456, uuid-789],
        RelationCandidates: [rel-001],
        ObjectCandidates: [uuid-123, uuid-456, uuid-789],
    },
    {
        SubjectCandidates: [uuid-123, uuid-456, uuid-789],
        ObjectCandidates: [uuid-123, uuid-456, uuid-789],
    },
}
```

---

## Bước 4: Truy Vấn Triples

### 4.1 Xây dựng SQL động
Cho mỗi star, tạo SQL query:

```sql
SELECT 
    t.id, t.subject_id, t.relation_id, t.object_id, t.unit_id,
    t.doc_ref, t.confidence, t.tfidf, t.context,
    cs.name as subject_name, 
    cr.name as relation_name, 
    co.name as object_name,
    u.text as unit_text, 
    u.code as unit_code,
    d.title as document_title
FROM triples t
JOIN concepts cs ON t.subject_id = cs.id
JOIN relations cr ON t.relation_id = cr.id  
JOIN concepts co ON t.object_id = co.id
JOIN units u ON t.unit_id = u.id
JOIN documents d ON u.document_id = d.id
WHERE t.is_blacklisted = false
  AND t.subject_id = ANY($1)     -- [uuid-123, uuid-456, uuid-789]
  AND t.relation_id = ANY($2)    -- [rel-001] (nếu có)
  AND t.object_id = ANY($3);     -- [uuid-123, uuid-456, uuid-789]
```

### 4.2 Kết quả Triple Matching
```go
type TripleView struct {
    ID           string
    SubjectID    string
    RelationID   string  
    ObjectID     string
    UnitID       string
    DocRef       string
    Confidence   float64
    TfIdf        float64
    Context      string
    SubjectName  string
    RelationName string
    ObjectName   string
    UnitText     string
    UnitCode     string
    DocumentTitle string
}

matchingTriples := []TripleView{
    {
        ID: "triple-001",
        SubjectName: "người điều khiển xe",
        RelationName: "yêu cầu", 
        ObjectName: "mũ bảo hiểm",
        DocRef: "Nghị định 100/2019, Điều 6",
        UnitText: "Phạt tiền từ 800.000 đồng đến 1.000.000 đồng đối với người điều khiển...",
        Confidence: 1.0,
        TfIdf: 0.85,
    },
}
```

---

## Bước 5: Xếp Hạng và Tạo Answers

### 5.1 Thuật toán Ranking
```go
func calculateScore(triple TripleView, candidates []QueryCandidate) float64 {
    candidateScore := 0.0
    matchCount := 0
    
    // Tính điểm trung bình của candidates liên quan
    for _, candidate := range candidates {
        if candidate.ID == triple.SubjectID || 
           candidate.ID == triple.ObjectID || 
           candidate.ID == triple.RelationID {
            candidateScore += candidate.Score
            matchCount++
        }
    }
    
    if matchCount > 0 {
        candidateScore /= float64(matchCount)
    }
    
    // Công thức tổng hợp
    score := 0.4*candidateScore + 0.3*triple.Confidence + 0.3*triple.TfIdf
    
    // Bonus cho số lượng terms match
    score += 0.1 * float64(matchCount)
    
    return score
}
```

### 5.2 Tạo Answers
```go
type Answer struct {
    DocRef    string  `json:"doc_ref"`
    UnitID    string  `json:"unit_id"`
    Snippet   string  `json:"snippet"`
    Score     float64 `json:"score"`
    Context   string  `json:"context,omitempty"`
}

answers := []Answer{
    {
        DocRef: "Nghị định 100/2019, Điều 6",
        UnitID: "unit-uuid-001", 
        Snippet: "Phạt tiền từ 800.000 đồng đến 1.000.000 đồng đối với người điều khiển xe mô tô, xe gắn máy không đội mũ bảo hiểm...",
        Score: 0.87,
        Context: "Vi phạm quy định về trang thiết bị bảo vệ",
    },
}
```

---

## Bước 6: Tạo Response và Debug Info

### 6.1 Cấu trúc Response
```go
type QueryResult struct {
    Answers []Answer `json:"answers"`
    Debug   *DebugInfo `json:"debug,omitempty"`
}

type DebugInfo struct {
    Query      string           `json:"query"`
    Terms      []string         `json:"terms"`
    Candidates []QueryCandidate `json:"candidates"`
    Stars      []QueryStar      `json:"stars"`
    Timings    map[string]int64 `json:"timings"`
}
```

### 6.2 Response cuối cùng
```json
{
  "answers": [
    {
      "doc_ref": "Nghị định 100/2019, Điều 6",
      "unit_id": "unit-uuid-001",
      "snippet": "Phạt tiền từ 800.000 đồng đến 1.000.000 đồng đối với người điều khiển xe mô tô, xe gắn máy không đội mũ bảo hiểm...",
      "score": 0.87,
      "context": "Vi phạm quy định về trang thiết bị bảo vệ"
    }
  ],
  "debug": {
    "query": "What is the fine for not wearing helmet on motorcycle?",
    "terms": ["fine", "wearing", "helmet", "motorcycle"],
    "candidates": [
      {
        "type": "concept",
        "id": "uuid-123", 
        "name": "mũ bảo hiểm",
        "score": 0.9,
        "match_type": "synonym",
        "original_term": "helmet"
      }
    ],
    "stars": [
      {
        "subject_candidates": ["uuid-123", "uuid-456", "uuid-789"],
        "relation_candidates": ["rel-001"],
        "object_candidates": ["uuid-123", "uuid-456", "uuid-789"]
      }
    ],
    "timings": {
      "term_extraction": 2,
      "candidate_search": 15,
      "star_building": 1,
      "triple_matching": 25,
      "ranking": 3,
      "total": 46
    }
  }
}
```

---

## Đặc Điểm Kỹ Thuật

### Performance Optimizations
1. **Indexing**: GIN index trên `concepts.synonyms`, composite index trên `(subject_id, relation_id, object_id)`
2. **Caching**: Cache candidates cho frequent terms
3. **Batching**: Gom nhiều star queries thành một SQL với UNION
4. **Limiting**: Giới hạn số stars tối đa (tránh explosion)

### Edge Cases
1. **Không có candidates**: Trả `answers: []`
2. **Quá nhiều candidates**: Chỉ lấy top-N theo score
3. **Star explosion**: Giới hạn combinations
4. **Empty triples**: Fallback sang full-text search (tương lai)

### Extensibility Points
1. **LLM Assist**: Chèn trước bước 2 (paraphrase, expand synonyms)
2. **Embedding**: Bổ sung semantic similarity vào candidate scoring  
3. **RAG**: Chèn sau bước 6 (synthesize từ multiple answers)
4. **Reasoning**: Chèn sau bước 4 (infer implicit triples)

---

## Code Mapping

| Bước | File trong repo | Hàm chính |
|------|----------------|-----------|
| 1-2 | `internal/graph/query_engine.go` | `extractQueryTerms`, `findAllCandidates` |
| 3 | `internal/graph/query_engine.go` | `buildQueryStars` |
| 4 | `internal/graph/repository.go` | `FindTriplesByStar` |
| 5-6 | `internal/graph/query_engine.go` | `combineAndRankResults` |
| HTTP | `internal/query/http.go` | `handleQuery` |

---

## Ví Dụ Thực Tế Khác

### Query: "mức phạt không đội mũ bảo hiểm"
1. **Terms**: ["mức", "phạt", "không", "đội", "mũ", "bảo", "hiểm"]
2. **Candidates**: "phạt" → "tiền phạt", "đội" → "đội", "mũ bảo hiểm" → "mũ bảo hiểm"
3. **Stars**: Subject=["tiền phạt"], Relation=["đội"], Object=["mũ bảo hiểm"]
4. **Triple**: Tìm triple có relation "không đội" (negation) hoặc "vi phạm"
5. **Answer**: Điều 6 với mức phạt cụ thể

### Query: "helmet law motorcycle Vietnam"
1. **Terms**: ["helmet", "law", "motorcycle", "vietnam"]
2. **Candidates**: "helmet" → "mũ bảo hiểm", "motorcycle" → "xe mô tô"
3. **Stars**: Tất cả concepts combinations
4. **Triple**: Tìm trong documents có authority="Chính phủ", type="decree"
5. **Answer**: Nghị định liên quan với snippet