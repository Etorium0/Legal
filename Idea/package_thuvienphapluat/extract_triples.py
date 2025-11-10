# -*- coding: utf-8 -*-
"""
Extract action-based (subject, verb, object) triples from Vietnamese legal text.

Dependencies:
- PyPDF2 (required)
- google-generativeai (optional, only if using --gemini)

Usage examples:
  python extract_action_triples.py --pdf LuatHS.pdf --start 4 --end 7 --output triples_p4_7_actions.json

  # With Gemini refinement (optional)
  python extract_action_triples.py --pdf LuatHS.pdf --start 4 --end 7 --output triples_p4_7_actions_refined.json --gemini --gemini-key YOUR_KEY
"""
import argparse
import json
import os
import re
from typing import List, Dict, Tuple, Iterable
from PyPDF2 import PdfReader

# --------------------------
# Text IO
# --------------------------
def extract_text_from_pdf(file_path: str, start_page: int, end_page: int) -> str:
    reader = PdfReader(file_path)
    text = []
    end_index = min(end_page, len(reader.pages))
    for i in range(start_page - 1, end_index):
        page = reader.pages[i]
        t = page.extract_text() or ""
        text.append(t)
    return "\n".join(text)

# --------------------------
# Normalization & splitting
# --------------------------
SENT_SPLIT_RE = re.compile(r'(?<=[\.\?!;:])\s+|\n+')

def normalize_text(raw: str) -> str:
    s = raw.replace('\u00a0', ' ')  # nbsp
    # Fix common OCR spacing around numbers in Điều (e.g. "Điều 1 51" -> "Điều 151")
    s = re.sub(r'(Đi[êe]u)\s+(\d)\s+(\d)(?:\s+(\d))?', lambda m: f"{m.group(1)} {m.group(2)}{m.group(3)}{m.group(4) or ''}", s)
    # Collapse excessive spaces
    s = re.sub(r'\s+', ' ', s)
    return s.strip()

def split_sentences(text: str) -> List[str]:
    parts = SENT_SPLIT_RE.split(text)
    # keep only meaningful sentences
    out = []
    for p in parts:
        p = p.strip(' ,.;:()[]{}"“”\'’')
        if len(p.split()) >= 3:
            out.append(p)
    return out

# --------------------------
# Action-based triple extraction
# --------------------------
# Longest-first verb lexicon (legal and action verbs)
VERB_LEXICON = [
    "chịu trách nhiệm hình sự về",
    "không chịu trách nhiệm hình sự",
    "phải chịu trách nhiệm hình sự",
    "được miễn trách nhiệm hình sự",
    "bị truy cứu trách nhiệm hình sự",
    "bị xử phạt",
    "bị phạt tiền",
    "bị phạt",
    "điều khiển",
    "sử dụng",
    "tàng trữ",
    "vận chuyển",
    "mua bán",
    "chiếm đoạt",
    "gây thương tích",
    "hiếp dâm",
    "cưỡng dâm",
    "giết",
    "cướp",
    "bắt cóc",
    "trộm cắp",
    "hủy hoại",
    "phá hoại",
]

# Precompile patterns, longest verb first
VERB_LEXICON = sorted(VERB_LEXICON, key=len, reverse=True)
VERB_PATTERNS = [(v, re.compile(re.escape(v), re.IGNORECASE)) for v in VERB_LEXICON]

SUBJECT_CANDIDATE_RE = re.compile(
    r'\b('
    r'Người(?: [^,;:]{0,120})?'
    r'|Cá nhân(?: [^,;:]{0,120})?'
    r'|Tổ chức(?: [^,;:]{0,120})?'
    r'|Pháp nhân(?: [^,;:]{0,120})?'
    r'|Người\s*\d{1,2}[–-]\d{1,2}\s*tuổi'
    r'|Người từ [^,;:]{0,120}?tuổi'
    r')', re.IGNORECASE
)

CRIME_ITEM_RE = re.compile(r'(tội [^,;:]+)', re.IGNORECASE)
CONNECTOR_RE = re.compile(r'\b(?:và|hoặc|nhưng|song)\b', re.IGNORECASE)

def pick_subject(sent: str) -> str:
    # Prefer subject at the start; otherwise the first valid subject phrase
    m = SUBJECT_CANDIDATE_RE.search(sent)
    if m:
        return cleanup(m.group(0))
    # Default generic subject if none found
    return "Người"

def cleanup(s: str) -> str:
    s = s.strip(' ,.;:()[]{}"“”\'’')
    s = re.sub(r'\s+', ' ', s)
    return s

def after_until_stop(text: str, start_idx: int) -> str:
    # Object is until end-of-sentence punctuation or hard separators
    sub = text[start_idx:]
    # Split at punctuation or closing parens/colons
    m = re.search(r'(?=[\.;:])', sub)
    return cleanup(sub[:m.start()] if m else sub)

def explode_crimes(obj: str) -> List[str]:
    crimes = [cleanup(x) for x in CRIME_ITEM_RE.findall(obj)]
    seen = set()
    out = []
    for c in crimes:
        if c not in seen:
            seen.add(c)
            out.append(c)
    return out or ([cleanup(obj)] if obj else [])

def normalize_age_subject(subj: str) -> str:
    subj = subj.replace('Người từ đủ 14 tuổi trở lên nhưng chưa đủ 16 tuổi', 'Người 14–16 tuổi')
    subj = subj.replace('Người từ đủ 14 tuổi trở lên nhưng chưa đủ 16 tuổi', 'Người 14–16 tuổi')
    return cleanup(subj)

