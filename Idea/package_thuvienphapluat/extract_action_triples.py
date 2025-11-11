# -*- coding: utf-8 -*-
"""
Extract action-based (subject, verb, object) triples from Vietnamese legal text.

New features (enhanced version):
    - Optional cleanup / normalization of extracted triples (--clean)
        - Optional Excel / CSV export (--xlsx), luôn xuất 3 cột (subject, predicate, object)
            bằng pandas nếu có; nếu thiếu sẽ fallback CSV
    - More robust JSON saving when output filename has no directory
    - Optional augmentation: predicate normalization + subject/object typing (--augment)

Dependencies:
    - PyPDF2 (required)
    - google-generativeai (optional, only if using --gemini)
    - pandas (optional, for Excel export; openpyxl recommended)

Usage examples:
    python extract_action_triples.py --pdf LuatHS.pdf --start 4 --end 7 --output triples_p4_7_actions.json

    # With Gemini refinement (optional)
    python extract_action_triples.py --pdf LuatHS.pdf --start 4 --end 7 \
        --output triples_p4_7_actions_refined.json --gemini --gemini-key YOUR_KEY

    # With cleanup & Excel export
    python extract_action_triples.py --pdf LuatHS.pdf --start 4 --end 7 \
        --output triples_p4_7_actions.json --clean --xlsx triples_p4_7_actions.xlsx
"""
import argparse
import csv
import json
import os
import re
import unicodedata
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
    # Canonical compose to merge combining accents into precomposed Vietnamese characters where possible
    s = unicodedata.normalize('NFC', raw)
    s = s.replace('\u00a0', ' ')  # nbsp
    # Additional OCR normalizations
    s = s.replace('đủ', 'đủ').replace('Đủ', 'Đủ')
    s = s.replace('Điều', 'Điều').replace('điều', 'điều')
    s = s.replace('tội', 'tội').replace('Tội', 'Tội')
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
    "không phải là",
    "được quy định",
    "là",
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

# Precompile patterns with word boundaries to avoid matching inside words (e.g., 'là' in 'làm')
VERB_LEXICON = sorted(VERB_LEXICON, key=len, reverse=True)
def _compile_verb(v: str):
    pat = rf"(?<!\w){re.escape(v)}(?!\w)"
    return re.compile(pat, re.IGNORECASE)
VERB_PATTERNS = [(v, _compile_verb(v)) for v in VERB_LEXICON]

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

# Include standalone offenses and the general phrase "mọi tội phạm"
CRIME_ITEM_RE = re.compile(r'(tội [^,;:]+|mọi tội phạm)', re.IGNORECASE)
# Fallback pattern for enumerated offenses with OCR-tolerant "Điều" token (e.g., "Điều")
# Matches: "Đi[êe]\S* <num> (tội ... )" and stops the offense name before ")" or ";"
ENUM_OFFENSE_RE_FALLBACK = re.compile(r"Đi\S*\s+(\d+)\s*\((tội[^);]+)\)", re.IGNORECASE)
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

def cleanup_vi_tokens(s: str) -> str:
    """Light Vietnamese cleanup: normalize spaces, unify dashes, fix common OCR splits."""
    if not s:
        return s
    x = s.replace('\u00a0', ' ')
    x = x.replace('–', '-')
    x = x.replace('—', '-')
    # OCR fix samples
    x = x.replace('ph ạm', 'phạm')
    x = x.replace('đ ó', 'đó')
    x = x.replace('trước', 'trước')
    x = x.replace('dấu', 'dấu')
    x = x.replace('biết', 'biết')
    x = x.replace('hiếp', 'hiếp')
    x = x.replace('cướp', 'cướp')
    x = x.replace('kết', 'kết')
    x = x.replace('mới', 'mới')
    x = x.replace('ho ặc', 'hoặc')
    x = re.sub(r'\s+', ' ', x).strip(' ,.;:()[]{}"“”\'’')
    return x


def after_until_stop(text: str, start_idx: int) -> str:
    sub = text[start_idx:]
    m = re.search(r'(?=[\.;:])', sub)
    return cleanup(sub[:m.start()] if m else sub)


OBJ_STOP_TOKENS = re.compile(r"\b(thì|mà|để|trong khi|khi|nếu|do|vì|bằng việc|nhằm|song|tuy|nhưng)\b", re.IGNORECASE)

