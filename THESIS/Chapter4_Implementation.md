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
*Hết Chương 4*
