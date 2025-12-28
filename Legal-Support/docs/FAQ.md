# FAQ & Chuẩn Bị Trả Lời Giảng Viên

> Trạng thái hiện tại: Hoàn thành core Query System (ingestion + semantic query). Đang kiểm thử với dữ liệu mẫu và tuần tới tích hợp LLM.

---
## 1. Mục tiêu dự án là gì?
Xây dựng hệ thống backend trợ lý pháp luật dựa trên đồ thị tri thức (knowledge graph) cho phép nhập văn bản pháp luật, cấu trúc hóa thành khái niệm – quan hệ – bộ ba và hỗ trợ truy vấn ngữ nghĩa thay vì chỉ tìm kiếm chuỗi.

## 2. Vì sao chọn Knowledge Graph thay vì chỉ full-text search?
- Full-text search không biểu diễn rõ quan hệ giữa các thực thể.
- Không hỗ trợ suy luận đơn giản dựa trên Subject–Relation–Object.
- Khó mở rộng sang semantic expansion / embedding / reasoning.
- Knowledge Graph cho phép giải thích (explainable) vì mỗi answer liên kết về triple + điều luật gốc.

## 3. Kiến trúc tổng thể gồm những phần nào?
- HTTP API (chi) làm lớp giao tiếp.
- Ingestion Service: xử lý nhập tài liệu.
- Query Engine: pipeline xử lý truy vấn.
- Repository Layer: tương tác PostgreSQL.
- PostgreSQL: lưu trữ documents, units, concepts, relations, triples.

## 4. Dòng dữ liệu khi ingest diễn ra như thế nào?
Client gửi JSON → validate → tạo document → lưu units → trích synonyms/ concepts/ relations → tạo triples → trả về thống kê.

## 5. Dòng xử lý khi truy vấn diễn ra như thế nào?
Query text → tách từ + bỏ stop words → tìm candidates (concepts/relations) → tạo “query stars” → tìm triples phù hợp trong DB → xếp hạng → trả kết quả + (debug nếu yêu cầu).

## 6. "Query Star" là gì?
Pattern dạng (Subject?, Relation?, Object?) sinh ra từ tổ hợp ứng viên nhằm tìm triple khả dụng. Giảm không gian tìm kiếm thay vì brute force.

## 7. Ranking hiện tại hoạt động ra sao?
Kết hợp: điểm khớp synonyms (direct > synonym), confidence (hiện mặc định =1), và tfidf (nếu có). Tương lai: BM25 hoặc embedding similarity.

## 8. Làm thế nào để mở rộng sang tích hợp LLM?
- Bước 1: LLM hỗ trợ paraphrase query → cải thiện candidate coverage.
- Bước 2: Post-processing: tóm tắt kết quả answer tự nhiên (answer enrichment).
- Bước 3: RAG: LLM lấy context từ snippets (units) để tạo câu trả lời ngôn ngữ tự nhiên.

## 9. Vì sao chưa tích hợp LLM ngay từ đầu?
Ưu tiên có nền tảng tri thức cấu trúc chuẩn → giúp LLM trả lời chính xác, giảm hallucination. Tách biệt để dễ đánh giá phần logic truyền thống.

## 10. Những thách thức chính đã gặp?
| Thách thức | Giải pháp |
|------------|-----------|
| Mapping parent-child units | Dùng map code->UUID trong ingest vòng lặp |
| Synonym normalization đa ngôn ngữ | Lưu synonyms dạng array, so khớp lowercased |
| Giải thích kết quả | Trả kèm doc_ref + snippet + debug structure |
| Tránh nổ truy vấn triple | Star pattern + lọc ID trước khi JOIN |

## 11. Tại sao dùng PostgreSQL thay vì Neo4j?
- PostgreSQL đủ cho mô hình triple đơn giản ban đầu.
- Native JSON + full-text + GIN indexes hỗ trợ tìm kiếm.
- Dễ deploy bằng Docker Compose và quen thuộc.
- Có thể chuyển sang graph DB sau nếu truy vấn graph phức tạp hơn (path, reasoning deep).

