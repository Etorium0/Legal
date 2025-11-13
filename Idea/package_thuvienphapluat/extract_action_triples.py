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

def extract_text_from_pdf(file_path: str, start_page: int, end_page: int, use_pdfminer: bool = False) -> str:
    """Extract text using PyPDF2 by default; optionally pdfminer.six for better OCR/scan handling."""
    if use_pdfminer:
        try:
            from pdfminer.high_level import extract_text  # type: ignore
            pages = list(range(max(0, start_page - 1), end_page))
            return extract_text(file_path, page_numbers=pages) or ""
        except Exception as e:
            print(f"[WARN] pdfminer extract lỗi ({e}). Fallback PyPDF2.")
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
MUC_SPLIT_RE = re.compile(r'(?=\bMục\s+\d+\b)', re.IGNORECASE)

CLAUSE_CONJ_RE = re.compile(r'\s+(và|hoặc|đồng thời|cũng như)\s+', re.IGNORECASE)

PRONOUNS = {"người này", "họ", "người đó"}

def split_articles(text: str) -> List[str]:
    # First split by Mục (if any), then further split by Điều to keep blocks manageable
    parts_muc = [p.strip() for p in MUC_SPLIT_RE.split(text) if p.strip()]
    parts: List[str] = []
    for seg in parts_muc:
        parts.extend([p.strip() for p in ARTICLE_SPLIT_RE.split(seg) if p.strip()])
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
    # If filename ends with .jsonl, write JSON Lines (one object per line)
    if out_path.lower().endswith('.jsonl'):
        with open(out_path, 'w', encoding='utf-8') as f:
            for t in triples:
                f.write(json.dumps(t, ensure_ascii=False) + "\n")
    else:
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

    # Tìm file jar: ưu tiên trong thư mục chỉ định; nếu không, tìm đệ quy
    jar_path = None
    direct_jars = [f for f in os.listdir(model_dir) if f.lower().startswith("vncorenlp") and f.endswith(".jar")]
    if direct_jars:
        jar_path = os.path.join(model_dir, direct_jars[0])
    else:
        for root, _, files in os.walk(model_dir):
            for f in files:
                if f.lower().startswith("vncorenlp") and f.endswith(".jar"):
                    jar_path = os.path.join(root, f)
                    break
            if jar_path:
                break
    if not jar_path:
        raise RuntimeError(
            "Không tìm thấy file jar VNCoreNLP trong thư mục: "
            f"{model_dir}. Hãy build hoặc tải VnCoreNLP-*.jar (ví dụ bằng Maven: mvn -q -DskipTests package)."
        )

    annotators = "wseg,pos,parse"

    # Kiểm tra thư mục models/* (wordsegmenter, postagger, dependency)
    # Xác định thư mục models hợp lệ (có thể nằm cạnh model_dir hoặc cạnh jar)
    candidate_models = [
        os.path.join(model_dir, "models"),
        os.path.join(os.path.dirname(jar_path), "models"),
        os.path.join(os.path.dirname(os.path.dirname(jar_path)), "models"),
    ]
    models_dir = next((p for p in candidate_models if os.path.isdir(p)), None)
    if not models_dir:
        raise RuntimeError(
            "Thiếu thư mục models/ cho VNCoreNLP (wordsegmenter, postagger, dependency).\n"
            f"Đã kiểm tra: {candidate_models}"
        )

    # Kiểm tra Java
    if not _java_exists():
        raise RuntimeError("Không tìm thấy 'java' trong PATH. Cài đặt Java JRE/JDK rồi thử lại.")

    try:
        # Truyền đường dẫn file jar thay vì thư mục, phù hợp với wrapper vncorenlp
        return VnCoreNLP(jar_path, annotators=annotators, max_heap_size=heap)
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
    # Guard: if VNCoreNLP returns tokens as strings (no dep parse), fallback to regex
    if sentences_all and sentences_all[0] and not isinstance(sentences_all[0][0], dict):
        return extract_triples_regex(text)
    prev_subject = ""
    sentences = sentences_all
    for sent in sentences:
        if not sent or (sent and not isinstance(sent[0], dict)):
            # Skip malformed sentences (no dependency info)
            continue
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
KHONG_TRUY_CUU_RE = re.compile(r"\bkhông\s+bị\s+truy\s+cứu\s+trách\s+nhiệm\s+hình\s+sự(?:\s+(?:về|đối\s+với))?\s*([^.;:\n]+)?", re.IGNORECASE)
TRUY_CUU_RE = re.compile(r"\btruy\s+cứu\s+trách\s+nhiệm\s+hình\s+sự(?:\s+(?:về|đối\s+với))?\s+([^.;:\n]+)", re.IGNORECASE)
MIEN_HINH_PHAT_RE = re.compile(r"\bđược\s+miễn\s+hình\s+phạt\b([^.;:\n]*)", re.IGNORECASE)
GIAM_NHE_HP_RE = re.compile(r"\bđược\s+giảm\s+nhẹ\s+hình\s+phạt\b([^.;:\n]*)", re.IGNORECASE)
PENALTY_RE = re.compile(r"\bbị\s+phạt\s+([^.;:\n]+)", re.IGNORECASE)
PENALTY2_RE = re.compile(r"\bbị\s+xử\s+phạt\s+([^.;:\n]+)", re.IGNORECASE)
PENALTY_TU_RE = re.compile(r"\b(?:bị\s+)?phạt\s+tù\s*([^.;:\n]*)", re.IGNORECASE)
# High-recall penalty variants
PENALTY_FINE_RE = re.compile(r"\b(?:bị\s+)?phạt\s+tiền\s+([^.;:\n]+)", re.IGNORECASE)
PENALTY_NON_CUSTODIAL_RE = re.compile(r"\b(?:bị\s+)?phạt\s+cải\s+tạo\s+không\s+giam\s+giữ\s+([^.;:\n]+)", re.IGNORECASE)
PENALTY_WARNING_RE = re.compile(r"\b(?:bị\s+)?phạt\s+cảnh\s+cáo\b([^.;:\n]*)", re.IGNORECASE)
PENALTY_LIFE_RE = re.compile(r"\b(?:bị\s+)?phạt\s+tù\s+chung\s+thân\b", re.IGNORECASE)
PENALTY_DEATH_RE = re.compile(r"\b(?:bị\s+)?tử\s+hình\b", re.IGNORECASE)
CAM_DAM_NHIEM_RE = re.compile(r"\bbị\s+cấm\s+đảm\s+nhiệm\s+[^.;:\n]+", re.IGNORECASE)
TUOC_QUYEN_RE = re.compile(r"\bbị\s+tước\s+[^.;:\n]+", re.IGNORECASE)
TRUC_XUAT_RE = re.compile(r"\bbị\s+trục\s+xuất\b[^.;:\n]*", re.IGNORECASE)
QUAN_CHE_RE = re.compile(r"\bbị\s+quản\s+chế\b[^.;:\n]*", re.IGNORECASE)
CAM_CU_TRU_RE = re.compile(r"\bbị\s+cấm\s+cư\s+trú\b[^.;:\n]*", re.IGNORECASE)
TICH_THU_RE = re.compile(r"\bbị\s+tịch\s+thu\b[^.;:\n]*", re.IGNORECASE)
BUOC_RE = re.compile(r"\bbuộc\s+([^.;:\n]+)", re.IGNORECASE)
DINH_CHI_RE = re.compile(r"\bđình\s+chỉ\s+([^.;:\n]+)", re.IGNORECASE)
CO_TRACH_NHIEM_RE = re.compile(r"\bcó\s+trách\s+nhiệm\s+([^.;:\n]+)", re.IGNORECASE)
INCLUDE_RE = re.compile(r"\b(Hình\s+phạt\s+(?:chính|bổ\s*sung))\s+bao\s+gồm\s*:\s*([^\n\.]*)", re.IGNORECASE)
LIST_BLOCK_RE = re.compile(
    r"\b((?:Hình\s+phạt\s+(?:chính|bổ\s*sung))|Tình\s+tiết\s+(?:tăng\s+nặng|giảm\s+nhẹ)|Tình\s+tiết\s+định\s+khung|(?:Các|Những)\s+hành\s+vi(?:\s+bị\s+cấm)?|Hành\s+vi(?:\s+bị\s+cấm)?|(?:Các|Những)\s+trường\s+hợp)\s+(?:bao\s+gồm|gồm|gồm\s+có|kể\s+cả|như\s+sau)\s*:?[\s\u2028\u2029]*([\s\S]{1,2000}?)\s*(?=(?:\n\s*\n)|(?:\bĐi\S*\s+\d+\b)|$)",
    re.IGNORECASE,
)

