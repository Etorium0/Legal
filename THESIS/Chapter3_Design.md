# CHƯƠNG 3: PHÂN TÍCH VÀ THIẾT KẾ HỆ THỐNG

## 3.1. Phân tích yêu cầu

### 3.1.1. Yêu cầu chức năng (Functional Requirements)
Hệ thống được thiết kế để phục vụ hai nhóm đối tượng chính: Người quản trị (Admin) và Người dùng cuối (End-user).

**1. Đối với Người dùng cuối:**
*   **Tìm kiếm thông tin pháp luật:** Người dùng có thể nhập câu hỏi bằng ngôn ngữ tự nhiên (tiếng Việt).
*   **Xem chi tiết câu trả lời:** Hệ thống trả lời ngắn gọn, đúng trọng tâm, kèm theo trích dẫn (Citation) cụ thể (Điều, Khoản, Văn bản).
*   **Xem văn bản gốc:** Người dùng có thể nhấp vào trích dẫn để xem toàn văn điều luật.
*   **Giao diện hội thoại (Chat Interface):** Tương tác dưới dạng hỏi-đáp liên tục, lưu lịch sử hội thoại.

**2. Đối với Hệ thống (System):**
*   **Thu thập dữ liệu tự động (Crawling):** Tự động tải văn bản mới từ nguồn VBPL/Pháp điển theo định kỳ.
*   **Trích xuất tri thức (Knowledge Extraction):** Tự động phân tích văn bản, tách các điều khoản và nhận diện thực thể/quan hệ để lưu vào Knowledge Graph.
*   **Xử lý truy vấn (Query Processing):** Phân tích câu hỏi, ánh xạ vào đồ thị và tìm kiếm các node liên quan.

### 3.1.2. Yêu cầu phi chức năng (Non-functional Requirements)
*   **Hiệu năng:** Thời gian phản hồi cho một truy vấn phức tạp không quá 2 giây.
*   **Độ chính xác:** Trích dẫn phải chính xác tuyệt đối (không dẫn sai điều luật).
*   **Khả năng mở rộng:** Hệ thống phải xử lý được hàng triệu bộ ba tri thức (Triples) mà không giảm hiệu năng đáng kể.
*   **Tính sẵn sàng:** Hệ thống hoạt động 24/7, có cơ chế tự phục hồi khi gặp lỗi.

## 3.2. Kiến trúc hệ thống tổng thể

Hệ thống được thiết kế theo kiến trúc Client-Server hiện đại, tách biệt giữa Frontend và Backend, giao tiếp thông qua RESTful API.

### 3.2.1. Sơ đồ kiến trúc mức cao (High-Level Architecture)

```mermaid
graph TD
    User[Người dùng] -->|HTTPS| Frontend[Frontend (ReactJS)]
    Frontend -->|REST API| Backend[Backend API (Go/Chi)]
    
    subgraph "Backend Services"
        Backend --> QueryEngine[Query Engine]
        Backend --> Ingestion[Ingestion Engine]
        
        QueryEngine -->|SOMET Logic| NLP[NLP Processor]
        Ingestion -->|Extract| NLP
    end
    
    subgraph "Data Layer"
        Backend -->|SQL| DB[(PostgreSQL/MySQL)]
        Crawler[Python Crawler] -->|Raw Data| DB
    end
    
    Crawler -->|HTTP| ExternalSources[Cổng TTĐT Bộ Tư pháp / VBPL]
```

### 3.2.2. Mô tả các thành phần
1.  **Frontend (ReactJS):** Đóng vai trò là lớp trình bày (Presentation Layer). Sử dụng `axios` để gọi API và `TailwindCSS` để xây dựng giao diện.
2.  **Backend API (Go):** Trung tâm xử lý logic.
    *   Sử dụng `Chi Router` để định tuyến yêu cầu.
    *   Tận dụng Goroutines để xử lý song song các truy vấn tìm kiếm phức tạp.
3.  **Crawler (Python):** Hoạt động độc lập (Background Service), định kỳ quét các trang web nguồn, tải về các file ZIP/HTML, giải nén và chuẩn hóa dữ liệu trước khi đẩy vào Database.
4.  **Database (MySQL/PostgreSQL):** Lưu trữ cả dữ liệu thô (văn bản) và dữ liệu đồ thị (Triples).