def trim_object(obj: str) -> str:
    # Cut at clause markers
    m = OBJ_STOP_TOKENS.search(obj)
    if m and m.start() > 0:
        obj = obj[:m.start()]
    # Remove leading 'hành vi' when followed by a verb-like word
    obj = re.sub(r'^hành vi\s+', '', obj, flags=re.IGNORECASE)
    # Cut at long comma tails
    parts = [p.strip() for p in obj.split(',')]
    if len(parts) > 1:
        head = ', '.join(parts[:3])  # keep up to first 3 chunks
        if len(head.split()) <= 15:
            obj = head
    # Hard cap length to keep noun phrase concise
    tokens = obj.split()
    if len(tokens) > 18:
        obj = ' '.join(tokens[:18])
    return cleanup(obj)


VERB_LIKE_START_RE = re.compile(r'^(phạm|thực hiện|gây|chiếm đoạt|trốn|áp dụng|báo cáo|chấp hành|sử dụng)\b', re.IGNORECASE)

def normalize_object_phrase(obj: str, predicate: str) -> str:
    o = obj.strip()
    if not o:
        return o
    # Convert common verb-leading phrases to noun phrases
    low = o.lower()
    if low.startswith('phạm tội') or low == 'phạm tội mới':
        return 'tội phạm' if 'mới' not in low else 'tội phạm mới'
    if VERB_LIKE_START_RE.match(o):
        # Prefix with 'hành vi'
        o = re.sub(r'^(thực hiện|gây|chiếm đoạt|trốn|áp dụng|báo cáo|chấp hành|sử dụng)\s+', '', o, flags=re.IGNORECASE)
        if not o:
            o = obj
        o = 'hành vi ' + o
    # Remove leading 'Người' as object for action predicates
    if predicate.strip().lower() in {'thực hiện','sử dụng','tàng trữ','mua bán','vận chuyển','phá hoại','trộm cắp'} and low.startswith('người '):
        return ''
    return cleanup(o)


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
        'h ành': 'hành',
        'm hư hỏng': 'làm hư hỏng',
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
        return any(x in s2 for x in ['tội ', 'tội phạm', 'tài sản', 'ma túy', 'mạng', 'phương tiện', 'điện tử', 'vũ lực', 'cơ sở', 'hành vi', 'điều ', 'thời hiệu'])

    HEADING_OFFENSE_RE = re.compile(r"Đi\S*\s+(\d+)\s*\((tội[^)]+)\)", re.IGNORECASE)
    def emit_offenses_from_sentence(sentence: str, subj_for_liability: str | None):
        # Find all offense headings in the sentence and emit liability triples if in context
        for m in HEADING_OFFENSE_RE.finditer(sentence):
            art_no = m.group(1)
            offense_raw = m.group(2)
            offense = fix_ocr_chunks(cleanup(offense_raw))
            # Include Điều number in the object and default subject to "Người 14–16 tuổi"
            off_obj = f"{offense} (Điều {art_no})"
            subject_emit = subj_for_liability or "Người 14–16 tuổi"
            # For enumerated offenses, use predicate "phạm"
            triples.append({
                "subject": subject_emit,
                "predicate": "phạm",
                "object": off_obj,
            })
            # Additionally, if offense phrase contains clear verb-object like 'làm hư hỏng X' or 'hủy hoại X', emit action triples
            mh = re.search(r"(?:cố ý\s+)?làm hư hỏng\s+([^,;\)]+)", offense, re.IGNORECASE)
            if mh:
                objx = trim_object(cleanup(mh.group(1)))
                if objx:
                    triples.append({"subject": "Người", "predicate": "làm hư hỏng", "object": objx})
            mh2 = re.search(r"hủy hoại\s+([^,;\)]+)", offense, re.IGNORECASE)
            if mh2:
                objx = trim_object(cleanup(mh2.group(1)))
                if objx:
                    triples.append({"subject": "Người", "predicate": "hủy hoại", "object": objx})

    active_liability_subject: str | None = None

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

            # Copula/definition subject fallback: take phrase before the verb as subject if it looks noun-like
            if verb.lower() in {"không phải là", "là", "được quy định"}:
                pre = cleanup(s[:best_m.start()])
                # strip leading numbering and labels
                pre = re.sub(r'^(\d+\.|[a-d]\)|khoản \d+|điều \d+\.?\s*)', '', pre, flags=re.IGNORECASE)
                if len(pre.split()) >= 2 and not pre.lower().startswith('người'):
                    subject = pre

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

            lowverb = verb.lower().strip()
            if lowverb == "không chịu trách nhiệm hình sự":
                # Capture condition phrase (e.g., "nếu Bộ luật có quy định khác") as the object
                cond = re.search(r"(nếu [^\.;:]+|trừ trường hợp [^\.;:]+)", obj, re.IGNORECASE)
                objx = cleanup(cond.group(1)) if cond else cleanup(obj)
                if objx:
                    triples.append({"subject": subject, "predicate": "không chịu trách nhiệm hình sự", "object": objx})
                # Do not set liability enumeration context for negative clause
            elif lowverb.startswith("chịu trách nhiệm hình sự") or lowverb.startswith("phải chịu trách nhiệm hình sự"):
                crimes = explode_crimes(obj)
                if crimes:
                    for c in crimes:
                        triples.append({"subject": subject, "predicate": "chịu trách nhiệm hình sự về", "object": c})
                else:
                    # No explicit crime found; keep a generic liability triple when applicable
                    triples.append({"subject": subject, "predicate": "phải chịu trách nhiệm hình sự", "object": "trách nhiệm hình sự"})
                # Track liability context for following enumerations of Điều ...
                if re.search(r"(một trong các đi[êe]u|các đi[êe]u sau đây)", obj, re.IGNORECASE):
                    active_liability_subject = subject
            else:
                if not handled_composite:
                    obj = CONNECTOR_RE.split(obj)[0]
                    obj = trim_object(cleanup(obj))
                    obj = normalize_object_phrase(obj, verb)
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

        # After processing verbs in this sentence, emit offenses from heading if we are in liability context
        emit_offenses_from_sentence(s, active_liability_subject)

    # Enumerated offenses after phrases like "một trong các điều sau đây" (Điều 12 context)
    def extract_enumerated_offenses(full_text: str) -> List[Dict[str, str]]:
        out: List[Dict[str, str]] = []
        anchor = re.search(r"(một trong các đi\S* sau đây|các đi\S* sau đây)\s*:?", full_text, re.IGNORECASE)
        if not anchor:
            return out
        # Default subject for enumerated offenses per requirements
        subj = 'Người 14–16 tuổi'
        # Limit scan window to ~8000 chars after anchor
        block = full_text[anchor.end(): anchor.end()+8000]
        for m in re.finditer(r"Đi\S*\s+(\d+)\s*\((tội[^\)]+)\)", block, re.IGNORECASE | re.DOTALL):
            art = m.group(1)
            offense = fix_ocr_chunks(cleanup(m.group(2)))
            obj = f"{offense} (Điều {art})"
            out.append({"subject": subj, "predicate": "phạm", "object": obj})
        return out

    triples.extend(extract_enumerated_offenses(text))

    # Add a fallback scan for enumerated offenses that explicitly emits predicate 'phạm'
    def extract_enumerated_offenses_fixed(full_text: str) -> List[Dict[str, str]]:
        """Fallback scan for enumerated offenses even when anchors are missing or OCR is noisy.
        - Uses an OCR-tolerant regex: "Đi[êe]\S* <num> (tội ... )" (ENUM_OFFENSE_RE_FALLBACK)
        - Also runs an accent-insensitive pass on a per-line basis for extreme OCR cases.
        - Limits scan region to ~8000 chars after anchor if anchor is present; otherwise scans entire text.
        - Default subject is "Người 14–16 tuổi" and predicate is "phạm".
        """
        out: List[Dict[str, str]] = []
        subj = "Người 14–16 tuổi"
        seen = set()

        # Optional anchor limitation (tolerant to OCR on "trong")
        anchor_raw = re.search(r"(một\s+t[rôo]ng\s+các\s+đi\S*\s+sau\s+đây|các\s+đi\S*\s+sau\s+đây)[:\s]*", full_text, re.IGNORECASE)
        scan_text = full_text[anchor_raw.end(): anchor_raw.end()+8000] if anchor_raw else full_text

        # Pass 1: direct OCR-tolerant regex over the scan block
        for m in ENUM_OFFENSE_RE_FALLBACK.finditer(scan_text):
            art = m.group(1)
            offense = cleanup(m.group(2))
            offense = fix_ocr_chunks(offense)
            obj = f"{offense} (Điều {art})"
            key = (subj.lower(), 'phạm', obj.lower())
            if key not in seen:
                seen.add(key)
                out.append({"subject": subj, "predicate": "phạm", "object": obj})

        # Pass 2: accent-insensitive line-based scan for severely broken diacritics
        def strip_accents(x: str) -> str:
            return ''.join(c for c in unicodedata.normalize('NFD', x) if unicodedata.category(c) != 'Mn')
        for line in scan_text.splitlines():
            if len(line) < 10:
                continue
            raw_line = line.strip()
            sani = strip_accents(raw_line.lower())
            mm = re.search(r"dieu\s+(\d+)\s*\((toi[^);]*)\)", sani)
            if not mm:
                continue
            art = mm.group(1)
            # Try to map back offense from original raw_line between parentheses
            pm = re.search(r"\(([^)]*)\)", raw_line)
            if not pm:
                continue
            offense = cleanup(pm.group(1))
            offense = fix_ocr_chunks(offense)
            obj = f"{offense} (Điều {art})"
            key = (subj.lower(), 'phạm', obj.lower())
            if key not in seen:
                seen.add(key)
                out.append({"subject": subj, "predicate": "phạm", "object": obj})
        return out

    triples.extend(extract_enumerated_offenses_fixed(text))


    # Deduplicate
    uniq: List[Dict[str, str]] = []
    seen = set()
    for t in triples:
        key = (t["subject"].lower(), t["predicate"].lower(), t["object"].lower())
        if key not in seen:
            seen.add(key)
            uniq.append(t)
    return uniq