# Conditional and supplemental clauses
COULD_BE_PENALIZED_RE = re.compile(r"\b(còn\s+có\s+thể\s+bị|có\s+thể\s+bị)\s+([^.;:\n]+)", re.IGNORECASE)

# Generic subject patterns
NGUOI_NAO_THI_RE = re.compile(r"\b(Người\s+nào|Người\s+phạm\s+tội|Pháp\s+nhân\s+thương\s+mại|Người\s+từ\s+[^;:\n]+)\s+([^.;:\n]+?)\s+thì\s+([^.;:\n]+)", re.IGNORECASE)

# Subject-bound generic action templates
SUBJECT_BI_RE = re.compile(r"\b(?P<subject>(?:Người|Pháp\s+nhân)[^.;:\n]{0,80}?)\s+bị\s+(?P<object>[^.;:\n]+)", re.IGNORECASE)
SUBJECT_DUOC_RE = re.compile(r"\b(?P<subject>(?:Người|Pháp\s+nhân)[^.;:\n]{0,80}?)\s+được\s+(?P<object>[^.;:\n]+)", re.IGNORECASE)
SUBJECT_KHONG_DUOC_RE = re.compile(r"\b(?P<subject>(?:Người|Pháp\s+nhân)[^.;:\n]{0,80}?)\s+không\s+được\s+(?P<object>[^.;:\n]+)", re.IGNORECASE)
SUBJECT_PHAI_RE = re.compile(r"\b(?P<subject>(?:Người|Pháp\s+nhân)[^.;:\n]{0,80}?)\s+phải\s+(?P<object>[^.;:\n]+)", re.IGNORECASE)
SUBJECT_CO_QUYEN_RE = re.compile(r"\b(?P<subject>(?:Người|Pháp\s+nhân)[^.;:\n]{0,80}?)\s+có\s+quyền\s+(?P<object>[^.;:\n]+)", re.IGNORECASE)
SUBJECT_CO_NGHIA_VU_RE = re.compile(r"\b(?P<subject>(?:Người|Pháp\s+nhân)[^.;:\n]{0,80}?)\s+có\s+nghĩa\s+vụ\s+(?P<object>[^.;:\n]+)", re.IGNORECASE)
RIGHT_RE = re.compile(r"\bcó\s+(quyền|nghĩa\s+vụ)\s+([^.;:\n]+)", re.IGNORECASE)
MUST_RE = re.compile(r"\bphải\s+([^.;:\n]+)", re.IGNORECASE)
PERMIT_RE = re.compile(r"\bđược\s+(phép|quyền)\s+([^.;:\n]+)", re.IGNORECASE)
FORBID_RE = re.compile(r"\bkhông\s+được\s+(?:phép\s+)?([^.;:\n]+)", re.IGNORECASE)
APPLY_RE = re.compile(r"\b(được|bị)?\s*áp\s+dụng\s+(?:đối\s+với\s+)?([^.;:\n]+)", re.IGNORECASE)
COURT_RE = re.compile(r"\bTòa\s+án\s+(quyết\s+định|giao|tước)\s+([^.;:\n]+)", re.IGNORECASE)


