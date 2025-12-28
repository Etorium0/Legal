# 3.2–3.3: Kết nối LLM với Cơ Sở Tri Thức (CSTT) và ví dụ SOMET

Tài liệu này viết lại hai mục cốt lõi theo ngôn ngữ tự nhiên, kèm mã giả và ví dụ minh họa trên dự án Legal‑Supporter.

---
## 3.2 Kết nối LLM vào CSTT (thuần ngôn ngữ tự nhiên + mã giả)

Mục tiêu: nhờ LLM “giúp hỏi cho đúng” và “nói lại cho dễ hiểu”, nhưng không để LLM bịa. Vì vậy, LLM chỉ xuất hiện ở hai điểm an toàn:

1) Trước khi tìm (Assist): LLM giúp rút gọn và chuẩn hoá câu hỏi, gợi ý vài từ đồng nghĩa phổ biến, xác định “ý định” (ví dụ hỏi mức phạt hay hỏi điều kiện). Kết quả là một gói dữ liệu có cấu trúc để máy đi tìm triple chính xác hơn. Lúc này LLM không trả lời, chỉ giúp đặt câu hỏi.

2) Sau khi tìm (RAG có kiểm chứng): từ các triple/đoạn luật đã lấy được kèm trích dẫn (doc_ref), LLM viết lại câu trả lời dễ hiểu. Nếu phần trả lời thiếu trích dẫn hoặc mâu thuẫn với nguồn, coi là lỗi và rơi về câu trả lời mẫu không dùng LLM.

Ngoài ra, ở chế độ ngoại tuyến, LLM có thể “gợi ý” tri thức mới (trích mối quan hệ từ văn bản). Nhưng mọi gợi ý đều phải qua con người duyệt trước khi nhập chính thức.

Nguyên tắc bảo vệ:
- Luôn kèm trích dẫn doc_ref khi sinh câu trả lời.
- LLM chỉ được dùng phần context đã trích; không suy diễn ngoài nguồn.
- Ghi log: câu hỏi gốc, biến thể, mapping khái niệm, context, câu trả lời.
- Có fallback: khi LLM lỗi/hết thời gian, trả lời theo luồng không‑LLM.

Mã giả tóm lược luồng xử lý

```pseudo
Thuật toán: Trích rút Bộ Ba 

Input:  raw_text  # câu hoặc đoạn tiếng Việt
Output: list_triplets = danh sách (Subject, Relation, Object)

text    ← preprocess(raw_text)              # chuẩn hoá, tách câu, lower, bỏ ký tự nhiễu
tokens  ← annotate(text)                    # mỗi token có: posTag, depLabel, head, lemma, text
triples ← []                                # mỗi phần tử: {S: null, R: null, O: null, head: idx}

for each token t in tokens do
   if t.posTag is Verb then
      # tạo khung triple với động từ làm quan hệ (R)
      triples.append({S: null, R: t.lemma, O: null, head: t.index})
   end if

   if t.posTag is Noun or ProperNoun then
      # gán danh từ vào S hoặc O tuỳ nhãn quan hệ phụ thuộc
      tri ← find_by_head(triples, t.head)          # tìm triple có head là động từ chi phối token
      if tri ≠ null then
         if t.depLabel in {nsubj, subj, SBJ} then
            tri.S ← collect_phrase(tokens, t)     # gom cụm danh từ nếu có (mũ bảo hiểm đạt chuẩn)
         end if
         if t.depLabel in {dobj, obj, OBJ} then
            tri.O ← collect_phrase(tokens, t)
         end if
      end if
   end if

   if t.posTag is Conjunction then
      # xử lý phép nối A và B: nhân bản triple theo cụm được nối
      main ← find_main_of_conj(tokens, t)
      base ← find_triple_attached_to(triples, main)
      if base ≠ null then
         new_tri ← clone(base)
         # tùy vào liên kết, thay S hoặc O bằng cụm ở vế sau liên từ
         new_tri ← replace_conj_slot(new_tri, tokens, t)
         triples.append(new_tri)
      end if
   end if
end for

# dọn dẹp: bỏ triple thiếu cả S và O; gộp multiword; loại trùng
triples ← normalize_and_dedup(triples)
return triples
```

---
## 3.3 Phương pháp kết hợp LLM để truy vấn