# --------------------------
# Triple normalization & export
# --------------------------

NOISY_OBJECT_EXACT = {"hàng tháng", "vào việc", "phát tán"}

def normalize_triples(triples: List[Dict[str, str]]) -> List[Dict[str, str]]:
    """Light normalization: cleanup tokens, remove clearly noisy objects, deduplicate again."""
    out: List[Dict[str, str]] = []
    for t in triples:
        s = cleanup_vi_tokens(t.get("subject", ""))
        p = cleanup_vi_tokens(t.get("predicate", ""))
        o = cleanup_vi_tokens(t.get("object", ""))
        s = normalize_age_subject(s)
        if not s or not p or not o:
            continue
        if o.lower() in NOISY_OBJECT_EXACT and not any(k in p.lower() for k in ["phạt", "tử hình"]):
            continue
        if len(o) < 3 and o.lower() not in {"án", "tù"}:
            continue
        out.append({"subject": s, "predicate": p, "object": o})
    # Deduplicate
    uniq: List[Dict[str, str]] = []
    seen = set()
    for t in out:
        key = (t["subject"].lower(), t["predicate"].lower(), t["object"].lower())
        if key not in seen:
            seen.add(key)
            uniq.append(t)
    return uniq

def export_table(triples: List[Dict[str, str]], out_path: str) -> str:
    if not triples:
        raise ValueError("Không có dữ liệu để xuất.")
    # Always export only 3 columns: subject, predicate, object
    base_cols = ["subject", "predicate", "object"]
    rows = [{c: t.get(c, "") for c in base_cols} for t in triples]
    try:
        import pandas as pd  # type: ignore
        df = pd.DataFrame(rows, columns=base_cols)
        if out_path.lower().endswith('.xlsx'):
            df.to_excel(out_path, index=False)
            return out_path
        csv_path = out_path if out_path.lower().endswith('.csv') else os.path.splitext(out_path)[0] + '.csv'
        df.to_csv(csv_path, index=False, encoding='utf-8-sig')
        return csv_path
    except Exception:
        csv_path = out_path if out_path.lower().endswith('.csv') else os.path.splitext(out_path)[0] + '.csv'
        with open(csv_path, 'w', newline='', encoding='utf-8-sig') as f:
            w = csv.DictWriter(f, fieldnames=base_cols)
            w.writeheader()
            for row in rows:
                w.writerow(row)
        return csv_path


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
    dir_name = os.path.dirname(out_path) or '.'
    os.makedirs(dir_name, exist_ok=True)
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
    parser.add_argument("--clean", action="store_true", help="Làm sạch/chuẩn hóa nhẹ các bộ ba trước khi lưu")
    parser.add_argument("--xlsx", help="Xuất thêm Excel/CSV (nếu .xlsx sẽ ưu tiên Excel; thiếu pandas sẽ fallback CSV)")
    parser.add_argument("--augment", action="store_true", help="Bổ sung cột chuẩn hóa quan hệ và phân loại chủ thể/đối tượng")
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

    if args.clean:
        triples = normalize_triples(triples)

    if args.augment:
        triples = augment_triples(triples)

    save_to_json(triples, args.output)
    print(f"Đã trích xuất {len(triples)} bộ ba. Đã lưu vào: {args.output}")

    xout = args.xlsx
    if not xout and args.output.lower().endswith('.xlsx'):
        xout = args.output
    if xout:
        try:
            written = export_table(triples, xout)
            print(f"Đã xuất bảng: {written}")
        except Exception as e:
            print(f"[WARN] Xuất bảng thất bại: {e}")

