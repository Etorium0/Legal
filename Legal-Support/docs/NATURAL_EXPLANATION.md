# Giải Thích Tự Nhiên Dễ Thuyết Trình

Tài liệu này dùng để bạn trình bày trước giảng viên / hội đồng dưới dạng lời nói tự nhiên, ít thuật ngữ. Có thể chuyển nguyên khối sang slide.

---
## 1. Hệ thống của em là gì?
Em xây một "trợ lý pháp luật" phía backend. Nó nhận văn bản pháp luật, bẻ nhỏ thành các mảnh (Điều, Khoản...), nhận diện các khái niệm quan trọng (vd: mũ bảo hiểm, xe mô tô) và quan hệ giữa chúng (vd: phải đội, bị phạt). Khi người dùng hỏi một câu tự nhiên, hệ thống cố gắng hiểu và tìm ra đoạn luật phù hợp rồi trích dẫn rõ ràng.

**Một câu tóm tắt:** Nhập luật → Biến thành tri thức có cấu trúc → Hỏi tự nhiên → Trả câu trả lời có trích dẫn.

---
## 2. Khi "nhập" một văn bản thì diễn ra gì?
1. Gửi JSON chứa thông tin văn bản + danh sách Điều/Khoản.
2. Lưu văn bản → tạo ID.
3. Lưu từng Điều/Khoản, ghi nhớ mối quan hệ cha–con (Điều chứa Khoản...).
4. Tạo hoặc mở rộng các khái niệm (concept) và từ đồng nghĩa (synonym) nếu có.
5. Gắn quan hệ đơn giản (nếu phát hiện) và tạo bộ ba tri thức: Chủ thể – Quan hệ – Đối tượng.
6. Trả về thống kê: đã tạo bao nhiêu đơn vị, khái niệm, quan hệ, bộ ba.

**Ví dụ:** "Nghị định 100" + Điều 6 → khái niệm: "mũ bảo hiểm", "xe mô tô" → triple: (người điều khiển xe – phải đội – mũ bảo hiểm).

---
## 3. Khi người dùng hỏi thì hệ thống làm gì?
Ví dụ câu hỏi: "mức phạt không đội mũ bảo hiểm khi đi xe máy".
1. Làm sạch câu (chữ thường, bỏ từ vô nghĩa).
2. Giữ lại các từ chính: "phạt", "mũ bảo hiểm", "xe máy".
3. Dò synonyms: "xe máy" ↔ "xe mô tô", "mũ bảo hiểm" ↔ "helmet".
4. Tạo các mẫu tìm kiếm (pattern) ghép khái niệm làm chủ thể/đối tượng.
5. Tìm trong kho tri thức các bộ ba khớp.
6. Chấm điểm và trả về đoạn luật + trích dẫn.
7. Nếu bật debug: hiển thị từng bước đã làm.

---
## 4. Vì sao không chỉ tìm kiếm bằng chuỗi?
- Dễ bỏ sót từ đồng nghĩa / khác ngôn ngữ.
- Không thấy rõ quan hệ giữa các khái niệm.
- Khó giải thích tại sao trả kết quả đó.
- Không mở rộng tốt sang suy luận hoặc LLM.

Knowledge Graph giúp kết quả có căn cứ: mỗi answer gắn với bộ ba + điều luật gốc.

---
## 5. "Bộ ba tri thức" (Triple) là gì?
Một câu rút gọn chuẩn hóa: **Chủ thể – Quan hệ – Đối tượng**. Ví dụ: "người điều khiển xe" – "phải đội" – "mũ bảo hiểm". Nhờ vậy máy dễ ghép & truy vấn.

---
## 6. Debug để làm gì?
Cho thấy rõ pipeline: từ việc tách từ → tìm khái niệm → tạo mẫu → khớp bộ ba → xếp hạng. Điều này chứng minh hệ thống minh bạch, không phải “hộp đen”.

---
## 7. Giá trị khoa học / kỹ thuật
| Khía cạnh | Giá trị |
|-----------|---------|
| Cấu trúc hoá luật | Dễ truy vấn & mở rộng |
| Giải thích được | Mỗi câu trả lời có nguồn doc_ref |
| Hỗ trợ đa ngôn ngữ | Synonyms Việt – Anh |
| Nền tảng cho LLM | Cho phép RAG giảm sai lệch |
| Mở rộng tương lai | Thêm embedding, ranking nâng cao |

---
## 8. Kế hoạch tích hợp LLM (tuần tới)
1. **Paraphrase query**: tăng độ bao phủ khái niệm.
2. **Tóm tắt kết quả**: gom nhiều snippet thành câu trả lời tự nhiên.
3. **RAG**: LLM chỉ sinh câu trả lời từ context được trích dẫn (giảm hallucination).

---
## 9. Một ví dụ hoàn chỉnh
- Nhập: Nghị định 100 + Điều 6 (vi phạm mũ bảo hiểm).
- Hỏi: "helmet motorcycle".
- Hệ thống map → "mũ bảo hiểm", "xe mô tô" → tìm triple → trả về đoạn phạt tiền.
- Có doc_ref: "Decree 100/2019, Art 6".

---
## 10. Câu nói ngắn gọn khi mở đầu bảo vệ
"Em chuẩn hóa văn bản pháp luật thành các khối tri thức nhỏ (bộ ba). Nhờ vậy khi người dùng hỏi tự nhiên, hệ thống ráp lại tri thức và đưa ra kết quả có trích dẫn rõ ràng." 

---
## 11. Rủi ro & cách xử lý
| Rủi ro | Cách giảm |
|--------|-----------|
| Sai nghĩa khi rút gọn | Luôn lưu nguyên văn + doc_ref |
| Thiếu từ đồng nghĩa | Cập nhật synonyms dần, sau này dùng embedding |
| Hallucination khi thêm LLM | Bắt buộc dẫn nguồn + giới hạn context |

---
## 12. Hướng mở rộng ngắn
- Thêm UI hiển thị graph.
- Xếp hạng cải tiến (BM25 + vector embedding).
- Gắn thời gian văn bản (truy vấn theo từng thời kỳ).
- Tự động trích xuất quan hệ bằng mô hình NLP.

---
## 13. Bản tóm tắt cực ngắn (gắn cuối slide)
"Nhập luật → Bẻ nhỏ → Tạo khái niệm & quan hệ → Lưu triple.
Hỏi tự nhiên → Nhận diện khái niệm → Ghép triple → Trả đoạn luật." 

---
(End)
