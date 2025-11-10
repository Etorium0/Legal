# Crawler thuvienphapluat.vn (tử hình)

Script Python dùng Selenium + undetected_chromedriver để cào dữ liệu tư vấn pháp luật cho truy vấn "tử hình".

## Cài đặt

Yêu cầu Python 3.10+.

1. Tạo venv (khuyến nghị) và cài thư viện:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Nếu gặp lỗi driver, đảm bảo Chrome đã cài đặt (phiên bản mới) trên máy.

## Chạy

```powershell
python crawl_thuvienphapluat.py --headless --max-pages 3
```

- Bỏ `--headless` để thấy trình duyệt.
- `--max-pages 0` để cào hết (tùy theo trang còn kết quả/pagination).

Kết quả sẽ lưu vào file `thuvienphapluat_tuhinh.csv` với encoding `utf-8-sig`.

## Ghi chú kỹ thuật

- Script tự cuộn trang và thử chuyển trang nếu có pagination.
- Có log tiến trình và `try/except` bỏ qua lỗi.
- Dùng `WebDriverWait` và `time.sleep` ngẫu nhiên để hạn chế bị chặn.
