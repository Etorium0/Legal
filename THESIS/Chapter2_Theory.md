# CHƯƠNG 2: CƠ SỞ LÝ THUYẾT VÀ CÔNG NGHỆ

## 2.1. Tổng quan về Xử lý Ngôn ngữ Tự nhiên (NLP)

Xử lý ngôn ngữ tự nhiên (Natural Language Processing - NLP) là một nhánh của trí tuệ nhân tạo tập trung vào việc tương tác giữa máy tính và ngôn ngữ của con người. Trong ngữ cảnh của hệ thống tư vấn pháp luật, NLP đóng vai trò cốt lõi trong việc "hiểu" câu hỏi của người dùng và "đọc hiểu" văn bản pháp luật để trích xuất tri thức.

### 2.1.1. Các bài toán cơ bản trong NLP
Để máy tính có thể xử lý văn bản thô (raw text), cần trải qua nhiều bước tiền xử lý và phân tích:

1.  **Tách từ (Word Segmentation/Tokenization):**
    *   Khác với tiếng Anh nơi các từ được ngăn cách bởi khoảng trắng, trong tiếng Việt, khoảng trắng không phải là dấu hiệu duy nhất để tách từ (ví dụ: "nhà nước" là một từ ghép, không phải hai từ riêng biệt "nhà" và "nước").
    *   Việc tách từ chính xác là tiền đề quan trọng cho các bước xử lý sau. Trong đề tài này, chúng ta sử dụng các thư viện hoặc quy tắc từ điển để nhận diện các từ ghép pháp lý (ví dụ: "xử phạt vi phạm hành chính", "tước quyền sử dụng").

2.  **Gán nhãn từ loại (Part-of-Speech Tagging - POS Tagging):**
    *   Là quá trình gán nhãn ngữ pháp cho từng từ (Danh từ, Động từ, Tính từ...).
    *   Trong trích xuất tri thức pháp luật, việc xác định Động từ (Verb) giúp nhận diện hành vi hoặc chế tài (ví dụ: "phạt", "cấm", "quy định"), trong khi Danh từ (Noun) thường là chủ thể hoặc đối tượng chịu tác động.

3.  **Nhận diện thực thể định danh (Named Entity Recognition - NER):**
    *   Bài toán xác định và phân loại các thực thể có tên trong văn bản như: Tên cơ quan (Bộ Công an, Chính phủ), Số hiệu văn bản (Nghị định 100), Mức tiền (200.000 đồng).

### 2.1.2. Đặc thù của văn bản pháp luật Việt Nam
Văn bản pháp luật có văn phong hàn lâm, cấu trúc chặt chẽ nhưng cũng rất phức tạp:
*   **Cấu trúc phân cấp:** Luật -> Chương -> Mục -> Điều -> Khoản -> Điểm.
*   **Tính liên kết:** Các văn bản thường xuyên tham chiếu lẫn nhau ("theo quy định tại khoản 1 Điều này", "thực hiện theo quy định của pháp luật về...").
*   **Ngôn ngữ:** Sử dụng nhiều thuật ngữ chuyên ngành, câu phức dài, nhiều mệnh đề phụ. Điều này đòi hỏi các mô hình NLP thông thường cần được tinh chỉnh (fine-tune) hoặc bổ trợ bằng các quy tắc (rules) đặc thù.

## 2.2. Đồ thị Tri thức (Knowledge Graph)

### 2.2.1. Định nghĩa
Đồ thị tri thức (Knowledge Graph - KG) là một phương pháp biểu diễn dữ liệu dưới dạng đồ thị, trong đó:
*   **Nút (Node):** Đại diện cho các thực thể (Entities) như: Văn bản luật, Hành vi, Mức phạt, Cơ quan ban hành.
*   **Cạnh (Edge):** Đại diện cho các mối quan hệ (Relations) giữa các thực thể.

Mô hình cơ bản của KG là bộ ba (Triple): **(Chủ thể - Quan hệ - Khách thể)** hay **(Subject - Predicate - Object)**.
*   Ví dụ: `(Người điều khiển xe máy) --[bị phạt]--> (200.000 đồng)`

### 2.2.2. Tại sao chọn Knowledge Graph cho Pháp luật?
So với cơ sở dữ liệu quan hệ (SQL) hay tìm kiếm Full-text (Elasticsearch), KG có những ưu điểm vượt trội trong miền pháp luật:

1.  **Tính liên kết cao:** Pháp luật bản chất là một mạng lưới các quy định ràng buộc lẫn nhau. KG phản ánh tự nhiên cấu trúc này.
2.  **Khả năng suy diễn (Inference):** Từ các mối quan hệ tường minh, KG có thể giúp suy ra các tri thức mới. Ví dụ: Nếu A là con của B, và B bị cấm làm việc X, thì hệ thống có thể suy luận các ràng buộc liên quan đến A nếu luật quy định về người thân.
3.  **Tính giải thích (Explainability):** Khi hệ thống đưa ra câu trả lời, nó có thể truy ngược lại đường đi trên đồ thị (Path) để chỉ ra lý do, trích dẫn chính xác điều khoản nào dẫn đến kết luận đó. Đây là yếu tố sống còn trong tư vấn luật.

