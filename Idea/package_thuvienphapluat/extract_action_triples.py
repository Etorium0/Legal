#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
VNCoreNLP-based triple extractor for Vietnamese legal PDFs.

Features:
- Read PDF text by page range using PyPDF2 (--start, --end).
- Use VNCoreNLP (word segmentation, POS, dependency parse) to identify verbs and their subjects/objects.
- Extract (subject, predicate, object) triples via dependency labels: nsubj/subj, obj/iobj, obl, attr/ccomp/xcomp.
- Handle copula 'là' and passive constructions with 'bị', 'được'.
- Clean and assemble multi-word noun / verb phrases (include modifiers: nmod, amod, det, compound, name, case, clf).
- Export JSON and optional Excel/CSV with 3 columns.
- Optional Gemini refine (--gemini) to polish grammar.

CLI example:
  py extract_action_triples.py --pdf LuatHS.pdf --start 4 --end 7 --output triples_p4_7.json --xlsx triples_p4_7.xlsx
"""

import argparse
import csv
import json
import os
import re
import unicodedata
from typing import List, Dict, Set
from PyPDF2 import PdfReader


# --------------------------
# PDF text extraction
# --------------------------

def extract_text_from_pdf(file_path: str, start_page: int, end_page: int) -> str:
    reader = PdfReader(file_path)
    text_parts: List[str] = []
    end_index = min(end_page, len(reader.pages))
    for i in range(start_page - 1, end_index):
        page = reader.pages[i]
        t = page.extract_text() or ""
        text_parts.append(t)
    return "\n".join(text_parts)


# --------------------------
# Normalization & sentence splitting
# --------------------------
SENT_SPLIT_RE = re.compile(r'(?<=[\.\!\?;:])\s+|\n+')


def normalize_text(raw: str) -> str:
    s = unicodedata.normalize('NFC', raw).replace('\u00a0', ' ')
    s = s.replace('đủ', 'đủ').replace('Đủ', 'Đủ')
    s = s.replace('Điều', 'Điều').replace('điều', 'điều')
    s = s.replace('tội', 'tội').replace('Tội', 'Tội')
    s = re.sub(r'(Đi[êe]u)\s+(\d)\s+(\d)(?:\s+(\d))?', lambda m: f"{m.group(1)} {m.group(2)}{m.group(3)}{m.group(4) or ''}", s)
    s = re.sub(r'\s+', ' ', s)
    return s.strip()

# --- Additional preprocessing helpers ---
ARTICLE_SPLIT_RE = re.compile(r'(?=\bĐiều\s+\d+\b)', re.IGNORECASE)
KHOAN_SPLIT_RE = re.compile(r'(?=\bKhoản\s+\d+\b)', re.IGNORECASE)

CLAUSE_CONJ_RE = re.compile(r'\s+(và|hoặc|đồng thời|cũng như)\s+', re.IGNORECASE)

PRONOUNS = {"người này", "họ", "người đó"}

def split_articles(text: str) -> List[str]:
    parts = [p.strip() for p in ARTICLE_SPLIT_RE.split(text) if p.strip()]
    return parts

def split_khoan(article_text: str) -> List[str]:
    parts = [p.strip() for p in KHOAN_SPLIT_RE.split(article_text) if p.strip()]
    return parts

def split_clauses(sentence: str) -> List[str]:
    segs = [s.strip() for s in CLAUSE_CONJ_RE.split(sentence) if s.strip()]
    return segs if len(segs) > 1 else [sentence]

def normalize_entities(text: str) -> str:
    if not text:
        return text
    t = text
    t = re.sub(r"\bngười\s+phạm\s+tội\b", "Người", t, flags=re.IGNORECASE)
    t = re.sub(r"\bngười\s+bị\s+kết\s+án\b", "Người", t, flags=re.IGNORECASE)
    t = re.sub(r"\bngười\s+phạm\s+tội\s+đó\b", "Người phạm tội", t, flags=re.IGNORECASE)
    return t

def resolve_pronouns(prev_subject: str, current: str) -> str:
    c = (current or "").lower().strip()
    if c in PRONOUNS and prev_subject:
        return prev_subject
    return current


def split_sentences(text: str) -> List[str]:
    parts = SENT_SPLIT_RE.split(text)
    return [p.strip(' \t') for p in parts if len(p.split()) >= 3]


def cleanup_vi_tokens(s: str) -> str:
    if not s:
        return s
    x = s.replace('\u00a0', ' ').replace('–', '-').replace('—', '-')
    x = x.replace('ph ạm', 'phạm').replace('đ ó', 'đó').replace('trước', 'trước')
    x = x.replace('dấu', 'dấu').replace('biết', 'biết').replace('hiếp', 'hiếp')
    x = x.replace('cướp', 'cướp').replace('kết', 'kết').replace('mới', 'mới').replace('ho ặc', 'hoặc')
    # Fix common OCR split-inside-words seen in sample
    common_fixes = {
        'cư ỡng': 'cưỡng',
        'ph át': 'phát',
        'm ua': 'mua',
        'đ iệp': 'điệp',
        'gi án': 'gián',
        'ti ện': 'tiện',
        'p hép': 'phép',
        'c ạnh': 'cạnh',
        'v ề': 'về',
        'h òa': 'hòa',
        'qu ốc': 'quốc',
        'ph át tán': 'phát tán',
        'l ừa': 'lừa',
        'đ ảo': 'đảo',
        'chiếm đo ạt': 'chiếm đoạt',
        'đ ến': 'đến',
        'n ăm': 'năm',
        'kh ông': 'không',
        'cả nh': 'cảnh',
    }
    for k, v in common_fixes.items():
        x = x.replace(k, v)
    x = re.sub(r'\s+', ' ', x).strip()
    return x


def _replace_ci(text: str, pattern: str, repl: str) -> str:
    return re.sub(pattern, repl, text, flags=re.IGNORECASE)


def normalize_terms(text: str) -> str:
    if not text:
        return text
    t = text
    # Simplify domain-specific terms
    t = _replace_ci(t, r"\bhình\s+phạt\s+chính\b", "hình phạt")
    t = _replace_ci(t, r"\bchất\s+ma\s+túy\b", "ma túy")
    # Collapse duplicated auxiliaries
    t = re.sub(r"\b(được|bị)\s+(được|bị)\b", r"\1 ", t, flags=re.IGNORECASE)
    return cleanup_vi_tokens(t)


def save_to_json(triples: List[Dict[str, str]], out_path: str) -> None:
    dir_name = os.path.dirname(out_path) or '.'
    os.makedirs(dir_name, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(triples, f, ensure_ascii=False, indent=2)


# --------------------------
# VNCoreNLP init
# --------------------------
def init_vncorenlp(model_dir: str | None = None, heap: str = "-Xmx2g"):
    """Khởi tạo VNCoreNLP dựa trên thư mục mô hình cục bộ (không tự tải).

    Yêu cầu:
    - model_dir phải chứa file jar (ví dụ: VnCoreNLP-1.x.x.jar) và thư mục models/ tương ứng.
    - Java có trong PATH.

    Nếu thiếu jar, báo lỗi hướng dẫn tải thủ công.
    """
    try:
        from vncorenlp import VnCoreNLP  # type: ignore
    except Exception as e:
        raise RuntimeError(
            "Thiếu thư viện vncorenlp. Cài: pip install vncorenlp (cần Java trong PATH)."
        ) from e

    # Mặc định thư mục chứa mô hình
    if not model_dir:
        model_dir = os.path.join(os.getcwd(), "vncorenlp_models")

    os.makedirs(model_dir, exist_ok=True)

    # Kiểm tra sự tồn tại jar (tên có thể thay đổi theo version)
    jar_candidates = [f for f in os.listdir(model_dir) if f.lower().startswith("vncorenlp") and f.endswith(".jar")]
    if not jar_candidates:
        raise RuntimeError(
            "Không tìm thấy file jar VNCoreNLP trong thư mục: "
            f"{model_dir}.\nHướng dẫn: Tải gói VNCoreNLP (jar + models) và giải nén vào thư mục này, sao cho có: \n"
            "  - VnCoreNLP-*.jar\n  - models/wordsegmenter, models/postagger, models/dependency ..."
        )

    annotators = ["wseg", "pos", "parse"]

    # Kiểm tra Java
    if not _java_exists():
        raise RuntimeError("Không tìm thấy 'java' trong PATH. Cài đặt Java JRE/JDK rồi thử lại.")

    try:
        return VnCoreNLP(model_dir, annotators=annotators, max_heap_size=heap)
    except FileNotFoundError as e:
        raise RuntimeError(f"Thư mục mô hình không hợp lệ: {model_dir}. Chi tiết: {e}") from e
    except Exception as e:
        raise RuntimeError(f"Khởi tạo VNCoreNLP thất bại: {e}") from e


def _java_exists() -> bool:
    """Kiểm tra có thể gọi 'java'."""
    import shutil
    return shutil.which("java") is not None


# --------------------------
# Dependency-based triple extraction
# --------------------------
SUBJ_LABELS: Set[str] = {"nsubj", "subj"}
OBJ_LABELS: Set[str] = {"obj", "iobj"}
OBL_LABELS: Set[str] = {"obl"}
ATTR_LABELS: Set[str] = {"xcomp", "ccomp", "attr"}
NP_MOD_LABELS: Set[str] = {"nmod", "amod", "det", "compound", "case", "clf", "name"}
VP_AUX_LABELS: Set[str] = {"aux", "mark", "advmod", "compound:vv"}


def _assemble_span(tokens: List[Dict], idx_set: Set[int]) -> str:
    if not idx_set:
        return ""
    indices = sorted(idx_set)
    left, right = indices[0], indices[-1]
    forms = [tokens[i]["form"] for i in range(left, right + 1)]
    text = " ".join(forms)
    text = re.sub(r"\s+([,.;:])", r"\1", text)
    text = re.sub(r"\(\s+", "(", text)
    text = re.sub(r"\s+\)", ")", text)
    return cleanup_vi_tokens(text)


def _collect_with_dependents(tokens: List[Dict], root: int, labels: Set[str]) -> Set[int]:
    to_visit = [root]
    collected: Set[int] = set()
    while to_visit:
        cur = to_visit.pop()
        if cur in collected:
            continue
        collected.add(cur)
        for i, tok in enumerate(tokens):
            if tok.get("head") == cur + 1 and tok.get("depLabel", "").lower() in labels:
                to_visit.append(i)
    return collected


def _verb_phrase(tokens: List[Dict], v_idx: int) -> str:
    idxs = {v_idx}
    for i, tok in enumerate(tokens):
        if tok.get("head") == v_idx + 1 and tok.get("depLabel", "").lower() in VP_AUX_LABELS:
            idxs.add(i)
    return _assemble_span(tokens, idxs)


def extract_triples_with_vncorenlp(text: str, nlp) -> List[Dict[str, str]]:
    text = normalize_text(text)
    triples: List[Dict[str, str]] = []
    # Split into smaller chunks (articles -> khoản) to improve parsing quality
    article_chunks = split_articles(text)
    sentences_all: List[List[Dict]] = []
    for art in article_chunks:
        for kc in split_khoan(art):
            sentences_all.extend(nlp.annotate(kc))
    prev_subject = ""
    sentences = sentences_all
    for sent in sentences:
        for v_idx, tok in enumerate(sent):
            form = (tok.get("form") or "").lower()
            pos = (tok.get("posTag") or "").upper()
            if pos.startswith("V") or form == "là":
                subj_indices = [i for i, t in enumerate(sent) if t.get("head") == v_idx + 1 and t.get("depLabel", "").lower() in SUBJ_LABELS]
                obj_indices = [i for i, t in enumerate(sent) if t.get("head") == v_idx + 1 and t.get("depLabel", "").lower() in OBJ_LABELS]
                obl_indices = [i for i, t in enumerate(sent) if t.get("head") == v_idx + 1 and t.get("depLabel", "").lower() in OBL_LABELS]
                comp_indices = [i for i, t in enumerate(sent) if t.get("head") == v_idx + 1 and t.get("depLabel", "").lower() in ATTR_LABELS]

                predicate = _verb_phrase(sent, v_idx) or sent[v_idx]["form"]

                def build_np(idx: int) -> str:
                    span = {idx}
                    span |= _collect_with_dependents(sent, idx, NP_MOD_LABELS)
                    return _assemble_span(sent, span)

                subjects = [build_np(i) for i in subj_indices]
                objects = [build_np(i) for i in obj_indices] or [build_np(i) for i in obl_indices] or [build_np(i) for i in comp_indices]

                for s_text in subjects or [""]:
                    for o_text in objects or [""]:
                        s_clean = cleanup_vi_tokens(s_text) or "Người"
                        s_clean = normalize_entities(s_clean)
                        s_clean = resolve_pronouns(prev_subject, s_clean)
                        p_clean = cleanup_vi_tokens(predicate)
                        o_clean = cleanup_vi_tokens(o_text)
                        if not p_clean or not o_clean:
                            continue
                        triples.append({"subject": s_clean, "predicate": p_clean, "object": o_clean})
                        prev_subject = s_clean

                # Nominal predicate with 'là'
                if form == 'là':
                    subj_indices = [i for i, t in enumerate(sent) if t.get("head") == v_idx + 1 and t.get("depLabel", "").lower() in SUBJ_LABELS]
                    obj_np = [i for i, t in enumerate(sent) if t.get("head") == v_idx + 1 and t.get("depLabel", "").lower() in ATTR_LABELS]
                    for si in subj_indices:
                        s_clean = cleanup_vi_tokens(_assemble_span(sent, _collect_with_dependents(sent, si, NP_MOD_LABELS))) or "Người"
                        s_clean = normalize_entities(s_clean)
                        s_clean = resolve_pronouns(prev_subject, s_clean)
                        for oi in obj_np:
                            o_clean = cleanup_vi_tokens(_assemble_span(sent, _collect_with_dependents(sent, oi, NP_MOD_LABELS)))
                            if o_clean:
                                triples.append({"subject": s_clean, "predicate": "là", "object": o_clean})
                                prev_subject = s_clean
    # Dedup
    uniq: List[Dict[str, str]] = []
    seen = set()
    for t in triples:
        key = (t["subject"].lower(), t["predicate"].lower(), t["object"].lower())
        if key not in seen:
            seen.add(key)
            uniq.append(t)
    return uniq


# --------------------------
# Regex fallback extractor (no VNCoreNLP required)
# --------------------------
ENUM_OFFENSE_RE = re.compile(r"Đi\S*\s+(\d+)\s*\((tội[^);]+)\)", re.IGNORECASE)
# Heading style: "Điều 174. Tội lừa đảo chiếm đoạt tài sản" (no parentheses)
ARTICLE_OFFENSE_TITLE_RE = re.compile(r"Đi\S*\s+(\d+)\s*[\.|:–-]?\s*(tội\s+[^\n\r\.;:]+)", re.IGNORECASE)
GEN_OFFENSE_RE = re.compile(r"\b(tội\s+[^\.;:\n\(\)]+)\s*\(\s*Đi\S*\s*(\d+)\s*\)", re.IGNORECASE)
LIABILITY_RE = re.compile(r"\b(không\s+)?chịu\s+trách\s+nhiệm\s+hình\s+sự(?:\s+(?:về|đối\s+với))?\s+([^.;:\n]+)", re.IGNORECASE)
SUBJECT_LIABILITY_RE = re.compile(r"\b(?P<subject>Người[^\.;:\n]+?)\s+(?P<neg>không\s+)?chịu\s+trách\s+nhiệm\s+hình\s+sự(?:\s+(?:về|đối\s+với))?\s+(?P<object>[^.;:\n]+)", re.IGNORECASE)
EXEMPT_RE = re.compile(r"\bđược\s+miễn\s+trách\s+nhiệm\s+hình\s+sự(?:\s+(?:về|đối\s+với))?\s*([^.;:\n]+)?", re.IGNORECASE)
PENALTY_RE = re.compile(r"\bbị\s+phạt\s+([^.;:\n]+)", re.IGNORECASE)
PENALTY2_RE = re.compile(r"\bbị\s+xử\s+phạt\s+([^.;:\n]+)", re.IGNORECASE)
INCLUDE_RE = re.compile(r"\b(Hình\s+phạt\s+(?:chính|bổ\s*sung))\s+bao\s+gồm\s*:\s*([^\n\.]*)", re.IGNORECASE)
RIGHT_RE = re.compile(r"\bcó\s+(quyền|nghĩa\s+vụ)\s+([^.;:\n]+)", re.IGNORECASE)
MUST_RE = re.compile(r"\bphải\s+([^.;:\n]+)", re.IGNORECASE)
PERMIT_RE = re.compile(r"\bđược\s+(phép|quyền)\s+([^.;:\n]+)", re.IGNORECASE)
FORBID_RE = re.compile(r"\bkhông\s+được\s+(?:phép\s+)?([^.;:\n]+)", re.IGNORECASE)
APPLY_RE = re.compile(r"\b(được|bị)?\s*áp\s+dụng\s+(?:đối\s+với\s+)?([^.;:\n]+)", re.IGNORECASE)
COURT_RE = re.compile(r"\bTòa\s+án\s+(quyết\s+định|giao|tước)\s+([^.;:\n]+)", re.IGNORECASE)


def extract_triples_regex(text: str) -> List[Dict[str, str]]:
    s = normalize_text(text)
    triples: List[Dict[str, str]] = []
    subject_spans: List[tuple[int, str]] = []  # (end_index, subject)

    # Subject-specific liability clauses
    for m in SUBJECT_LIABILITY_RE.finditer(s):
        subj = cleanup_vi_tokens(m.group('subject'))
        pred = "không chịu trách nhiệm hình sự" if m.group('neg') else "chịu trách nhiệm hình sự về"
        obj = cleanup_vi_tokens(m.group('object'))
        triples.append({"subject": subj, "predicate": pred, "object": obj})
        subject_spans.append((m.end(), subj))

    # Enumerated offenses like: "Điều 12 (tội hiếp dâm)"
    for m in ENUM_OFFENSE_RE.finditer(s):
        dieu = m.group(1)
        crime = cleanup_vi_tokens(m.group(2))
        obj = f"{crime} (Điều {dieu})"
        subj = "Người"
        for end_idx, cand in subject_spans[::-1]:
            if end_idx <= m.start() and (m.start() - end_idx) < 4000:
                subj = cand
                break
        triples.append({"subject": subj, "predicate": "phạm", "object": obj})

    # Heading offenses like: "Điều 174. Tội lừa đảo chiếm đoạt tài sản"
    for m in ARTICLE_OFFENSE_TITLE_RE.finditer(s):
        dieu = m.group(1)
        crime = cleanup_vi_tokens(m.group(2))
        obj = f"{crime} (Điều {dieu})"
        subj = "Người"
        for end_idx, cand in subject_spans[::-1]:
            if end_idx <= m.start() and (m.start() - end_idx) < 4000:
                subj = cand
                break
        triples.append({"subject": subj, "predicate": "phạm", "object": obj})

    # Generic offenses "tội ... (Điều n)" anywhere
    for m in GEN_OFFENSE_RE.finditer(s):
        dieu = m.group(2)
        crime = cleanup_vi_tokens(m.group(1))
        obj = f"{crime} (Điều {dieu})"
        subj = "Người"
        for end_idx, cand in subject_spans[::-1]:
            if end_idx <= m.start() and (m.start() - end_idx) < 4000:
                subj = cand
                break
        triples.append({"subject": subj, "predicate": "phạm", "object": obj})

    # Liability sentences
    for m in LIABILITY_RE.finditer(s):
        neg = m.group(1)
        obj = cleanup_vi_tokens(m.group(2))
        pred = "không chịu trách nhiệm hình sự" if neg else "chịu trách nhiệm hình sự về"
        triples.append({"subject": "Người", "predicate": pred, "object": obj})

    # Rights & obligations
    for m in RIGHT_RE.finditer(s):
        kind = m.group(1).lower()
        obj = cleanup_vi_tokens(m.group(2))
        pred = "có quyền" if "quyền" in kind else "có nghĩa vụ"
        triples.append({"subject": "Người", "predicate": pred, "object": obj})

    # Must (obligation)
    for m in MUST_RE.finditer(s):
        obj = cleanup_vi_tokens(m.group(1))
        triples.append({"subject": "Người", "predicate": "phải", "object": obj})

    # Permitted
    for m in PERMIT_RE.finditer(s):
        obj = cleanup_vi_tokens(m.group(2))
        triples.append({"subject": "Người", "predicate": "được phép", "object": obj})

    # Forbidden
    for m in FORBID_RE.finditer(s):
        obj = cleanup_vi_tokens(m.group(1))
        triples.append({"subject": "Người", "predicate": "không được phép", "object": obj})

    # Apply (áp dụng)
    for m in APPLY_RE.finditer(s):
        aux = (m.group(1) or "được").strip()
        obj = cleanup_vi_tokens(m.group(2))
        pred = f"{aux} áp dụng"
        triples.append({"subject": "Người", "predicate": pred, "object": obj})

    # Court actions
    for m in COURT_RE.finditer(s):
        action = cleanup_vi_tokens(m.group(1))
        obj = cleanup_vi_tokens(m.group(2))
        triples.append({"subject": "Tòa án", "predicate": action, "object": obj})

    # Include lists like: "Hình phạt chính bao gồm: a, b, c" (and variants)
    for m in re.finditer(r"\b(Hình\s+phạt\s+(?:chính|bổ\s*sung))\s+(?:bao\s+gồm|gồm|gồm\s+có|kể\s+cả|như\s+sau)\s*:?\s*([^\n\.]*)", s, re.IGNORECASE):
        subj = normalize_terms(m.group(1))
        items = m.group(2)
        parts = re.split(r",|\bvà\b|\bhoặc\b", items)
        for p in parts:
            obj = normalize_terms(p.strip())
            if obj:
                triples.append({"subject": subj, "predicate": "bao gồm", "object": obj})

    # Exemption
    for m in EXEMPT_RE.finditer(s):
        obj = cleanup_vi_tokens(m.group(1) or "")
        if obj:
            triples.append({"subject": "Người", "predicate": "được miễn trách nhiệm hình sự", "object": obj})

    # Penalties
    for m in PENALTY_RE.finditer(s):
        obj = cleanup_vi_tokens(m.group(1))
        triples.append({"subject": "Người", "predicate": "bị phạt", "object": obj})
    for m in PENALTY2_RE.finditer(s):
        obj = cleanup_vi_tokens(m.group(1))
        triples.append({"subject": "Người", "predicate": "bị xử phạt", "object": obj})

    # Catch "mọi tội phạm ..." as liability
    for m in re.finditer(r"\bmọi\s+tội\s+phạm[^.;:\n]*", s, re.IGNORECASE):
        obj = cleanup_vi_tokens(m.group(0))
        triples.append({"subject": "Người", "predicate": "chịu trách nhiệm hình sự về", "object": obj})

    # Normalize, split compound objects, extract article_number and dedup
    uniq: List[Dict[str, str]] = []
    seen = set()
    for t in triples:
        subj_n = normalize_terms(t.get("subject", ""))
        obj_n = normalize_terms(t.get("object", ""))
        pred_n = cleanup_vi_tokens(t.get("predicate", ""))
        # Split compound objects by conjunctions
        obj_parts = re.split(r"\s+(?:và|hoặc|cũng như|đồng thời)\s+", obj_n)
        for obj_piece in obj_parts:
            obj_piece = obj_piece.strip().strip(',;')
            if not obj_piece:
                continue
            art_match = re.search(r"Điều\s+(\d+)", obj_piece, re.IGNORECASE)
            article_number = art_match.group(1) if art_match else None
            key = (subj_n.lower(), pred_n.lower(), obj_piece.lower())
            if key in seen:
                continue
            seen.add(key)
            rec = {"subject": subj_n, "predicate": pred_n, "object": obj_piece}
            if article_number:
                rec["article_number"] = article_number
            uniq.append(rec)
    return uniq


# --------------------------
# Export helpers
# --------------------------
def export_table(triples: List[Dict[str, str]], out_path: str) -> str:
    if not triples:
        raise ValueError("Không có dữ liệu để xuất.")
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


# --------------------------
# Optional Gemini refine
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
# CLI
# --------------------------
def main():
    parser = argparse.ArgumentParser(description="Extract SVO triples from Vietnamese legal PDF using VNCoreNLP.")
    parser.add_argument("--pdf", required=True, help="Đường dẫn file PDF")
    parser.add_argument("--start", type=int, required=True, help="Trang bắt đầu (>=1)")
    parser.add_argument("--end", type=int, required=True, help="Trang kết thúc (>=start)")
    parser.add_argument("--output", default="triples_actions.json", help="File JSON đầu ra")
    parser.add_argument("--xlsx", help="Xuất thêm Excel/CSV (nếu .xlsx sẽ ưu tiên Excel; thiếu pandas sẽ fallback CSV)")
    parser.add_argument("--vncorenlp-dir", help="Thư mục mô hình VNCoreNLP (tuỳ chọn)")
    parser.add_argument("--heap", default="-Xmx2g", help="Dung lượng heap JVM cho VNCoreNLP")
    parser.add_argument("--gemini", action="store_true", help="Dùng Google Gemini để refine kết quả")
    parser.add_argument("--gemini-key", help="Gemini API key hoặc đặt biến GEMINI_API_KEY")
    args = parser.parse_args()

    pdf_path = args.pdf
    if not os.path.isfile(pdf_path):
        candidate = os.path.join("Idea", pdf_path)
        if os.path.isfile(candidate):
            pdf_path = candidate
    if not os.path.isfile(pdf_path):
        raise FileNotFoundError(f"Không tìm thấy file PDF: {pdf_path}")

    raw = extract_text_from_pdf(pdf_path, args.start, args.end)

    triples: List[Dict[str, str]]
    try:
        nlp = init_vncorenlp(model_dir=args.vncorenlp_dir, heap=args.heap)
        triples = extract_triples_with_vncorenlp(raw, nlp)
    except RuntimeError as e:
        print(f"[WARN] VNCoreNLP không sẵn sàng ({e}). Dùng regex fallback.")
        triples = extract_triples_regex(raw)

    if args.gemini:
        api_key = args.gemini_key or os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise RuntimeError("Thiếu Gemini API key. Truyền --gemini-key hoặc đặt biến GEMINI_API_KEY.")
        triples = refine_with_gemini(triples, api_key=api_key)

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
