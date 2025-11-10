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
from typing import List, Dict
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
SENT_SPLIT_RE = re.compile(r'(?<=[\.!\?;:])\s+|\n+')


def normalize_text(raw: str) -> str:
    s = raw.replace('\u00a0', ' ')  # nbsp
    # Fix common OCR spacing around numbers in Điều (e.g. "Điều 1 51" -> "Điều 151")
    s = re.sub(r'(Đi[êe]u)\s+(\d)\s+(\d)(?:\s+(\d))?',
               lambda m: f"{m.group(1)} {m.group(2)}{m.group(3)}{m.group(4) or ''}", s)
    # Collapse excessive spaces
    s = re.sub(r'\s+', ' ', s)
    return s.strip()


def split_sentences(text: str) -> List[str]:
    parts = SENT_SPLIT_RE.split(text)
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
    "thực hiện",
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
    m = SUBJECT_CANDIDATE_RE.search(sent)
    if m:
        return cleanup(m.group(0))
    return "Người"


def cleanup(s: str) -> str:
    s = s.strip(' ,.;:()[]{}"“”\'’')
    s = re.sub(r'\s+', ' ', s)
    return s


def after_until_stop(text: str, start_idx: int) -> str:
    sub = text[start_idx:]
    m = re.search(r'(?=[\.;:])', sub)
    return cleanup(sub[:m.start()] if m else sub)


def explode_crimes(obj: str) -> List[str]:
    crimes = [cleanup(x) for x in CRIME_ITEM_RE.findall(obj)]
    seen = set()
    out: List[str] = []
    for c in crimes:
        if c not in seen:
            seen.add(c)
            out.append(c)
    return out or ([cleanup(obj)] if obj else [])


def normalize_age_subject(subj: str) -> str:
    subj = subj.replace('Người từ đủ 14 tuổi trở lên nhưng chưa đủ 16 tuổi', 'Người 14–16 tuổi')
    subj = subj.replace('Người từ đủ 14 tuổi trở lên nhưng chưa đủ 16 tuổi', 'Người 14–16 tuổi')
    return cleanup(subj)


STOP_TOKENS_RE = re.compile(r'\b(thực hiện|gây|phải|được|chịu|không|là|trong khi|để|nhằm|mà|biết)\b', re.IGNORECASE)
SUBJ_CONNECTOR_RE = re.compile(r'\b(và|hoặc)\b', re.IGNORECASE)
ROLE_TOKENS = [
    'thực hành', 'tổ chức', 'xúi giục', 'giúp sức', 'bào chữa', 'chỉ huy', 'phạm tội', 'bị hại', 'bị thiệt hại', 'đồng phạm'
]


def simplify_subject(subj: str, sentence: str) -> str:
    # Remove duplication like "... Người ..." inside
    subj = re.sub(r'(.*?\bNgười\b).*?\bNgười\b.*', r'\1', subj, flags=re.IGNORECASE)
    # Cut at stop tokens inside subject
    m = STOP_TOKENS_RE.search(subj)
    if m:
        subj = subj[:m.start()]
    subj = cleanup(subj)
    # Preserve age-form subjects
    if re.search(r'^Người\s*\d{1,2}[–-]\d{1,2}\s*tuổi$', subj, re.IGNORECASE) or subj.lower().startswith('người từ '):
        return 'Người 14–16 tuổi' if '14' in subj and '16' in subj else cleanup(subj)
    # Prefer known compact role subjects if present in the sentence
    sent_low = sentence.lower()
    if 'người chỉ huy' in sent_low and 'cấp trên' in sent_low:
        return 'Người chỉ huy hoặc cấp trên'
    for role in ROLE_TOKENS:
        if re.search(rf'\bngười\s+{re.escape(role)}\b', subj, re.IGNORECASE) or re.search(rf'\bngười\s+{re.escape(role)}\b', sentence, re.IGNORECASE):
            return f"Người {role}"
    # Cut at connectors like 'và', 'hoặc'
    m2 = SUBJ_CONNECTOR_RE.search(subj)
    if m2:
        subj = cleanup(subj[:m2.start()])
    # Specific phrase keepers
    if subj.lower().startswith('người có hành'):
        subj = 'Người có hành vi'
    # Limit length: if too long, keep only first 2 tokens after 'Người'
    tokens = subj.split()
    if len(tokens) > 6:
        if tokens and tokens[0].lower() == 'người':
            kept = tokens[:3]  # Người + 2 tokens
            subj = ' '.join(kept)
        else:
            subj = 'Người'
    # Standardize capitalization of 'Người'
    subj = re.sub(r'^người\b', 'Người', subj, flags=re.IGNORECASE)
    return cleanup(subj)