## 12. Bảo toàn tính pháp lý của dữ liệu thế nào?
- Lưu nguyên văn từng đơn vị (unit.text).
- Gắn doc_ref (ví dụ: "Decree 100/2019, Art 6").
- Không thay đổi nghĩa; chỉ trích xuất metadata cấu trúc.

## 13. Làm sao kiểm tra độ đúng của kết quả?
- So sánh snippet trả về với unit gốc.
- Kiểm tra concept mapping thủ công.
- Tương lai: test set gồm (query → expected doc_ref).

## 14. Kế hoạch tuần tới?
1. Hoàn thiện test cases repository + query engine.
2. Tối ưu search (index bổ sung, chuẩn hoá stemming VN cơ bản nếu cần).
3. Tích hợp bước paraphrase/semantic expansion (LLM) thử nghiệm.
4. Thêm endpoint thống kê (số triples, concepts).

## 15. Hạn chế hiện tại?
- Chưa có UI trực quan graph.
- Ranking đơn giản.
- Chưa có embedding semantic.
- Chưa có auth.

## 16. Khi thêm LLM sẽ xử lý rủi ro nào?
- Hallucination: luôn buộc trích dẫn doc_ref.
- Latency: cache context (snippet) + giới hạn token.
- Bảo mật: không gửi dữ liệu ngoài khi không cần.

## 17. Làm gì nếu dữ liệu lớn (10^5 units)?
- Batch ingest + COPY.
- Thêm inverted index text (to_tsvector) đã có.
- Precompute concept-term mapping cache.
- Pagination + streaming answers.

## 18. Có thể hỗ trợ câu hỏi phức như "Nếu ... thì ..." không?
- Hiện tại chưa xử lý điều kiện logic.
- Kế hoạch: parse pattern condition và gắn vào triple context.

## 19. Debug giúp gì cho đánh giá học thuật?
- Chứng minh pipeline *deterministic*.
- Cho phép phân tích từng bước (term → candidate → star → triple).
- Dễ benchmark thay đổi thuật toán.

## 20. Các chỉ số (metrics) sẽ theo dõi khi mở rộng?
| Nhóm | Metric |
|------|--------|
| Hiệu năng | Thời gian ingest / unit, ms/query |
| Chất lượng | Precision@k, Coverage, Synonym hit rate |
| Khai thác | Số concepts/triples qua thời gian |
| Hệ thống | CPU, RAM, I/O DB |

## 21. Hướng nghiên cứu nâng cao tiềm năng?
- Graph embedding (TransE / RotatE) để suy luận quan hệ ẩn.
- Legal-specific NER + relation extraction bằng transformer.
- Hybrid ranking (symbolic + dense vector).
- Temporal law evolution (status: active/repealed) truy vấn theo thời gian.

## 22. Nếu thay DB khác? (Elasticsearch / Neo4j)
- Elasticsearch: mạnh full-text, yếu graph semantics.
- Neo4j: mạnh traversal, chi phí cao hơn, phức cú pháp Cypher ban đầu.
- PostgreSQL hiện cân bằng đơn giản + ổn định.

## 23. Chiến lược test sau này?
- Unit tests: repository queries (happy + empty + invalid ID).
- Integration: ingest → query → assert triple count.
- Benchmark script: đo ms/query.

## 24. Khả năng mở rộng microservice?
- Tách Ingestion Service riêng hàng đợi (Kafka / NATS).
- Query Service scale horizontal (stateless + connection pool tuned).
- Add Cache Layer (Redis) cho candidate synonyms.

## 25. Một câu trả lời mẫu LLM trong tương lai sẽ thế nào?
"Theo Nghị định 100/2019 (Điều 6), hành vi không đội mũ bảo hiểm khi điều khiển xe mô tô có thể bị phạt 800.000–1.000.000 đồng." (nguồn: doc_ref: Decree 100/2019, Art 6)

---
(End FAQ)