### 2.2.3. So sánh với Vector Database (Vector Search)
Hiện nay, Vector Search (dùng Embedding) rất phổ biến trong RAG. Tuy nhiên, nó có nhược điểm:
*   **Mất mát thông tin chi tiết:** Khi nén văn bản thành vector, các chi tiết nhỏ (số liệu, phủ định "không", "trừ trường hợp") có thể bị mờ nhạt.
*   **Khó kiểm soát:** Vector search trả về kết quả dựa trên độ tương đồng (similarity), đôi khi trả về các đoạn văn bản "gần giống" nhưng sai về bản chất pháp lý.
*   **Kết hợp:** Giải pháp tối ưu là **Hybrid Approach**: Dùng KG để đảm bảo tính chính xác của các mối quan hệ logic, và dùng Vector Search để xử lý sự đa dạng ngôn ngữ tự nhiên của người dùng.

## 2.3. Retrieval-Augmented Generation (RAG)

### 2.3.1. Khái niệm
RAG là kỹ thuật tối ưu hóa đầu ra của Mô hình ngôn ngữ lớn (LLM) bằng cách tham chiếu đến một cơ sở tri thức tin cậy (Knowledge Base) bên ngoài dữ liệu huấn luyện của nó.

Quy trình RAG tiêu chuẩn:
1.  **Retrieval (Truy hồi):** Hệ thống tìm kiếm các tài liệu liên quan đến câu hỏi từ kho dữ liệu nội bộ.
2.  **Augmentation (Tăng cường):** Ghép các tài liệu tìm được vào làm ngữ cảnh (Context) cho câu lệnh (Prompt).
3.  **Generation (Sinh):** Gửi Prompt + Context cho LLM để sinh câu trả lời.

### 2.3.2. Giải quyết vấn đề "Ảo giác" (Hallucination)
LLM (như GPT) rất giỏi viết văn nhưng hay "bịa" thông tin (hallucination) khi không biết câu trả lời hoặc dữ liệu đã cũ. Trong lĩnh vực luật, sự sai lệch là không thể chấp nhận.
RAG khắc phục điều này bằng cách ép LLM chỉ được trả lời dựa trên thông tin được cung cấp trong Context ("Answer based strictly on the provided context"). Nếu không có thông tin, LLM sẽ trả lời "Tôi không biết" thay vì bịa đặt.

## 2.4. Phương pháp SOMET (Đề xuất)

Trong khuôn khổ dự án này, chúng tôi áp dụng quy trình **SOMET** để tối ưu hóa việc chuyển đổi câu hỏi tự nhiên thành truy vấn đồ thị:

1.  **S - Summarize (Tóm tắt):** Rút gọn câu hỏi của người dùng thành các mệnh đề cốt lõi, loại bỏ các từ thừa, cảm thán.
2.  **O - Orient (Định hướng):** Xác định ý định (Intent) của người dùng. Họ đang hỏi về mức phạt, định nghĩa, thủ tục hành chính, hay thẩm quyền?
3.  **M - Match (Ánh xạ):** Đối chiếu các từ khóa trong câu hỏi với các Concept và Relation đã lưu trong Knowledge Graph. (Ví dụ: "xe máy" -> "xe mô tô hai bánh").
4.  **E - Expand (Mở rộng):** Mở rộng từ vựng để tăng khả năng tìm kiếm (Synonyms expansion).
5.  **T - Template (Khuôn mẫu):** Áp dụng các mẫu truy vấn (Query Patterns) định sẵn tương ứng với Intent để quét trên đồ thị. Ví dụ mẫu "Star Pattern" tìm tất cả các cạnh xuất phát từ một chủ thể.

## 2.5. Các công nghệ sử dụng

### 2.5.1. Ngôn ngữ lập trình Go (Golang)
*   Được chọn làm ngôn ngữ chính cho Backend.
*   **Ưu điểm:** Tốc độ thực thi nhanh (gần bằng C/C++), khả năng xử lý đồng thời (Concurrency) mạnh mẽ với Goroutines (rất tốt cho Crawler và xử lý request song song), cú pháp đơn giản, dễ bảo trì.
*   **Thư viện:** Sử dụng `Chi Router` cho HTTP API, `Gorm` hoặc `database/sql` cho tương tác cơ sở dữ liệu.

### 2.5.2. Cơ sở dữ liệu MySQL/PostgreSQL
*   Mặc dù là RDBMS, nhưng chúng tôi thiết kế schema để lưu trữ Graph (bảng Nodes, bảng Edges).
*   Lý do: Tính ổn định, phổ biến, dễ dàng backup/restore, và khả năng thực hiện các truy vấn phức tạp (JOINs) hiệu quả với lượng dữ liệu vừa phải (vài triệu triples).

### 2.5.3. Python
*   Sử dụng cho module Crawler và các script xử lý dữ liệu (Data Processing Scripts) do có hệ sinh thái thư viện phong phú (BeautifulSoup, Pandas, Requests).

### 2.5.4. ReactJS (Frontend)
*   Xây dựng giao diện người dùng hiện đại, SPA (Single Page Application), trải nghiệm mượt mà.
*   Hệ sinh thái phong phú với các thư viện UI component.

---
*Hết Chương 2*