def extract_action_triples(text: str) -> List[Dict[str, str]]:
    text = normalize_text(text)
    sentences = split_sentences(text)
    triples: List[Dict[str, str]] = []

    for s in sentences:
        subject = normalize_age_subject(pick_subject(s))
        # For each verb, extract object span
        # Use first match, then continue searching later parts to allow multiple verbs in one sentence
        idx = 0
        while idx < len(s):
            best = None
            best_m = None
            for verb, pat in VERB_PATTERNS:
                m = pat.search(s, idx)
                if m and (best_m is None or m.start() < best_m.start()):
                    best = verb
                    best_m = m
            if not best_m:
                break

            verb = cleanup(best)
            obj = after_until_stop(s, best_m.end())

            # If verb is a responsibility verb “chịu trách nhiệm hình sự …”
            if "chịu trách nhiệm hình sự" in verb.lower():
                # Prefer phrases starting with “tội …”
                crimes = explode_crimes(obj)
                for c in crimes:
                    triples.append({"subject": subject, "predicate": "chịu trách nhiệm hình sự về", "object": c})
            else:
                # For general actions, trim connector tails
                obj = CONNECTOR_RE.split(obj)[0]
                obj = cleanup(obj)
                if obj:
                    triples.append({"subject": subject, "predicate": verb, "object": obj})

            # Advance index to continue scanning the rest of sentence
            idx = best_m.end() + max(1, len(obj))

    # Deduplicate near-duplicates
    uniq = []
    seen = set()
    for t in triples:
        key = (t["subject"].lower(), t["predicate"].lower(), t["object"].lower())
        if key not in seen:
            seen.add(key)
            uniq.append(t)
    return uniq

# --------------------------
# Optional VNCoreNLP (stub)
# --------------------------
def refine_with_vncorenlp(text: str) -> Iterable[Dict[str, str]]:
    """
    Optional: integrate VNCoreNLP here if you have the server/JAR running.
    For portability, this function is a stub that just yields nothing.
    """
    return []

# --------------------------
# Optional Gemini refinement
# --------------------------
def refine_with_gemini(triples: List[Dict[str, str]], api_key: str, model: str = "gemini-2.5-flash") -> List[Dict[str, str]]:
    try:
        import google.generativeai as genai
    except Exception as e:
        raise RuntimeError("Chưa cài google-generativeai. Cài bằng: pip install google-generativeai") from e

    genai.configure(api_key=api_key)
    mdl = genai.GenerativeModel(model)

    refined: List[Dict[str, str]] = []
    for t in triples:
        prompt = (
            "Chuẩn hóa bộ ba tri thức pháp luật tiếng Việt.\n"
            f"SUBJECT: {t['subject']}\nPREDICATE: {t['predicate']}\nOBJECT: {t['object']}\n"
            "- Yêu cầu: ngắn gọn, đúng ngữ pháp, giữ nghĩa pháp lý; predicate là động từ/cụm động từ; object là cụm danh từ.\n"
            'Trả về JSON duy nhất dạng {"subject":"...","predicate":"...","object":"..."}'
        )
        try:
            resp = mdl.generate_content(prompt)
            txt = (resp.text or "").strip()
            m = re.search(r'\{.*\}', txt, re.DOTALL)
            if m:
                obj = json.loads(m.group(0))
                refined.append({
                    "subject": obj.get("subject", t["subject"]),
                    "predicate": obj.get("predicate", t["predicate"]),
                    "object": obj.get("object", t["object"]),
                })
            else:
                refined.append(t)
        except Exception:
            refined.append(t)
    return refined

# --------------------------
# Save
# --------------------------
def save_to_json(triples: List[Dict[str, str]], out_path: str) -> None:
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(triples, f, ensure_ascii=False, indent=2)

# --------------------------
# CLI
# --------------------------
def main():
    parser = argparse.ArgumentParser(description="Extract action-based triples (subject, verb, object) from Vietnamese legal PDF.")
    parser.add_argument("--pdf", required=True, help="Đường dẫn file PDF")
    parser.add_argument("--start", type=int, required=True, help="Trang bắt đầu (>=1)")
    parser.add_argument("--end", type=int, required=True, help="Trang kết thúc (>=start)")
    parser.add_argument("--output", default="triples_actions.json", help="File JSON đầu ra")
    parser.add_argument("--gemini", action="store_true", help="Dùng Google Gemini để refine kết quả")
    parser.add_argument("--gemini-key", help="Gemini API key (hoặc đặt biến môi trường GEMINI_API_KEY)")
    args = parser.parse_args()

    pdf_path = args.pdf
    if not os.path.isfile(pdf_path):
        candidate = os.path.join("Idea", pdf_path)
        if os.path.isfile(candidate):
            pdf_path = candidate
    if not os.path.isfile(pdf_path):
        raise FileNotFoundError(f"Không tìm thấy file PDF: {pdf_path}")

    raw = extract_text_from_pdf(pdf_path, args.start, args.end)
    triples = extract_action_triples(raw)

    if args.gemini:
        api_key = args.gemini_key or os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise RuntimeError("Thiếu Gemini API key. Truyền --gemini-key hoặc đặt biến GEMINI_API_KEY.")
        triples = refine_with_gemini(triples, api_key=api_key)

    save_to_json(triples, args.output)
    print(f"Đã trích xuất {len(triples)} bộ ba. Đã lưu vào: {args.output}")

if __name__ == "__main__":
    main()
