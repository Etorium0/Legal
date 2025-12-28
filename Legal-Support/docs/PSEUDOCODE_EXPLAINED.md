# Giải thích mã giả: Trích bộ ba + Kết nối LLM

Tài liệu này giải thích chi tiết các mã giả đã đưa trong `THEORY_KB_LLM.md` theo ngôn ngữ tự nhiên, kèm ví dụ và liên hệ với mã nguồn của dự án Legal‑Supporter.

---
## 1) Thuật toán trích rút Bộ Ba (Subject–Relation–Object)

### Mục tiêu
Biến một câu/đoạn tiếng Việt thành các bộ ba S–R–O. Ví dụ:
- "Người điều khiển xe mô tô phải đội mũ bảo hiểm" → (Người điều khiển xe mô tô, phải, mũ bảo hiểm)

### Ý tưởng chính
- Động từ thường là “Quan hệ” (R).
- Danh từ/cụm danh từ làm “Chủ thể” (S) hoặc “Đối tượng” (O) tùy nhãn phụ thuộc (Subject/Object).
- Liên từ ("và", "hoặc") tạo nhiều vế → cần nhân bản bộ ba.

### Mã giả (tóm tắt)
```
Input:  raw_text
Output: list_triplets = [(S, R, O), ...]

text    ← preprocess(raw_text)
tokens  ← annotate(text)            # posTag, depLabel, head, lemma
triples ← []                        # {S, R, O, head}

for t in tokens:
  if t.posTag == Verb:
    append({S:null, R:t.lemma, O:null, head:t.index})

  if t.posTag in {Noun, ProperNoun}:
    tri ← find_by_head(triples, t.head)
    if tri != null:
      if t.depLabel in {nsubj, subj}: tri.S ← collect_phrase(tokens, t)
      if t.depLabel in {dobj, obj}:   tri.O ← collect_phrase(tokens, t)

  if t.posTag == Conjunction:
    main ← find_main_of_conj(tokens, t)
    base ← find_triple_attached_to(triples, main)
    if base:
      new_tri ← clone(base); new_tri ← replace_conj_slot(new_tri, tokens, t)
      append(new_tri)

normalize_and_dedup(triples)
return triples
```

### Ví dụ từng bước (walkthrough)
Câu: "Người điều khiển xe mô tô không đội mũ bảo hiểm"
- Tiền xử lý, gán nhãn: Verb="đội" (phủ định "không"), Noun="Người điều khiển xe mô tô", Noun="mũ bảo hiểm".
- Tạo triple khung: {S:null, R:"đội", O:null}
- Gán S theo nsubj: S ← "Người điều khiển xe mô tô"
- Gán O theo obj: O ← "mũ bảo hiểm"
- Xử lý phủ định: có thể đánh dấu R= "không_đội" hoặc thuộc tính neg=true
- Kết quả: (Người điều khiển xe mô tô, không_đội, mũ bảo hiểm)

### Edge cases cần lưu ý
- Cụm danh từ nhiều tầng: "mũ bảo hiểm đạt chuẩn"
- Phủ định/khẳng định: "không", "chỉ được", "bắt buộc"
- Liên từ: "và", "hoặc" → nhân bản S hoặc O tương ứng
- Bị động: "bị xử phạt" → S có thể là người vi phạm; R="xử phạt"; cần heuristic
- Mệnh đề rút gọn/thiếu chủ ngữ: suy từ văn cảnh hoặc Unit chứa câu

### Map vào dự án
- Lớp IE này là bổ sung ngoại tuyến: kết quả (S, R, O) sẽ được người duyệt rồi lưu bằng `InsertTriple` vào bảng `triples`.
- Các bảng liên quan: `concepts`, `relations`, `units`, `triples` trong Postgres.

---
## 2) Assist trước truy vấn (SOMET rút trích nội dung chính)

### Mục tiêu
Giúp hệ thống "hỏi cho đúng": rút gọn câu hỏi, nhận diện ý định, nối vào khái niệm/quan hệ chuẩn, dựng pattern để truy hồi.

### Các bước SOMET
- Summarize: rút gọn câu hỏi còn 1–2 mệnh đề.
- Orient: xác định intent (mức phạt/điều kiện/định nghĩa...).
- Match: ánh xạ thuật ngữ vào `concepts`/`relations` (ưu tiên synonyms đã có).
- Expand: thêm vài đồng nghĩa phổ biến (whitelist) để tăng recall có kiểm soát.
- Template: dựng star pattern tương ứng intent.

### I/O hợp đồng nhỏ
- Input: `text`, `lang`, `debug`
- Output: `{intent, core_terms[], candidates{concepts[], relations[]}, patterns[]}`

### Ví dụ
- Hỏi: "Mức phạt không đội mũ bảo hiểm khi đi xe máy?"
- Kết quả SOMET: intent="mức phạt"; core_terms=["mũ bảo hiểm","xe máy","không đội"]; match "xe máy"→"xe mô tô"; pattern (S=?, R=mức phạt, O∈{mũ bảo hiểm|không đội|xe mô tô})

---
## 3) RAG có kiểm chứng sau truy hồi

### Mục tiêu
Viết lại câu trả lời tự nhiên nhưng chỉ dùng context đã trích từ triples/units và luôn kèm trích dẫn `doc_ref`.

### Quy tắc
- Không có `doc_ref` là lỗi → fallback trả snippet + doc_ref (không dùng LLM).
- Không thêm thông tin ngoài context.

### Mã giả (tóm tắt)
```
triples  ← repo.find_triples_by_patterns(patterns)
if mode != 'rag': return explainable(triples)
context  ← build_context(triples)
answer   ← llm.generate(prompt_from(context))
if !has_all_citations(answer): return explainable(triples)
return answer
```

---
## 4) Liên hệ mã nguồn dự án
- Query Engine: `internal/graph/query_engine.go` (terms, candidates, stars, ranking)
- Repository: `internal/graph/repository.go` (FindTriplesByStar, InsertTriple)
- Ingestion: `internal/graph/ingestion.go` (tạo concept/relation/triple cơ bản)
- API: `internal/query/http.go` (điểm chèn `use_llm`, `mode` nếu cần)

---
## 5) Gợi ý thử nghiệm nhỏ
- Chạy ingest `sample_data.json` → hỏi câu “mức phạt mũ bảo hiểm xe máy?”
- So sánh kết quả khi bật/tắt mở rộng đồng nghĩa trong SOMET (mô phỏng) để thấy sự khác biệt về recall.
