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
*Hết Chương 5*
