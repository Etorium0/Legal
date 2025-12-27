# ĐỀ CƯƠNG CHI TIẾT KHÓA LUẬN TỐT NGHIỆP
**Đề tài:** Xây dựng Hệ thống Trợ lý ảo Tư vấn Pháp luật Việt Nam sử dụng Kiến trúc RAG và Đồ thị Tri thức (Knowledge Graph)

*Dự kiến độ dài: ~100 trang*

---

## MỤC LỤC

### LỜI CẢM ƠN (1 trang)
### TÓM TẮT KHÓA LUẬN (1-2 trang)
### DANH MỤC HÌNH ẢNH (2 trang)
### DANH MỤC BẢNG BIỂU (1 trang)
### DANH MỤC TỪ VIẾT TẮT (1 trang)

---

## CHƯƠNG 1: TỔNG QUAN VỀ ĐỀ TÀI (Khoảng 10-15 trang)
**1.1. Đặt vấn đề**
   - Sự bùng nổ thông tin và khó khăn trong việc tra cứu văn bản pháp luật (VBPL) tại Việt Nam.
   - Hạn chế của các công cụ tìm kiếm hiện tại (tìm theo từ khóa, thiếu ngữ nghĩa).
   - Nhu cầu về một trợ lý ảo có khả năng hiểu và giải đáp thắc mắc pháp lý tự động.

**1.2. Mục tiêu nghiên cứu**
   - Xây dựng kho dữ liệu pháp luật có cấu trúc (Knowledge Graph).
   - Phát triển hệ thống tìm kiếm thông minh dựa trên ngữ nghĩa (Semantic Search).
   - Tích hợp LLM để tổng hợp câu trả lời tự nhiên, chính xác.

**1.3. Phạm vi nghiên cứu**
   - Dữ liệu: Văn bản pháp luật Việt Nam (Luật, Nghị định, Thông tư...) từ nguồn VBPL/Pháp điển.
   - Công nghệ: Go (Backend), React (Frontend), MySQL (Database), Python (Crawler).
   - Giới hạn: Tập trung vào việc truy xuất thông tin và trả lời câu hỏi dạng Fact-based.

**1.4. Phương pháp nghiên cứu**
   - Phương pháp thu thập dữ liệu (Web Crawling).
   - Phương pháp biểu diễn tri thức (Knowledge Graph).
   - Phương pháp kết hợp LLM và dữ liệu nội bộ (RAG - Retrieval Augmented Generation).

**1.5. Cấu trúc khóa luận**

---

## CHƯƠNG 2: CƠ SỞ LÝ THUYẾT VÀ CÔNG NGHỆ (Khoảng 20-25 trang)
**2.1. Tổng quan về Xử lý Ngôn ngữ Tự nhiên (NLP)**
   - Các bài toán cơ bản: Tách từ, Gán nhãn từ loại (POS Tagging), Nhận diện thực thể (NER).
   - Đặc thù của tiếng Việt trong xử lý máy tính.

**2.2. Đồ thị Tri thức (Knowledge Graph)**
   - Định nghĩa và thành phần: Thực thể (Node), Quan hệ (Edge), Bộ ba (Triple).
   - Ứng dụng của Knowledge Graph trong tra cứu thông tin.
   - So sánh với Cơ sở dữ liệu quan hệ truyền thống và Vector Database.

**2.3. Retrieval-Augmented Generation (RAG)**
   - Khái niệm và Kiến trúc RAG cơ bản.
   - Vấn đề ảo giác (Hallucination) của LLM và cách RAG giải quyết.
   - Các chiến lược RAG nâng cao (Hybrid Search, Re-ranking).

**2.4. Phương pháp SOMET (Đề xuất)**
   - Summarize (Tóm tắt câu hỏi).
   - Orient (Định hướng ý định).
   - Match (Khớp khái niệm).
   - Expand (Mở rộng từ vựng).
   - Template (Khuôn mẫu truy vấn).
   *Dựa trên tài liệu THEORY_KB_LLM.md của dự án.*

**2.5. Các công nghệ sử dụng**
   - Ngôn ngữ lập trình: Go (Golang) cho hiệu năng cao.
   - Cơ sở dữ liệu: MySQL/PostgreSQL lưu trữ cấu trúc graph.
   - Frontend Framework: React, TypeScript, TailwindCSS.
   - Công cụ khác: Docker, Chi Router.

