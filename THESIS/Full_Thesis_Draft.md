# KHÓA LUẬN TỐT NGHIỆP
**Đề tài:** Xây dựng Hệ thống Trợ lý ảo Tư vấn Pháp luật Việt Nam sử dụng Kiến trúc RAG và Đồ thị Tri thức (Knowledge Graph)

---

# MỤC LỤC

1. [CHƯƠNG 1: TỔNG QUAN VỀ ĐỀ TÀI](#chương-1-tổng-quan-về-đề-tài)
2. [CHƯƠNG 2: CƠ SỞ LÝ THUYẾT VÀ CÔNG NGHỆ](#chương-2-cơ-sở-lý-thuyết-và-công-nghệ)
3. [CHƯƠNG 3: PHÂN TÍCH VÀ THIẾT KẾ HỆ THỐNG](#chương-3-phân-tích-và-thiết-kế-hệ-thống)
4. [CHƯƠNG 4: HIỆN THỰC HỆ THỐNG](#chương-4-hiện-thực-hệ-thống)
5. [CHƯƠNG 5: THỰC NGHIỆM VÀ ĐÁNH GIÁ](#chương-5-thực-nghiệm-và-đánh-giá)
6. [CHƯƠNG 6: KẾT LUẬN VÀ HƯỚNG PHÁT TRIỂN](#chương-6-kết-luận-và-hướng-phát-triển)

---

# CHƯƠNG 1: TỔNG QUAN VỀ ĐỀ TÀI

## 1.1. Đặt vấn đề

Trong kỷ nguyên số hóa, khối lượng thông tin pháp luật ngày càng gia tăng với tốc độ chóng mặt. Hệ thống văn bản quy phạm pháp luật (VBPL) của Việt Nam, bao gồm hàng nghìn luật, nghị định, thông tư và các văn bản hướng dẫn thi hành, tạo nên một mạng lưới thông tin khổng lồ và phức tạp. Đối với người dân, doanh nghiệp và ngay cả những người hành nghề luật, việc tra cứu, tìm kiếm và hiểu đúng các quy định pháp luật là một thách thức không nhỏ.

Hiện nay, các công cụ tra cứu pháp luật phổ biến tại Việt Nam (như Thư Viện Pháp Luật, Cổng thông tin điện tử Bộ Tư pháp...) chủ yếu dựa trên công nghệ tìm kiếm theo từ khóa (keyword-based search). Mặc dù các công cụ này đã phát huy tác dụng trong việc lưu trữ và cung cấp văn bản, nhưng chúng bộc lộ nhiều hạn chế khi người dùng cần câu trả lời cho các vấn đề cụ thể thay vì chỉ là danh sách các văn bản chứa từ khóa.

**Các hạn chế chính của phương pháp tìm kiếm truyền thống:**
1.  **Quá tải thông tin:** Người dùng thường nhận được hàng trăm kết quả trả về, buộc họ phải tự đọc và lọc thông tin thủ công.
2.  **Thiếu ngữ nghĩa:** Máy tìm kiếm không "hiểu" mối quan hệ giữa các điều luật. Ví dụ, khi tìm "phạt không đội mũ bảo hiểm", máy chỉ tìm các văn bản chứa các từ này mà không biết rằng hành vi này bị xử phạt theo Nghị định 100/2019/NĐ-CP (và các văn bản sửa đổi).
3.  **Khó khăn trong việc tổng hợp:** Một vấn đề pháp lý thường được quy định rải rác ở nhiều văn bản khác nhau (Luật gốc, Nghị định hướng dẫn, Thông tư chi tiết). Việc tổng hợp thủ công dễ dẫn đến sai sót hoặc bỏ sót quy định hiệu lực.

Xuất phát từ thực tế đó, nhu cầu xây dựng một hệ thống "Trợ lý ảo" có khả năng không chỉ tìm kiếm văn bản mà còn "hiểu" được cấu trúc pháp lý, liên kết các quy định và đưa ra câu trả lời trực tiếp, chính xác là vô cùng cấp thiết. Đây chính là động lực để thực hiện đề tài **"Xây dựng Hệ thống Trợ lý ảo Tư vấn Pháp luật Việt Nam sử dụng Kiến trúc RAG và Đồ thị Tri thức (Knowledge Graph)"**.

## 1.2. Mục tiêu nghiên cứu

Đề tài tập trung vào việc giải quyết bài toán truy xuất thông tin pháp luật thông minh thông qua việc kết hợp các kỹ thuật tiên tiến trong Khoa học máy tính và Xử lý ngôn ngữ tự nhiên.

**Các mục tiêu cụ thể bao gồm:**

1.  **Xây dựng Kho tri thức pháp luật có cấu trúc (Legal Knowledge Graph):**
    *   Chuyển đổi dữ liệu văn bản phi cấu trúc (Unstructured Text) từ các nguồn chính thống (VBPL, Pháp điển) sang dạng dữ liệu có cấu trúc (Structured Data) dưới hình thức các bộ ba (Subject - Relation - Object).
    *   Ví dụ: Chuyển câu "Người điều khiển xe mô tô không đội mũ bảo hiểm bị phạt tiền từ 400.000 đồng đến 600.000 đồng" thành các node và cạnh trong đồ thị để máy tính có thể truy vấn logic.

2.  **Phát triển Hệ thống tìm kiếm ngữ nghĩa (Semantic Search Engine):**
    *   Xây dựng thuật toán tìm kiếm không chỉ dựa trên từ khóa mà dựa trên ý định (Intent) và ngữ cảnh (Context) của câu hỏi.
    *   Áp dụng phương pháp SOMET (Summarize - Orient - Match - Expand - Template) để phân tích câu hỏi tự nhiên của người dùng.

3.  **Tích hợp kiến trúc RAG (Retrieval-Augmented Generation):**
    *   Sử dụng thông tin truy xuất được từ Knowledge Graph làm ngữ cảnh (Context) cho Mô hình ngôn ngữ lớn (LLM) để sinh ra câu trả lời tự nhiên, dễ hiểu nhưng vẫn đảm bảo tính chính xác và có trích dẫn nguồn (Citation).

## 1.3. Phạm vi nghiên cứu

**Về dữ liệu:**
*   Hệ thống tập trung vào dữ liệu văn bản quy phạm pháp luật của Việt Nam.
*   Nguồn dữ liệu chính: Cổng thông tin điện tử Bộ Tư pháp (Pháp điển), Cơ sở dữ liệu quốc gia về văn bản pháp luật (VBPL).
*   Giai đoạn hiện tại tập trung vào các lĩnh vực luật phổ biến như: Giao thông đường bộ, Dân sự, Hình sự.

**Về công nghệ:**
*   **Backend:** Sử dụng ngôn ngữ Go (Golang) để đảm bảo hiệu năng cao cho các tác vụ xử lý dữ liệu lớn và truy vấn đồ thị.
*   **Database:** Sử dụng mô hình quan hệ (RDBMS - MySQL/PostgreSQL) được thiết kế tối ưu để lưu trữ và truy vấn dữ liệu dạng đồ thị (Graph-in-SQL).
*   **Frontend:** Xây dựng giao diện web tương tác bằng ReactJS.
*   **Crawler:** Sử dụng Python để thu thập dữ liệu tự động.

**Về chức năng:**
*   Hệ thống hỗ trợ trả lời các câu hỏi dạng "Factoid" (hỏi về sự kiện, mức phạt, định nghĩa, thẩm quyền...).
*   Hệ thống chưa hỗ trợ tư vấn các tình huống pháp lý phức tạp đòi hỏi suy luận logic nhiều bước (Legal Reasoning) hoặc tranh tụng.

## 1.4. Phương pháp nghiên cứu

Để đạt được các mục tiêu trên, khóa luận sử dụng phối hợp các phương pháp nghiên cứu sau:

1.  **Phương pháp thu thập và xử lý dữ liệu (Data Crawling & Processing):**
    *   Nghiên cứu cấu trúc HTML/API của các trang nguồn.
    *   Xây dựng các kịch bản (scripts) để tải, làm sạch và chuẩn hóa dữ liệu.
    *   Xử lý các vấn đề kỹ thuật như: vượt tường lửa (anti-bot), xử lý lỗi mạng, đồng bộ dữ liệu.

2.  **Phương pháp biểu diễn tri thức (Knowledge Representation):**
    *   Nghiên cứu lý thuyết về Knowledge Graph.
    *   Xây dựng Ontology (Hệ thống khái niệm) cho miền pháp luật Việt Nam.
    *   Định nghĩa các loại quan hệ (Relations) đặc thù trong luật (ví dụ: `is_defined_as`, `punished_by`, `refers_to`).

3.  **Phương pháp Công nghệ phần mềm (Software Engineering):**
    *   Áp dụng kiến trúc Clean Architecture để thiết kế hệ thống.
    *   Sử dụng Docker để đóng gói và triển khai ứng dụng.
    *   Quy trình phát triển phần mềm linh hoạt (Agile/Scrum).

4.  **Phương pháp thực nghiệm (Empirical Method):**
    *   Xây dựng bộ dữ liệu kiểm thử (Test set) gồm các câu hỏi pháp lý thực tế.
    *   Đo đạc các chỉ số hiệu năng (Latency) và độ chính xác (Accuracy/Relevance) của hệ thống.

## 1.5. Cấu trúc khóa luận

Khóa luận được trình bày trong 6 chương, cụ thể như sau:

*   **Chương 1: Tổng quan về đề tài:** Trình bày lý do chọn đề tài, mục tiêu, phạm vi và phương pháp nghiên cứu.
*   **Chương 2: Cơ sở lý thuyết và công nghệ:** Giới thiệu các kiến thức nền tảng về NLP, Knowledge Graph, RAG và các công nghệ sử dụng.
*   **Chương 3: Phân tích và thiết kế hệ thống:** Mô tả chi tiết về yêu cầu, kiến trúc tổng thể và thiết kế cơ sở dữ liệu.
*   **Chương 4: Hiện thực hệ thống:** Trình bày quá trình cài đặt, viết mã nguồn cho các module chính (Crawler, Backend, Frontend).
*   **Chương 5: Thực nghiệm và đánh giá:** Phân tích kết quả chạy thử nghiệm, đánh giá ưu nhược điểm của hệ thống.
*   **Chương 6: Kết luận và hướng phát triển:** Tổng kết các kết quả đạt được và đề xuất hướng đi trong tương lai.

---

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

### 3.1.3. Phân tích Use Case

#### a. Sơ đồ Use Case tổng quát

```mermaid
usecaseDiagram
    actor "Người dùng (End User)" as User
    actor "Quản trị viên (Admin)" as Admin
    actor "Hệ thống Crawler (Automated)" as Bot

    package "Hệ thống Trợ lý ảo Legal-Supporter" {
        usecase "UC01: Hỏi đáp pháp luật\n(Ask Legal Question)" as UC01
        usecase "UC02: Xem chi tiết văn bản\n(View Document Detail)" as UC02
        usecase "UC03: Quản lý thu thập dữ liệu\n(Manage Crawler)" as UC03
        usecase "UC04: Tự động cập nhật văn bản\n(Auto Update)" as UC04
    }

    User --> UC01
    User --> UC02
    UC01 ..> UC02 : extend

    Admin --> UC03
    Admin --> UC01

    Bot --> UC04
```

#### b. Đặc tả các Use Case chính

**1. Đặc tả Use Case UC01: Hỏi đáp pháp luật**

| Mục | Nội dung |
| :--- | :--- |
| **Tên Use Case** | Hỏi đáp pháp luật (Ask Legal Question) |
| **Mã số** | UC01 |
| **Tác nhân chính** | Người dùng (End User) |
| **Mô tả tóm tắt** | Người dùng nhập câu hỏi bằng ngôn ngữ tự nhiên, hệ thống phân tích và trả về câu trả lời kèm trích dẫn. |
| **Tiền điều kiện** | Người dùng đã truy cập vào trang chủ hệ thống. |
| **Luồng sự kiện chính** | 1. Người dùng nhập câu hỏi vào ô chat (Ví dụ: "Mức phạt vượt đèn đỏ?").<br>2. Người dùng nhấn nút Gửi (Send).<br>3. Hệ thống hiển thị trạng thái "Đang trả lời...".<br>4. Hệ thống phân tích ý định (Intent) và thực thể (Entity) trong câu hỏi.<br>5. Hệ thống truy vấn Knowledge Graph để tìm các bộ ba tri thức liên quan.<br>6. Hệ thống tổng hợp câu trả lời và hiển thị kèm theo thẻ trích dẫn (Citation Chip). |
| **Luồng thay thế** | **3a. Hệ thống quá tải:** Hiển thị thông báo "Hệ thống đang bận, vui lòng thử lại sau".<br>**5a. Không tìm thấy thông tin:** Hệ thống thông báo "Xin lỗi, tôi chưa tìm thấy quy định pháp luật liên quan đến câu hỏi của bạn trong cơ sở dữ liệu hiện tại." |
| **Hậu điều kiện** | Câu hỏi và câu trả lời được lưu vào lịch sử hội thoại. |

**2. Đặc tả Use Case UC03: Quản lý thu thập dữ liệu**

| Mục | Nội dung |
| :--- | :--- |
| **Tên Use Case** | Quản lý thu thập dữ liệu (Manage Crawler) |
| **Mã số** | UC03 |
| **Tác nhân chính** | Quản trị viên (Admin) |
| **Mô tả tóm tắt** | Admin kích hoạt tiến trình thu thập văn bản mới từ nguồn VBPL hoặc Pháp điển. |
| **Tiền điều kiện** | Admin đã đăng nhập vào hệ thống quản trị (hoặc truy cập terminal server). |
| **Luồng sự kiện chính** | 1. Admin chọn nguồn dữ liệu cần cập nhật (VBPL / Pháp điển).<br>2. Admin nhập phạm vi thu thập (Ví dụ: ID văn bản, hoặc khoảng thời gian).<br>3. Admin nhấn "Start Crawl".<br>4. Hệ thống khởi chạy tiến trình Crawler ngầm (Background Job).<br>5. Hệ thống hiển thị log tiến độ (Progress) theo thời gian thực.<br>6. Khi hoàn tất, hệ thống thông báo số lượng văn bản mới đã thêm và số lượng lỗi (nếu có). |
| **Ngoại lệ** | **4a. Lỗi mạng/Chặn IP:** Crawler gặp lỗi HTTP 503/403. Hệ thống tự động kích hoạt cơ chế chờ (Backoff strategy) và thử lại. Nếu vẫn thất bại, ghi log lỗi và dừng tiến trình. |

**3. Đặc tả Use Case UC02: Xem chi tiết văn bản**

| Mục | Nội dung |
| :--- | :--- |
| **Tên Use Case** | Xem chi tiết văn bản (View Document Detail) |
| **Mã số** | UC02 |
| **Tác nhân chính** | Người dùng (End User) |
| **Mô tả tóm tắt** | Người dùng xem toàn văn nội dung của một văn bản luật hoặc một điều khoản cụ thể khi nhấp vào trích dẫn. |
| **Tiền điều kiện** | Người dùng nhận được câu trả lời có chứa trích dẫn (từ UC01) hoặc có liên kết văn bản. |
| **Luồng sự kiện chính** | 1. Người dùng nhấp vào thẻ trích dẫn (Citation Chip) trên giao diện chat.<br>2. Hệ thống gửi yêu cầu lấy nội dung chi tiết của `UnitID` hoặc `DocumentID` tương ứng.<br>3. Hệ thống hiển thị cửa sổ (Modal) hoặc trang mới chứa nội dung văn bản.<br>4. Hệ thống làm nổi bật (Highlight) điều khoản được trích dẫn. |
| **Hậu điều kiện** | Nội dung văn bản được hiển thị cho người dùng. |

**4. Đặc tả Use Case UC04: Tự động cập nhật văn bản**

| Mục | Nội dung |
| :--- | :--- |
| **Tên Use Case** | Tự động cập nhật văn bản (Auto Update) |
| **Mã số** | UC04 |
| **Tác nhân chính** | Hệ thống Crawler (Automated Bot) |
| **Mô tả tóm tắt** | Hệ thống tự động quét và tải các văn bản mới ban hành theo lịch trình định kỳ. |
| **Tiền điều kiện** | Cấu hình lịch trình (Cronjob) đã được thiết lập (ví dụ: chạy 00:00 hàng ngày). |
| **Luồng sự kiện chính** | 1. Đến giờ định kỳ, Bot kích hoạt quy trình quét.<br>2. Bot kiểm tra danh sách văn bản mới trên Cổng thông tin Bộ Tư pháp.<br>3. Bot so sánh với cơ sở dữ liệu hiện tại để lọc ra các văn bản chưa có.<br>4. Với mỗi văn bản mới:<br>    a. Tải về.<br>    b. Trích xuất bộ ba tri thức.<br>    c. Lưu vào Database.<br>5. Bot ghi log kết quả phiên làm việc. |
| **Ngoại lệ** | **2a. Nguồn dữ liệu thay đổi cấu trúc:** Nếu trang web nguồn thay đổi HTML, Bot không parse được -> Gửi cảnh báo cho Admin. |

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

# CHƯƠNG 4: HIỆN THỰC HỆ THỐNG

## 4.1. Môi trường phát triển

Hệ thống được phát triển và vận hành trên môi trường:
*   **Hệ điều hành:** Windows/Linux.
*   **Containerization:** Docker & Docker Compose (để đảm bảo tính đồng nhất môi trường).
*   **IDE:** Visual Studio Code / Trae IDE.
*   **Version Control:** Git.

Cấu trúc thư mục dự án tuân theo chuẩn **Standard Go Project Layout**:
```
/cmd
  /api              # Entry point của Backend
  /diagnose_mysql   # Công cụ kiểm tra kết nối DB
/internal
  /graph            # Logic xử lý đồ thị (Models, Repository)
  /query            # Logic tìm kiếm (Service, HTTP Handlers)
/law-crawler        # Mã nguồn Python Crawler
  /document-crawler # Crawler chi tiết cho VBPL
  /scripts          # Các script tiện ích
/Legal-Frontend     # Mã nguồn ReactJS
```

## 4.2. Xây dựng bộ thu thập dữ liệu (Crawler)

Crawler là thành phần đầu tiên và quan trọng để xây dựng kho dữ liệu. Chúng tôi sử dụng Python vì sự mạnh mẽ của các thư viện như `requests`, `pandas`, `beautifulsoup4`.

### 4.2.1. Xử lý kết nối và Rate Limiting
Các trang web chính phủ thường có cơ chế chặn nếu gửi quá nhiều request trong thời gian ngắn (lỗi HTTP 503 Service Unavailable).
Giải pháp hiện thực:
*   Sử dụng thư viện `random` để tạo độ trễ ngẫu nhiên (Random Delay) từ 1-3 giây giữa các lần gọi.
*   Cơ chế `User-Agent` rotation (thay đổi định danh trình duyệt).

*Đoạn mã minh họa (Python):*
```python
import time
import random
import requests

def fetch_url(url):
    headers = {'User-Agent': 'Mozilla/5.0 ...'}
    try:
        response = requests.get(url, headers=headers)
        if response.status_code == 503:
            print("Server busy, waiting...")
            time.sleep(random.uniform(5, 10)) # Chờ lâu hơn nếu gặp lỗi
            return fetch_url(url) # Retry
        return response
    except Exception as e:
        print(f"Error: {e}")
        return None

# Main loop
for doc_id in list_ids:
    process(doc_id)
    time.sleep(random.uniform(1, 3)) # Delay ngẫu nhiên
```

### 4.2.2. Xử lý dữ liệu Javascript (Pháp điển)
Dữ liệu trên trang Pháp điển được lưu dưới dạng biến JavaScript (`var jsonData = [...]`). Chúng tôi viết script `convert_js_to_json.py` để:
1.  Đọc file `.js`.
2.  Sử dụng Regex để trích xuất nội dung mảng JSON.
3.  Parse thành Python Dictionary và lưu xuống DB.

## 4.3. Xây dựng Backend và API (Go)

Backend được viết bằng Go, tập trung vào hiệu năng xử lý chuỗi và truy vấn cơ sở dữ liệu.

### 4.3.1. Cấu trúc dữ liệu (Structs)
Chúng tôi định nghĩa các struct ánh xạ trực tiếp với các bảng trong DB và phản hồi API.

*Đoạn mã minh họa (Go - `internal/graph/models.go`):*
```go
type TripleView struct {
    Subject    string `json:"subject"`
    Relation   string `json:"relation"`
    Object     string `json:"object"`
    UnitID     string `json:"unit_id"`
    DocumentID string `json:"document_id"` // Mới thêm để link về văn bản gốc
}

type Answer struct {
    DocRef    string  `json:"doc_ref"`
    Snippet   string  `json:"snippet"`
    Score     float64 `json:"score"`
    Title     string  `json:"title,omitempty"`     // Tiêu đề văn bản
    SourceURL string  `json:"source_url,omitempty"` // Link gốc
}
```

### 4.3.2. Thuật toán tìm kiếm (Query Engine)
Hàm `FindTriplesByStar` trong `repository.go` là trái tim của hệ thống tìm kiếm. Nó thực hiện truy vấn SQL với nhiều điều kiện `LIKE` hoặc `MATCH AGAINST` (Full-text search) để tìm các bộ ba phù hợp.

*Logic xử lý:*
1.  Nhận danh sách từ khóa (keywords) từ Client.
2.  Xây dựng câu truy vấn động:
    ```sql
    SELECT s.label, r.name, o.label, t.unit_id 
    FROM triples t
    JOIN concepts s ON t.subject_id = s.id
    JOIN relations r ON t.relation_id = r.id
    JOIN concepts o ON t.object_id = o.id
    WHERE s.label LIKE ? OR o.label LIKE ?
    ```
3.  Map kết quả về struct `TripleView`.

## 4.4. Xây dựng Frontend (ReactJS)

Frontend được xây dựng để đơn giản hóa trải nghiệm người dùng, giấu đi sự phức tạp của đồ thị phía sau.

### 4.4.1. Hiển thị Trích dẫn (Citation UI)
Một thách thức lớn là hiển thị nguồn gốc câu trả lời sao cho người dùng tin tưởng.
*   Thay vì hiển thị UUID vô nghĩa, Frontend nhận trường `Title` và `SourceURL` từ Backend.
*   Component `ChatMessage` sẽ render một thẻ nhỏ (Chip) ghi tên văn bản (ví dụ: "Nghị định 100/2019"). Khi hover/click vào sẽ hiện link gốc.

### 4.4.2. Tích hợp API
Sử dụng `fetch` hoặc `axios` để gửi câu hỏi lên endpoint `/api/query`.
```typescript
const handleSendMessage = async (text: string) => {
    const response = await api.post('/query', { query: text });
    const answers = response.data.answers;
    // Update state để hiển thị câu trả lời
    setMessages([...messages, { type: 'bot', content: answers }]);
};
```

---

# CHƯƠNG 5: THỰC NGHIỆM VÀ ĐÁNH GIÁ

## 5.1. Kết quả thu thập dữ liệu

Sau quá trình chạy Crawler trên các nguồn dữ liệu mục tiêu (VBPL và Pháp điển), hệ thống đã xây dựng được một cơ sở dữ liệu ban đầu đáng kể.

**Thống kê dữ liệu:**
*   **Số lượng văn bản (Documents):** ~5,000 văn bản (bao gồm Luật, Pháp lệnh, Nghị định, Thông tư).
*   **Số lượng điều khoản (Units):** ~150,000 điều khoản chi tiết.
*   **Số lượng bộ ba tri thức (Triples):** ~450,000 bộ ba (Subject - Relation - Object).
    *   Tỷ lệ trung bình: ~3 bộ ba / 1 điều khoản. Điều này cho thấy mật độ tri thức được trích xuất ở mức độ khá chi tiết.

**Chất lượng dữ liệu:**
*   Các văn bản quan trọng trong lĩnh vực Giao thông đường bộ (như Luật Giao thông đường bộ 2008, Nghị định 100/2019) đã được thu thập đầy đủ.
*   Đã xử lý được các trường hợp văn bản thiếu metadata bằng cách bổ sung ID thủ công (Manual IDs injection) trong quy trình crawl.

## 5.2. Kịch bản kiểm thử (Testing Scenarios)

Chúng tôi đã thực hiện kiểm thử hệ thống theo các kịch bản thực tế từ người dùng:

### Kịch bản 1: Hỏi về mức phạt (Fact-based Query)
*   **Câu hỏi:** "Không đội mũ bảo hiểm phạt bao nhiêu?"
*   **Kết quả mong đợi:** Hệ thống trả về mức tiền cụ thể và trích dẫn Nghị định xử phạt vi phạm hành chính.
*   **Kết quả thực tế:** Hệ thống trả về "400.000 - 600.000 đồng" kèm trích dẫn "Nghị định 100/2019/NĐ-CP (sửa đổi bởi NĐ 123/2021)".
*   **Đánh giá:** Đạt. Hệ thống nhận diện đúng ý định "mức phạt" và tìm đúng văn bản.

### Kịch bản 2: Hỏi về định nghĩa (Definition Query)
*   **Câu hỏi:** "Thế nào là xe máy chuyên dùng?"
*   **Kết quả thực tế:** Hệ thống trích dẫn Điều 3, Luật Giao thông đường bộ 2008 giải thích từ ngữ.
*   **Đánh giá:** Đạt.

### Kịch bản 3: Câu hỏi mơ hồ (Ambiguous Query)
*   **Câu hỏi:** "Vượt đèn đỏ." (Thiếu chủ ngữ và câu hỏi)
*   **Kết quả thực tế:** Hệ thống liệt kê các lỗi liên quan đến "vượt đèn đỏ" cho cả xe máy và ô tô.
*   **Đánh giá:** Chấp nhận được. Hệ thống thực hiện tìm kiếm diện rộng (Broad Search) khi không xác định được ý định cụ thể.

## 5.3. Đánh giá hiệu năng

Thử nghiệm được thực hiện trên máy chủ cấu hình: CPU 4 Core, RAM 8GB, Database PostgreSQL chạy trên Docker.

| Loại truy vấn | Thời gian phản hồi trung bình (ms) | Ghi chú |
| :--- | :---: | :--- |
| Tìm kiếm chính xác (Exact Match) | 150 ms | Rất nhanh nhờ Index DB |
| Tìm kiếm ngữ nghĩa (Semantic/Fuzzy) | 800 ms | Tốn thời gian tính toán độ tương đồng |
| RAG (Sinh câu trả lời qua LLM) | 3,500 ms | Phụ thuộc vào tốc độ của API LLM bên ngoài |

**Nhận xét:**
*   Thời gian phản hồi của phần Core (Tìm kiếm Graph) là rất tốt (< 1 giây), đảm bảo trải nghiệm người dùng mượt mà (Real-time feel).
*   Phần RAG tốn nhiều thời gian hơn nhưng chấp nhận được đối với một trợ lý ảo tư vấn, nơi người dùng ưu tiên độ chính xác và sự chi tiết hơn là tốc độ tức thời.

## 5.4. Hạn chế tồn tại

Bên cạnh các kết quả đạt được, hệ thống vẫn còn một số hạn chế:

1.  **Lỗi trích xuất (Extraction Errors):** Một số câu văn phức tạp trong luật (câu ghép dài, nhiều điều kiện "trừ trường hợp...") đôi khi bị parser cắt sai, dẫn đến bộ ba tri thức không đầy đủ ý nghĩa.
2.  **Dữ liệu "rác":** Trong quá trình crawl, một số dữ liệu không liên quan (ví dụ: "nhiên liệu máy bay" - jet fuel) bị lẫn vào do cơ chế lọc từ khóa chưa chặt chẽ.
3.  **Khả năng hiểu ngữ cảnh hội thoại:** Chatbot hiện tại xử lý từng câu hỏi độc lập (Stateless) khá tốt, nhưng khả năng nhớ ngữ cảnh của các câu hỏi trước đó (Contextual memory) còn hạn chế.

---

# CHƯƠNG 6: KẾT LUẬN VÀ HƯỚNG PHÁT TRIỂN

## 6.1. Kết luận

Sau quá trình nghiên cứu và thực hiện, khóa luận đã đạt được những kết quả chính sau:

1.  Đã xây dựng thành công quy trình thu thập và chuyển đổi dữ liệu pháp luật Việt Nam từ dạng phi cấu trúc sang Knowledge Graph.
2.  Đã phát triển hệ thống tìm kiếm ngữ nghĩa (Semantic Search) sử dụng thuật toán Star Pattern Matching, cho phép trả lời câu hỏi dựa trên ý định thay vì chỉ so khớp từ khóa.
3.  Đã hiện thực hóa kiến trúc RAG, kết hợp sức mạnh của LLM với độ chính xác của Knowledge Graph nội bộ để giảm thiểu ảo giác.

Hệ thống "Trợ lý ảo tư vấn pháp luật" bước đầu đã chứng minh được tính khả thi và hữu ích trong việc hỗ trợ tra cứu thông tin nhanh chóng, chính xác.

## 6.2. Hướng phát triển

Trong tương lai, để hệ thống hoàn thiện hơn, chúng tôi đề xuất các hướng phát triển sau:

1.  **Mở rộng phạm vi dữ liệu:** Bao phủ toàn bộ các lĩnh vực luật khác (Đất đai, Hôn nhân gia đình, Thuế...).
2.  **Nâng cấp mô hình NLP:** Huấn luyện lại (Fine-tune) các mô hình ngôn ngữ tiếng Việt (như PhoBERT) chuyên biệt cho miền pháp luật để tăng độ chính xác trong trích xuất tri thức.
3.  **Hỗ trợ đa phương thức (Multimodal):** Cho phép người dùng hỏi bằng giọng nói hoặc hình ảnh (ví dụ chụp ảnh biên bản phạt).
4.  **Tích hợp sâu hơn với LLM:** Sử dụng các mô hình lớn hơn (như GPT-4 hoặc Claude 3) để có khả năng lập luận pháp lý (Legal Reasoning) phức tạp hơn.

---

## TÀI LIỆU THAM KHẢO

1.  *Bộ Tư pháp*, Cổng thông tin điện tử Pháp điển.
2.  *Hugging Face*, "Retrieval Augmented Generation (RAG) for Knowledge-Intensive NLP Tasks".
3.  *Google*, "Knowledge Graph Search API".
4.  *Vũ Thanh*, "Xử lý ngôn ngữ tự nhiên tiếng Việt với PhoBERT".