Chúng ta kết hợp LLM theo hai nhánh: (A) tóm tắt trọng tâm câu hỏi để chuẩn hoá đầu vào (SOMET); (B) RAG có kiểm chứng để viết lại câu trả lời dựa trên nguồn đã trích.

### A. Rút trích nội dung chính câu hỏi (SOMET)

SOMET là quy trình Summarize → Orient → Match → Expand → Template giúp biến câu hỏi tự do thành một “khung truy vấn” máy hiểu được:

- Summarize (Tóm tắt): rút gọn câu hỏi thành 1–2 mệnh đề cốt lõi.
- Orient (Định hướng): nhận diện ý định (mức phạt, điều kiện, định nghĩa, thẩm quyền…).
- Match (Ánh xạ): nối các thuật ngữ vào concepts/relations có trong kho (ưu tiên synonyms/keywords).
- Expand (Mở rộng có kiểm soát): thêm một số đồng nghĩa phổ biến để tăng độ bao phủ.
- Template (Khuôn mẫu): dựng các star pattern phù hợp, ví dụ:
  - Mức phạt: (Subject=đối tượng, Relation=mức phạt/xử phạt, Object=hành vi/điều kiện)
  - Nghĩa vụ: (Subject=đối tượng, Relation=phải, Object=hành vi/điều kiện)

Hợp đồng I/O nhỏ gọn cho Query Engine:
- Input: text câu hỏi, ngôn ngữ (vi/en), `debug`.
- Output: `{intent, core_terms[], candidates{concepts[], relations[]}, patterns[]}`.

Biện pháp kiểm soát:
- SOMET không tự trả lời; nó chỉ tạo cấu trúc truy vấn.
- Mở rộng từ vựng phải nằm trong whitelist hoặc gắn cờ “đề xuất” (không ảnh hưởng ranking cứng).
- Ghi log mapping và quyết định intent để tiện rà soát.

Diễn giải tự nhiên nhanh:
- Cắt gọn câu hỏi cho rõ ý chính → đoán ý định → nối từ khoá vào khái niệm/quan hệ chuẩn → thêm vài từ tương đương → đóng thành khung truy vấn → máy đi tìm đúng bộ ba tri thức.

---
## Ví dụ minh họa end‑to‑end (SOMET + Truy hồi + RAG)

- Câu hỏi đầu vào: “Mức phạt không đội mũ bảo hiểm khi đi xe máy?”

1) SOMET (Assist):
   - Summarize: “mức phạt không đội mũ bảo hiểm khi điều khiển xe máy”.
   - Orient: intent = “mức phạt”.
   - Match: “mũ bảo hiểm” ↔ concept(Mũ bảo hiểm), “xe máy” ↔ concept(Xe mô tô), relation ↔ (xử phạt|mức phạt).
   - Expand: thêm “helmet”, “xe gắn máy” (nếu có trong whitelist).
   - Template: pattern (S=?, R=mức phạt, O∈{mũ bảo hiểm|không đội|xe mô tô}).

2) Truy hồi trên CSTT:
   - Dò triples khớp pattern, join concepts/relations/units.
   - Xếp hạng theo số match, confidence, tf‑idf, độ phủ synonyms.
   - Kết quả: danh sách snippet + doc_ref (ví dụ: “Decree 100/2019, Art 6, Clause …”).

3) RAG (tuỳ chọn):
   - Xây context từ các snippet (chỉ trích thông tin cần thiết, giữ doc_ref).
   - LLM viết lại câu trả lời tự nhiên, nhưng bị ràng buộc “chỉ dùng context”.
   - Kiểm tra: nếu câu trả lời thiếu doc_ref hoặc thêm thông tin ngoài context → fallback về câu trả lời từ bước 2.

4) Trả kết quả:
   - Dạng explainable (không LLM): trả danh sách đoạn luật + doc_ref.
   - Dạng natural (có LLM): một đoạn ngắn gọn kèm [doc_ref], ví dụ:
	 “Người điều khiển xe mô tô không đội mũ bảo hiểm bị xử phạt tiền mức X theo [Decree 100/2019, Art 6 …].”

Ghi chú triển khai:
- Bất kỳ câu trả lời sinh nào không kèm trích dẫn đều bị coi là sai chuẩn.
- Với trường hợp mơ hồ, hệ thống có thể đề nghị người dùng chọn rõ “đối tượng/hoàn cảnh” trước khi trả lời.

---
(End of 3.2–3.3)

