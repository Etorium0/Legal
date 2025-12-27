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
*Hết Chương 1*