## 3.3. Thiết kế Cơ sở dữ liệu (Database Design)

Mặc dù sử dụng Cơ sở dữ liệu quan hệ (RDBMS), chúng tôi thiết kế Schema để mô phỏng cấu trúc Đồ thị (Graph). Đây là cách tiếp cận "Hybrid", tận dụng sự ổn định của SQL cho dữ liệu cấu trúc và tư duy Graph cho truy vấn liên kết.

### 3.3.1. Sơ đồ thực thể liên kết (ERD)

Các bảng chính trong hệ thống:

1.  **`documents` (Văn bản):**
    *   `id` (UUID): Khóa chính.
    *   `title`: Tên văn bản (Ví dụ: Luật Giao thông đường bộ).
    *   `code`: Số hiệu (Ví dụ: 23/2008/QH12).
    *   `effective_date`: Ngày có hiệu lực.

2.  **`units` (Đơn vị pháp lý):**
    *   `id` (UUID): Khóa chính.
    *   `document_id`: Khóa ngoại trỏ về `documents`.
    *   `code`: Số hiệu điều khoản (Ví dụ: "Điều 8").
    *   `content`: Nội dung chi tiết của điều khoản.

3.  **`concepts` (Khái niệm - Node):**
    *   `id`: Khóa chính.
    *   `label`: Nhãn hiển thị (Ví dụ: "xe máy", "mũ bảo hiểm").
    *   `type`: Loại thực thể (Subject, Object, Action).

4.  **`relations` (Quan hệ - Edge Type):**
    *   `id`: Khóa chính.
    *   `name`: Tên quan hệ (Ví dụ: "bị phạt", "được phép").

5.  **`triples` (Bộ ba tri thức - Graph Edges):**
    *   `id`: Khóa chính.
    *   `subject_id`: Trỏ về `concepts`.
    *   `relation_id`: Trỏ về `relations`.
    *   `object_id`: Trỏ về `concepts`.
    *   `unit_id`: Trỏ về `units` (Nguồn gốc của tri thức này).
    *   *Đây là bảng quan trọng nhất, lưu trữ "bản đồ" tri thức pháp luật.*

### 3.3.2. Chiến lược đánh chỉ mục (Indexing Strategy)
Để tối ưu hóa truy vấn Graph trên SQL, chúng tôi tạo các chỉ mục phức hợp (Composite Indexes) trên bảng `triples`:
*   Index `(subject_id, relation_id)`: Để tìm nhanh "Chủ thể này làm gì?".
*   Index `(relation_id, object_id)`: Để tìm nhanh "Ai chịu tác động này?".
*   Full-text Search Index trên `units.content`: Để hỗ trợ tìm kiếm từ khóa bổ trợ.

## 3.4. Thiết kế các Module chính

### 3.4.1. Module Crawler (Python)
*   **Input:** Danh sách URL mục tiêu (VBPL).
*   **Process:**
    1.  Gửi HTTP Request (có cơ chế Retry và Random Delay để tránh lỗi 503).
    2.  Tải file đính kèm (.doc, .pdf, .zip).
    3.  Convert sang text thuần (Plain text).
*   **Output:** File JSON chứa metadata và nội dung văn bản.

### 3.4.2. Module Query Engine (Go)
Đây là "bộ não" của hệ thống, thực hiện quy trình tìm kiếm theo thuật toán **Star Pattern Matching**:
1.  **Nhận câu hỏi:** "Mức phạt không đội mũ bảo hiểm?"
2.  **Phân tích (SOMET):**
    *   Identify Concepts: "mũ bảo hiểm", "phạt".
3.  **Xây dựng Star Query:**
    *   Tìm tất cả Triples có `Relation` = "phạt" VÀ (`Subject` chứa "mũ bảo hiểm" HOẶC `Object` chứa "mũ bảo hiểm").
4.  **Ranking:** Xếp hạng kết quả dựa trên số lượng từ khóa khớp và độ tin cậy của văn bản.

---
*Hết Chương 3*