# --------------------------
# Augmentation: predicate normalization + typing
# --------------------------

def canonical_predicate(subject: str, predicate: str, obj: str) -> str:
    p = predicate.lower()
    o = obj.lower()
    if "chịu trách nhiệm hình sự" in p:
        return "is_criminally_liable_for"
    if "được miễn trách nhiệm hình sự" in p:
        return "exempt_from_criminal_liability"
    if "bị phạt tiền" in p:
        return "fined"
    if "bị xử phạt" in p or ("bị phạt" in p and "bị phạt tiền" not in p):
        return "sentenced_to"
    if p.strip() == "sử dụng":
        return "uses"
    if p.strip() == "tàng trữ":
        return "possesses"
    if p.strip() == "vận chuyển":
        return "transports"
    if p.strip() == "mua bán":
        # Heuristic: trafficking if harmful objects
        if any(x in o for x in ["ma túy", "người", "vũ khí", "tài sản"]):
            return "commits"
        return "trades"
    if p.strip() in {"trộm cắp", "cướp", "bắt cóc", "hiếp dâm", "cưỡng dâm", "giết", "phá hoại", "hủy hoại", "chiếm đoạt"}:
        return "commits"
    if p.strip() == "thực hiện":
        if any(x in o for x in ["tội ", "hành vi", "chiếm đoạt", "phạm tội"]):
            return "commits"
        return "performs"
    return p.replace(" ", "_")

