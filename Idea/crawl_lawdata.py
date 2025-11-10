from requests_html import HTMLSession
import pandas as pd
import time

session = HTMLSession()

BASE_URL = "https://thuvienphapluat.vn"
SEARCH_URL = "https://thuvienphapluat.vn/hoi-dap-phap-luat/tim-tu-van"
QUERY = "tử hình"
PAGES = 3

data = []

for page in range(1, PAGES + 1):
    print(f"🔍 Đang cào trang {page}...")
    params = {"searchType": "1", "q": QUERY, "page": page}
    r = session.get(SEARCH_URL, params=params)
    r.html.render(timeout=30)  # render JavaScript

    questions = r.html.find(".item-hoi-dap")
    if not questions:
        print("⚠️ Không thấy kết quả, dừng lại.")
        break

    for q in questions:
        title_el = q.find(".title a", first=True)
        question = title_el.text if title_el else ""
        link = BASE_URL + title_el.attrs["href"] if title_el else ""

        answer_el = q.find(".short-content", first=True)
        answer = answer_el.text if answer_el else ""

        date_el = q.find(".time", first=True)
        date = date_el.text if date_el else ""

        data.append({
            "question": question,
            "answer": answer,
            "url": link,
            "date": date
        })

        time.sleep(1)

df = pd.DataFrame(data)
df.to_csv("thuvienphapluat_tuhinh.csv", index=False, encoding="utf-8-sig")

print(f"✅ Đã lưu {len(df)} dòng vào file 'thuvienphapluat_tuhinh.csv'")