def extract_action_triples(text: str) -> List[Dict[str, str]]:
    text = normalize_text(text)
    sentences = split_sentences(text)
    triples: List[Dict[str, str]] = []

    OCR_FIXES = {
        'm ua': 'mua',
        'ph át': 'phát',
        'thi ết': 'thiết',
        'h iếp': 'hiếp',
        'm ạng': 'mạng',
        'đ iện': 'điện',
        'vi ễn': 'viễn',
    }

    def fix_ocr_chunks(s: str) -> str:
        for k, v in OCR_FIXES.items():
            s = s.replace(k, v)
        return s

    def contains_any_verb(s: str) -> bool:
        lower = s.lower()
        return any(pat.search(lower) for _, pat in VERB_PATTERNS)

    def looks_like_object_noun(s: str) -> bool:
        s2 = s.lower()
        return any(x in s2 for x in ['tội ', 'tài sản', 'ma túy', 'mạng', 'phương tiện', 'điện tử', 'vũ lực', 'cơ sở', 'hành vi', 'điều '])

    for s in sentences:
        subject = normalize_age_subject(pick_subject(s))
        subject = simplify_subject(subject, s)
        # Special case: if sentence indicates "nhưng chưa đủ 16 tuổi" then normalize subject to 14–16
        if ('từ đủ 14' in s or 'từ đủ 14' in s) and ('chưa đủ 16' in s or 'chưa đủ 16' in s):
            subject = 'Người 14–16 tuổi'
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
            obj = fix_ocr_chunks(obj)

            # Composite splitting: "sử dụng <resources> thực hiện (hành vi)? <action>"
            # Example: "sử dụng mạng máy tính, mạng viễn thông, phương tiện điện tử thực hiện hành vi chiếm đoạt tài sản"
            # Emit two triples:
            #  - (subject, "sử dụng", "mạng máy tính, mạng viễn thông, phương tiện điện tử")
            #  - (subject, "thực hiện", "chiếm đoạt tài sản")
            handled_composite = False
            if verb.lower() == 'sử dụng':
                comp = re.search(r"^(?P<res>.+?)\b(?:để\s+)?thực hiện\b(?:\s+hành vi)?\s+(?P<act>.+)$", obj, re.IGNORECASE)
                if comp:
                    resources = cleanup(comp.group('res').rstrip(' ,'))
                    action_obj = cleanup(re.sub(r'^hành vi\s+', '', comp.group('act'), flags=re.IGNORECASE))
                    if resources:
                        triples.append({"subject": subject, "predicate": "sử dụng", "object": resources})
                    if action_obj:
                        triples.append({"subject": subject, "predicate": "thực hiện", "object": action_obj})
                        handled_composite = True

            if "chịu trách nhiệm hình sự" in verb.lower():
                crimes = explode_crimes(obj)
                for c in crimes:
                    triples.append({"subject": subject, "predicate": "chịu trách nhiệm hình sự về", "object": c})
            else:
                if not handled_composite:
                    obj = CONNECTOR_RE.split(obj)[0]
                    obj = cleanup(obj)
                    # If object still contains verbs (likely a verb-list before a shared noun like "chất ma túy"), skip this noisy triple.
                    if contains_any_verb(obj) and not looks_like_object_noun(obj):
                        obj = ''
                    if obj:
                        triples.append({"subject": subject, "predicate": verb, "object": obj})

            if handled_composite:
                # We've already emitted both triples explicitly; stop scanning this sentence to avoid duplicates
                break
            else:
                idx = best_m.end() + max(1, len(obj))

    # Deduplicate
    uniq: List[Dict[str, str]] = []
    seen = set()
    for t in triples:
        key = (t["subject"].lower(), t["predicate"].lower(), t["object"].lower())
        if key not in seen:
            seen.add(key)
            uniq.append(t)
    return uniq


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


def save_to_json(triples: List[Dict[str, str]], out_path: str) -> None:
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(triples, f, ensure_ascii=False, indent=2)


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