def _split_compound_objects(obj_text: str, aggressive: bool = False) -> List[str]:
    if not obj_text:
        return []
    s = obj_text
    # Normalize bullets like a) b) 1) into a common delimiter
    if aggressive:
        s = re.sub(r"(?<![\w])([a-z])\)", r" || ", s, flags=re.IGNORECASE)
        s = re.sub(r"(?<![\w])(\d+)\)", r" || ", s)
        s = s.replace(";", " || ")
        # Split bullets/hyphens and newlines
        s = re.sub(r"\n\s*[•\-–]\s*", " || ", s)
        s = s.replace("\n", " || ")
    parts = re.split(r"\s+(?:và|hoặc|cũng như|đồng thời)\s+|\|\|", s, flags=re.IGNORECASE)
    out = []
    for p in parts:
        q = p.strip().strip(',;:')
        if q:
            out.append(q)
    return out


def extract_triples_regex(text: str, aggressive: bool = False) -> List[Dict[str, str]]:
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

    # Include lists like multi-line: "Hình phạt chính/bổ sung ... bao gồm: ..." and other list subjects
    for m in LIST_BLOCK_RE.finditer(s):
        subj = normalize_terms(m.group(1))
        block = m.group(2)
        # Normalize bullets into delimiters
        block2 = re.sub(r"(?<![\w])([a-z])\)", r" || ", block, flags=re.IGNORECASE)
        block2 = re.sub(r"(?<![\w])(\d+)\)", r" || ", block2)
        block2 = block2.replace(";", " || ")
        block2 = block2.replace("\n", " || ")
        parts = re.split(r"\|\||,|\bvà\b|\bhoặc\b", block2, flags=re.IGNORECASE)
        for p in parts:
            obj = normalize_terms(p.strip().strip(',;:'))
            if obj:
                triples.append({"subject": subj, "predicate": "bao gồm", "object": obj})

    # Exemption
    for m in EXEMPT_RE.finditer(s):
        obj = cleanup_vi_tokens(m.group(1) or "")
        if obj:
            triples.append({"subject": "Người", "predicate": "được miễn trách nhiệm hình sự", "object": obj})
    for m in KHONG_TRUY_CUU_RE.finditer(s):
        obj = cleanup_vi_tokens(m.group(1) or "")
        pred = "không bị truy cứu trách nhiệm hình sự"
        triples.append({"subject": "Người", "predicate": pred, "object": obj})
    for m in TRUY_CUU_RE.finditer(s):
        obj = cleanup_vi_tokens(m.group(1))
        triples.append({"subject": "Người", "predicate": "truy cứu trách nhiệm hình sự về", "object": obj})
    for m in MIEN_HINH_PHAT_RE.finditer(s):
        obj = cleanup_vi_tokens(m.group(1) or "")
        triples.append({"subject": "Người", "predicate": "được miễn hình phạt", "object": obj})
    for m in GIAM_NHE_HP_RE.finditer(s):
        obj = cleanup_vi_tokens(m.group(1) or "")
        triples.append({"subject": "Người", "predicate": "được giảm nhẹ hình phạt", "object": obj})

    # Penalties
    for m in PENALTY_RE.finditer(s):
        obj = cleanup_vi_tokens(m.group(1))
        triples.append({"subject": "Người", "predicate": "bị phạt", "object": obj})
    for m in PENALTY2_RE.finditer(s):
        obj = cleanup_vi_tokens(m.group(1))
        triples.append({"subject": "Người", "predicate": "bị xử phạt", "object": obj})
    for m in PENALTY_TU_RE.finditer(s):
        obj = cleanup_vi_tokens(m.group(1) or "tù")
        obj = ("tù " + obj).strip()
        triples.append({"subject": "Người", "predicate": "bị phạt", "object": obj})
    for m in PENALTY_FINE_RE.finditer(s):
        obj = cleanup_vi_tokens(m.group(1))
        triples.append({"subject": "Người", "predicate": "bị phạt tiền", "object": obj})
    for m in PENALTY_NON_CUSTODIAL_RE.finditer(s):
        obj = cleanup_vi_tokens(m.group(1))
        triples.append({"subject": "Người", "predicate": "bị phạt cải tạo không giam giữ", "object": obj})
    for m in PENALTY_WARNING_RE.finditer(s):
        obj = cleanup_vi_tokens(m.group(1) or "")
        triples.append({"subject": "Người", "predicate": "bị phạt cảnh cáo", "object": obj})
    for m in PENALTY_LIFE_RE.finditer(s):
        triples.append({"subject": "Người", "predicate": "bị phạt tù", "object": "chung thân"})
    for m in PENALTY_DEATH_RE.finditer(s):
        triples.append({"subject": "Người", "predicate": "bị", "object": "tử hình"})

    # Conditional supplemental penalties
    for m in COULD_BE_PENALIZED_RE.finditer(s):
        obj = cleanup_vi_tokens(m.group(2))
        triples.append({"subject": "Người", "predicate": "có thể bị", "object": obj})

    # "Người nào ... thì ..." pattern => two triples: action + consequence (if extractable)
    for m in NGUOI_NAO_THI_RE.finditer(s):
        subj_raw = m.group(1)
        act = cleanup_vi_tokens(m.group(2))
        consq = cleanup_vi_tokens(m.group(3))
        subj = normalize_terms(subj_raw)
        if act:
            triples.append({"subject": subj, "predicate": "thực hiện", "object": act})
        if consq:
            # Try map typical consequence starters to predicate
            if consq.lower().startswith("bị "):
                triples.append({"subject": subj, "predicate": "bị", "object": consq[3:].strip()})
            elif consq.lower().startswith("phải "):
                triples.append({"subject": subj, "predicate": "phải", "object": consq[5:].strip()})
            else:
                triples.append({"subject": subj, "predicate": "chịu", "object": consq})

    # Subject-bound generic actions (captures more specific subjects)
    for pat, pred in [
        (SUBJECT_BI_RE, "bị"),
        (SUBJECT_DUOC_RE, "được"),
        (SUBJECT_KHONG_DUOC_RE, "không được"),
        (SUBJECT_PHAI_RE, "phải"),
        (SUBJECT_CO_QUYEN_RE, "có quyền"),
        (SUBJECT_CO_NGHIA_VU_RE, "có nghĩa vụ"),
    ]:
        for m in pat.finditer(s):
            subj = normalize_terms(cleanup_vi_tokens(m.group('subject')))
            obj = cleanup_vi_tokens(m.group('object'))
            if subj and obj:
                triples.append({"subject": subj, "predicate": pred, "object": obj})
    for m in CAM_DAM_NHIEM_RE.finditer(s):
        triples.append({"subject": "Người", "predicate": "bị cấm đảm nhiệm", "object": cleanup_vi_tokens(m.group(0).split("bị cấm đảm nhiệm",1)[-1])})
    for m in TUOC_QUYEN_RE.finditer(s):
        triples.append({"subject": "Người", "predicate": "bị tước", "object": cleanup_vi_tokens(m.group(0).split("bị",1)[-1])})
    for m in TRUC_XUAT_RE.finditer(s):
        triples.append({"subject": "Người", "predicate": "bị trục xuất", "object": cleanup_vi_tokens(m.group(0).split("bị trục xuất",1)[-1])})
    for m in QUAN_CHE_RE.finditer(s):
        triples.append({"subject": "Người", "predicate": "bị quản chế", "object": cleanup_vi_tokens(m.group(0).split("bị quản chế",1)[-1])})
    for m in CAM_CU_TRU_RE.finditer(s):
        triples.append({"subject": "Người", "predicate": "bị cấm cư trú", "object": cleanup_vi_tokens(m.group(0).split("bị cấm cư trú",1)[-1])})
    for m in TICH_THU_RE.finditer(s):
        triples.append({"subject": "Người", "predicate": "bị tịch thu", "object": cleanup_vi_tokens(m.group(0).split("bị tịch thu",1)[-1])})
    for m in BUOC_RE.finditer(s):
        triples.append({"subject": "Người", "predicate": "buộc", "object": cleanup_vi_tokens(m.group(1))})
    for m in DINH_CHI_RE.finditer(s):
        triples.append({"subject": "Người", "predicate": "đình chỉ", "object": cleanup_vi_tokens(m.group(1))})
    for m in CO_TRACH_NHIEM_RE.finditer(s):
        triples.append({"subject": "Người", "predicate": "có trách nhiệm", "object": cleanup_vi_tokens(m.group(1))})

    # Enumerated offenses after anchors like "một trong các điều/tội sau đây"
    anchor = re.search(r"(một\s+trong\s+các\s+(đi\S*|tội)\s+sau\s+đây|các\s+(đi\S*|tội)\s+sau\s+đây)\s*:?", s, re.IGNORECASE)
    if anchor:
        block = s[anchor.end(): anchor.end()+10000]
        for m in re.finditer(r"Đi\S*\s+(\d+)\s*\((tội[^\)]+)\)", block, re.IGNORECASE):
            art = m.group(1)
            offense = cleanup_vi_tokens(m.group(2))
            obj = f"{offense} (Điều {art})"
            triples.append({"subject": "Người từ 14–16 tuổi", "predicate": "phạm", "object": obj})
        for m in re.finditer(r"Đi\S*\s+(\d+)\s*[\.:\-]\s*(tội[^\n\r;:\.)]+)", block, re.IGNORECASE):
            art = m.group(1)
            offense = cleanup_vi_tokens(m.group(2))
            obj = f"{offense} (Điều {art})"
            triples.append({"subject": "Người từ 14–16 tuổi", "predicate": "phạm", "object": obj})

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
        # Split compound objects by conjunctions; if aggressive, also split by ';', bullets, and newlines
        obj_parts = _split_compound_objects(obj_n, aggressive=aggressive)
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
        import google.generativeai as genai  # type: ignore
    except Exception:
        print("⚠️  Chưa cài google-generativeai. Bỏ qua bước refine.")
        return triples

    try:
        genai.configure(api_key=api_key)
        mdl = genai.GenerativeModel(model)
    except Exception as e:
        print(f"[WARN] Gemini init lỗi: {e}. Bỏ qua refine.")
        return triples

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
            txt = (getattr(resp, 'text', '') or '').strip()
            m = re.search(r'\{.*\}', txt, re.DOTALL)
            if m:
                try:
                    objj = json.loads(m.group(0))
                    refined.append({
                        "subject": objj.get("subject", t["subject"]),
                        "predicate": objj.get("predicate", t["predicate"]),
                        "object": objj.get("object", t["object"]),
                    })
                except Exception:
                    refined.append(t)
            else:
                refined.append(t)
        except Exception:
            refined.append(t)
    return refined


