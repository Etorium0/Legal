# Law Crawler + Import pipeline

Luồng tối thiểu để lấy dữ liệu Pháp điển/VBQPPL vào Postgres của Legal-Supporter:

1) Bật MySQL cho crawler (đã thêm sẵn trong docker-compose):
   - `docker-compose up -d law-mysql phpmyadmin`
   - MySQL cổng host 3307 (container 3306), DB `law`, user root/123456789.

2) Chạy law-crawler (repo VN-Law-Advisor/law-crawler):
   - `cd ../VN-Law-Advisor/law-crawler`
   - `pip install -r requirements.txt`
   - `docker-compose up -d` (nếu muốn dùng docker-compose của crawler) hoặc dùng service `law-mysql` ở bước 1.
   - Crawl pháp điển: `python main.py`
   - Crawl VBQPPL: `cd document-crawler && pip install -r requirements.txt && python main.py && python split_document.py`
   - Dữ liệu sẽ nằm trong MySQL `law` (tables vbpl, vb_chimuc, ...).

3) Import vào Postgres (pgvector) của Legal-Supporter:
   - Từ repo Legal-Supporter: `MYSQL_DSN="root:123456789@tcp(localhost:3307)/law?parseTime=true&charset=utf8mb4" go run cmd/import-vbpl/main.go`
   - Hoặc import pháp điển MySQL khác (nếu có) bằng `cmd/import-phapdien/main.go` (DSN tương tự, bảng phap_dien_*).

4) Khởi chạy các service chính:
   - `docker-compose up -d --build postgres api recommendation auth law gateway`

Ghi chú:
- Nếu chạy import từ trong container mạng compose, dùng DSN `root:123456789@tcp(law-mysql:3306)/law?parseTime=true&charset=utf8mb4`.
- phpMyAdmin: http://localhost:8085 (host), server `law-mysql`, user root/123456789.
- Các tham số DSN có thể override qua biến môi trường `MYSQL_DSN` khi chạy importer.
