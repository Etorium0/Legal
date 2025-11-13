HƯỚNG DẪN CHẠY TOÀN BỘ QUY TRÌNH SCRAPE & TÓM TẮT NỘI DUNG
========================================================

1. CÀI ĐẶT PYTHON VÀ CÁC THƯ VIỆN CẦN THIẾT
--------------------------------------------
- Đảm bảo đã cài Python >= 3.8 và pip.
- Cài các thư viện:
  
  py -m pip install -r requirements.txt
  py -m pip install openpyxl google-generativeai

2. SCRAPE DỮ LIỆU TỪ THUVIENPHAPLUAT.VN
----------------------------------------
- Chạy script để lấy dữ liệu, ví dụ:

  py scrape_thuvienphapluat_fixed.py --query "tử hình" --max-pages 1 --out ket_qua_tim_kiem_tu_hinh.xlsx

- File Excel kết quả sẽ được tạo (ví dụ: ket_qua_tim_kiem_tu_hinh.xlsx)

3. TÓM TẮT NỘI DUNG BẰNG GEMINI API
-----------------------------------
- Đăng ký và lấy API Key Gemini tại: https://aistudio.google.com/app/apikey
- Chạy script tóm tắt:

  py extract_and_summarize_gemini.py --excel ket_qua_tim_kiem_tu_hinh.xlsx --api-key <YOUR_GEMINI_API_KEY>

- File kết quả sẽ có thêm cột *_tomtat* chứa nội dung đã rút gọn, dễ hiểu.

4. LƯU Ý
--------
- Nếu gặp lỗi thiếu thư viện, hãy cài đặt đúng tên thư viện như hướng dẫn trên.
- Có thể thay đổi tên file đầu vào/đầu ra và cột cần tóm tắt bằng các tham số dòng lệnh.
- Nếu cần tóm tắt cột khác, dùng tham số --column <ten_cot>.

Mọi thắc mắc vui lòng liên hệ người phát triển script.


5. TRÍCH XUẤT BỘ BA (S, V, O) TỪ PDF LUẬT
-----------------------------------------
- Script: package_thuvienphapluat/extract_action_triples.py
- Yêu cầu thêm thư viện PyPDF2 (đã nằm trong requirements.txt)

Ví dụ chạy (Windows PowerShell):

  py package_thuvienphapluat/extract_action_triples.py --pdf Idea/LuatHS.pdf --start 1 --end 10 --output Idea/triples_p1_10.json --debug --hybrid

Tham số chính:
- --pdf: Đường dẫn PDF đầu vào
- --start/--end: Trang bắt đầu/kết thúc (>=1)
- --output: File JSON hoặc .jsonl (dùng thêm --jsonl để ghi dạng JSON Lines)
- --hybrid: Kết hợp cả VNCoreNLP và Regex để tăng độ phủ (mặc định sẽ tự kết hợp nếu VNCoreNLP có sẵn)
- --aggressive: Bùng nổ danh sách (a)/1/; và xuống dòng) để tăng số triple
- --pdfminer: Dùng pdfminer.six cho PDF scan/khó trích xuất text
- --vncorenlp-dir: Thư mục chứa VnCoreNLP jar + models (nếu muốn bật phân tích phụ thuộc)

Ghi chú:
- Tài liệu lớn (>200k ký tự) sẽ tự bật chế độ aggressive splitting để tối đa số triple.
- Kết quả thường cao hơn nhờ gộp kết quả VNCoreNLP và Regex, sau đó khử trùng.