def classify_entity(text: str, role: str) -> str:
    t = (text or "").lower()
    if role == "subject":
        if t.startswith("người") or t.startswith("cá nhân"):
            return "Person"
        if t.startswith("tổ chức") or t.startswith("pháp nhân"):
            return "Organization"
        if any(x in t for x in ["viện kiểm sát", "tòa án", "cơ quan", "cấp trên", "chỉ huy"]):
            return "Authority"
        return "Unknown"
    # object
    if any(x in t for x in ["tội ", "hiếp dâm", "cướp", "trộm cắp", "bắt cóc", "chiếm đoạt"]):
        return "Offense"
    if any(x in t for x in ["tử hình", "phạt", "cải tạo", "tù", "án"]):
        return "Penalty"
    if any(x in t for x in ["mạng máy tính", "mạng viễn thông", "phương tiện điện tử", "vũ lực"]):
        return "Resource"
    if t.startswith("điều ") or t.startswith("khoản "):
        return "ActPart"
    if t.startswith("khi ") or t.startswith("trong trường hợp"):
        return "Condition"
    if "ma túy" in t:
        return "Substance"
    return "Unknown"

def augment_triples(triples: List[Dict[str, str]]) -> List[Dict[str, str]]:
    out: List[Dict[str, str]] = []
    for t in triples:
        s = t.get("subject", "")
        p = t.get("predicate", "")
        o = t.get("object", "")
        t2 = dict(t)
        t2["predicate_norm"] = canonical_predicate(s, p, o)
        t2["subject_type"] = classify_entity(s, "subject")
        t2["object_type"] = classify_entity(o, "object")
        out.append(t2)
    return out


if __name__ == "__main__":
    main()