---

## CHƯƠNG 3: PHÂN TÍCH VÀ THIẾT KẾ HỆ THỐNG (Khoảng 20-25 trang)
**3.1. Phân tích yêu cầu**
   - Yêu cầu chức năng: Crawl dữ liệu, Xử lý ngôn ngữ, Tìm kiếm, Chatbot UI.
   - Yêu cầu phi chức năng: Hiệu năng, Tính sẵn sàng, Bảo mật.

**3.2. Kiến trúc hệ thống tổng thể**
   - Sơ đồ kiến trúc (High-level Architecture).
   - Mô hình Client-Server.
   - Luồng dữ liệu (Data Flow Diagram).

**3.3. Thiết kế Cơ sở dữ liệu (Database Design)**
   - Sơ đồ thực thể liên kết (ERD).
   - Thiết kế bảng: `documents`, `units`, `triples`, `concepts`, `answers`.
   - Giải thích chiến lược lưu trữ bộ ba (Subject-Relation-Object) trong SQL.

**3.4. Thiết kế các Module chính**
   - Module Crawler (Python): Chiến lược vượt tường lửa, xử lý bất đồng bộ.
   - Module Ingestion (Go): Phân tích cú pháp văn bản luật, trích xuất Triple.
   - Module Query Engine (Go): Xử lý câu hỏi, Mapping, Ranking.

**3.5. Thiết kế Giao diện người dùng (UI/UX)**
   - Wireframe và Mockup.
   - Thiết kế trải nghiệm Chatbot.

---

## CHƯƠNG 4: HIỆN THỰC HỆ THỐNG (Khoảng 20-25 trang)
**4.1. Môi trường phát triển và Cài đặt**
   - Cấu hình Docker, Docker Compose.
   - Cấu trúc thư mục dự án (Clean Architecture).

**4.2. Xây dựng bộ thu thập dữ liệu (Crawler)**
   - Hiện thực `law-crawler`: Xử lý Request, Retry logic (xử lý lỗi 503), Parsing HTML.
   - *Code minh họa: Xử lý rate limit, download file.*

**4.3. Xây dựng Backend và API (Go)**
   - Hiện thực `Ingestion Engine`: Logic tách điều luật, trích xuất thực thể.
   - Hiện thực `Query Engine`: Thuật toán tìm kiếm theo mẫu hình sao (Star Pattern).
   - Tối ưu hóa truy vấn SQL.
   - *Code minh họa: Structs, Interface, Goroutines.*

**4.4. Xây dựng Frontend (React)**
   - Tích hợp API.
   - Xử lý State management.
   - Hiển thị trích dẫn (Citation) và luồng hội thoại.

**4.5. Tích hợp mô hình SOMET**
   - Hiện thực logic phân tích ý định người dùng.
   - Kết nối với LLM (nếu có) để sinh câu trả lời tự nhiên.

---

## CHƯƠNG 5: THỰC NGHIỆM VÀ ĐÁNH GIÁ (Khoảng 10-15 trang)
**5.1. Kịch bản kiểm thử**
   - Kiểm thử đơn vị (Unit Test).
   - Kiểm thử tích hợp (Integration Test).

**5.2. Kết quả thu thập dữ liệu**
   - Thống kê số lượng văn bản, bộ ba tri thức đã thu thập.
   - Đánh giá chất lượng dữ liệu.

**5.3. Đánh giá hiệu năng hệ thống**
   - Thời gian phản hồi (Latency).
   - Độ chính xác của kết quả tìm kiếm (Precision/Recall trên tập mẫu).
   - Khả năng chịu tải.

**5.4. So sánh thực tế**
   - So sánh kết quả trả lời của hệ thống với việc tìm kiếm từ khóa thông thường.

---

## KẾT LUẬN VÀ HƯỚNG PHÁT TRIỂN (Khoảng 3-5 trang)
**6.1. Kết luận**
   - Tóm tắt các kết quả đạt được.
   - Đóng góp của khóa luận.

**6.2. Hạn chế**
   - Những điểm chưa hoàn thiện.

**6.3. Hướng phát triển**
   - Mở rộng sang các lĩnh vực luật khác.
   - Cải thiện thuật toán AI/Machine Learning.
   - Phát triển ứng dụng Mobile.

---

## TÀI LIỆU THAM KHẢO
## PHỤ LỤC (Code snippets, Cấu hình chi tiết)
