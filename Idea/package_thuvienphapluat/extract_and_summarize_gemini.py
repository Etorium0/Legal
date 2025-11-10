import pandas as pd
import os
import sys
from typing import List

# Yêu cầu: pip install google-generativeai openpyxl pandas
import google.generativeai as genai

def load_excel(file_path: str) -> pd.DataFrame:
    return pd.read_excel(file_path)

def summarize_texts(texts: List[str], api_key: str, model: str = "gemini-2.5-flash") -> List[str]:
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel(model)
    summaries = []
    for text in texts:
        prompt = (
            "Tóm tắt văn bản sau thành 2-3 câu ngắn gọn, súc tích, chỉ giữ lại thông tin quan trọng nhất. "
            "Bỏ qua chi tiết phụ, ví dụ minh họa. Viết theo cấu trúc: Vấn đề chính + Quy định pháp luật + Hậu quả/Hình phạt (nếu có):\n\n" + text
        )
        try:
            response = model.generate_content(prompt)
            summaries.append(response.text.strip())
        except Exception as e:
            summaries.append(f"[Lỗi tóm tắt]: {e}")
    return summaries

def main():
    import argparse
    parser = argparse.ArgumentParser(description="Tóm tắt nội dung từ file Excel bằng Gemini API.")
    parser.add_argument("--excel", required=True, help="Đường dẫn file Excel đầu vào")
    parser.add_argument("--api-key", required=True, help="Google Gemini API Key")
    parser.add_argument("--column", default="noi_dung_chi_tiet", help="Tên cột cần tóm tắt")
    parser.add_argument("--out", default="summarized.xlsx", help="File Excel đầu ra")
    args = parser.parse_args()

    df = load_excel(args.excel)
    if args.column not in df.columns:
        print(f"Không tìm thấy cột '{args.column}' trong file Excel.")
        sys.exit(1)

    print(f"Đang tóm tắt {len(df)} dòng...")
    summaries = summarize_texts(df[args.column].astype(str).tolist(), args.api_key)
    df[args.column + "_tomtat"] = summaries
    df.to_excel(args.out, index=False)
    print(f"Đã lưu kết quả vào {args.out}")

if __name__ == "__main__":
    main()