def gemini_extract_triples(text: str, api_key: str, model: str = "gemini-2.5-flash") -> List[Dict[str, str]]:
    """Use Gemini to extract additional triples directly from text chunks.
    The function expects the model to return JSON lines: one triple per line with keys subject, predicate, object.
    """
    try:
        import google.generativeai as genai  # type: ignore
    except Exception:
        print("⚠️  Chưa cài google-generativeai. Bỏ qua bước Gemini extraction.")
        return []

    try:
        genai.configure(api_key=api_key)
        mdl = genai.GenerativeModel(model)
    except Exception as e:
        print(f"[WARN] Gemini init lỗi: {e}. Bỏ qua extraction.")
        return []

    triples: List[Dict[str, str]] = []

    # Chunk by Article to keep prompts compact
    chunks = split_articles(normalize_text(text))
    sys_prompt = (
        "Bạn là trợ lý pháp lý. Hãy trích xuất tất cả bộ ba (chủ thể, hành động, đối tượng) từ đoạn văn bản luật tiếng Việt.\n"
        "- Chủ thể là danh ngữ (ví dụ: Người, Tòa án, Cơ quan điều tra, Người từ 14–16 tuổi).\n"
        "- Hành động là động từ/cụm động từ (ví dụ: phạm, bị phạt, có quyền, có nghĩa vụ, chịu trách nhiệm hình sự về, được miễn trách nhiệm hình sự).\n"
        "- Đối tượng là danh ngữ/khái niệm pháp lý; kèm 'Điều X' nếu xuất hiện.\n"
        "- Trả về theo định dạng JSON Lines, mỗi dòng một JSON với 3 trường: subject, predicate, object.\n"
        "- Không thêm giải thích nào khác.\n"
    )

    for ch in chunks:
        prompt = sys_prompt + "\n---\n" + ch[:6000]
        try:
            resp = mdl.generate_content(prompt)
            txt = (getattr(resp, 'text', '') or '').strip()
            for line in txt.splitlines():
                line = line.strip()
                if not line or not line.startswith('{'):
                    continue
                try:
                    obj = json.loads(line)
                    s = cleanup_vi_tokens(obj.get('subject', ''))
                    p = cleanup_vi_tokens(obj.get('predicate', ''))
                    o = cleanup_vi_tokens(obj.get('object', ''))
                    if s and p and o:
                        triples.append({'subject': s, 'predicate': p, 'object': o})
                except Exception:
                    continue
        except Exception:
            continue
    return triples


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
    parser.add_argument("--jsonl", action="store_true", help="Ghi JSON Lines (mỗi dòng 1 bộ ba)")
    parser.add_argument("--vncorenlp-dir", help="Thư mục mô hình VNCoreNLP (tuỳ chọn)")
    parser.add_argument("--heap", default="-Xmx2g", help="Dung lượng heap JVM cho VNCoreNLP")
    parser.add_argument("--pdfminer", action="store_true", help="Dùng pdfminer.six để trích xuất text (tốt hơn cho PDF scan)")
    parser.add_argument("--gemini", action="store_true", help="Dùng Google Gemini để refine kết quả (chuẩn hóa)")
    parser.add_argument("--gemini-extract", action="store_true", help="Dùng Gemini để trích xuất bổ sung trước khi dedupe")
    parser.add_argument("--gemini-key", help="Gemini API key hoặc đặt biến GEMINI_API_KEY")
    parser.add_argument("--aggressive", action="store_true", help="Bùng nổ danh sách bằng dấu ';', bullets a)/1) để tăng số lượng triple")
    parser.add_argument("--hybrid", action="store_true", help="Kết hợp cả VNCoreNLP và regex để tăng recall (gộp & khử trùng)")
    parser.add_argument("--debug", action="store_true", help="In thêm thông tin chẩn đoán (chế độ VNCoreNLP/regex, độ dài văn bản)")
    args = parser.parse_args()

    pdf_path = args.pdf
    if not os.path.isfile(pdf_path):
        candidate = os.path.join("Idea", pdf_path)
        if os.path.isfile(candidate):
            pdf_path = candidate
    if not os.path.isfile(pdf_path):
        raise FileNotFoundError(f"Không tìm thấy file PDF: {pdf_path}")

    raw = extract_text_from_pdf(pdf_path, args.start, args.end, use_pdfminer=args.pdfminer if hasattr(args, 'pdfminer') else False)
    if args.debug:
        print(f"[DEBUG] Extracted chars: {len(raw)} from pages {args.start}-{args.end}")
    # Auto-enable aggressive splitting for large documents
    if not args.aggressive and len(raw) >= 200_000:
        args.aggressive = True
        if args.debug:
            print("[DEBUG] Auto-enabled aggressive splitting for large text")

    triples: List[Dict[str, str]]
    mode = "regex"
    try:
        nlp = init_vncorenlp(model_dir=args.vncorenlp_dir, heap=args.heap)
        triples = extract_triples_with_vncorenlp(raw, nlp)
        mode = "vncorenlp"
    except RuntimeError as e:
        print(f"[WARN] VNCoreNLP không sẵn sàng ({e}). Dùng regex fallback.")
        triples = extract_triples_regex(raw, aggressive=args.aggressive)

    # Nếu VNCoreNLP trả về dạng không có parse (đã có guard), vẫn rơi vào regex
    if mode == "vncorenlp" and args.debug:
        print("[DEBUG] VNCoreNLP path active. If output seems low, check if tokens include depLabel/form via unit test.")
    if mode == "regex" and args.debug:
        print("[DEBUG] Using regex fallback.")

    # Hybrid union: always or on demand combine with regex for recall
    if mode == "vncorenlp" and (args.hybrid or True):
        regex_triples = extract_triples_regex(raw, aggressive=args.aggressive)
        if args.debug:
            print(f"[DEBUG] VNCoreNLP triples: {len(triples)}; regex triples: {len(regex_triples)} -> merging")
        # Merge & dedupe
        merged = []
        seen_h = set()
        for t in (triples + regex_triples):
            k = (t['subject'].lower(), t['predicate'].lower(), t['object'].lower())
            if k not in seen_h:
                seen_h.add(k)
                merged.append(t)
        triples = merged

    api_key = args.gemini_key or os.getenv("GEMINI_API_KEY")
    if (args.gemini or args.gemini_extract) and not api_key:
        raise RuntimeError("Thiếu Gemini API key cho chức năng Gemini. Truyền --gemini-key hoặc đặt biến GEMINI_API_KEY.")

    # Gemini extraction (augmentation) before refine
    if args.gemini_extract:
        gem_add = gemini_extract_triples(raw, api_key=api_key)
        if args.debug:
            print(f"[DEBUG] Gemini extraction thêm {len(gem_add)} bộ ba (trước gộp)")
        triples.extend(gem_add)
        # Dedupe sau bổ sung
        dedup = []
        seen_aug = set()
        for t in triples:
            k = (t['subject'].lower(), t['predicate'].lower(), t['object'].lower())
            if k not in seen_aug:
                seen_aug.add(k)
                dedup.append(t)
        triples = dedup

    if args.gemini:
        triples = refine_with_gemini(triples, api_key=api_key)

    # Decide JSON format
    out_path = args.output
    if args.jsonl and not out_path.lower().endswith('.jsonl'):
        root, _ = os.path.splitext(out_path)
        out_path = root + '.jsonl'
    save_to_json(triples, out_path)
    print(f"Đã trích xuất {len(triples)} bộ ba. Đã lưu vào: {out_path}")
    if args.debug:
        print(f"[DEBUG] Mode: {mode}; aggressive={args.aggressive}")

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
