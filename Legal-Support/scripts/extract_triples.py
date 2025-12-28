"""Extract action triples (actor, action, penalty) from units into Postgres.

Usage:
  python scripts/extract_triples.py [--limit 500 --offset 0 --verbose]

Config via env:
  DATABASE_URL (default: postgres://legaluser:legalpass@localhost:5432/legaldb)

Heuristics:
  - Normalize text (lower, strip accents) to survive mojibake.
  - Prefer full patterns (penalty + actor + action); fallback to actor/action pairs plus penalty range.
  - Upsert concepts/relations; skip duplicates.
"""

from __future__ import annotations

import argparse
import os
import re
import sys
import unicodedata
import uuid
from collections import Counter
from typing import Dict, Optional

import psycopg2
from psycopg2.extras import DictCursor

DATABASE_URL = os.getenv("DATABASE_URL", "postgres://legaluser:legalpass@localhost:5432/legaldb")

# Regex patterns (Vietnamese law heuristics)
ACTOR_RE = re.compile(r"(người|cá nhân|tổ chức|chủ phương tiện|người điều khiển|người tham gia)([^,;.]+)", re.IGNORECASE)
ACTION_RE = re.compile(r"(vượt|không chấp hành|không đội|sử dụng|chở|dừng|đỗ|quay đầu|đi vào|đi ngược|điều khiển)([^,;.]+)", re.IGNORECASE)
PENALTY_RANGE_RE = re.compile(r"từ\s+([\d\.]+)\s+đồng\s+đến\s+([\d\.]+)\s+đồng", re.IGNORECASE)
PENALTY_WITH_ACTOR_ACTION_RE = re.compile(
    r"phạt tiền từ\s+([\d\.]+)\s+đồng\s+đến\s+([\d\.]+)\s+đồng\s+(?:đối với|cho)\s+([^.;:\n]+?)(?:,|:|;|\s)+(không [^.;:\n]+|vượt [^.;:\n]+|đi [^.;:\n]+|thực hiện [^.;:\n]+|sử dụng [^.;:\n]+|chở [^.;:\n]+)",
    re.IGNORECASE,
)

# Accent-stripped patterns to handle garbled text (Ph?t ti?n -> phat tien)
ACTOR_ASCII_RE = re.compile(r"(nguoi|ca nhan|to chuc|chu phuong tien|nguoi dieu khien|nguoi tham gia)([^,;.]+)", re.IGNORECASE)
ACTION_ASCII_RE = re.compile(r"(vuot|khong chap hanh|khong doi|su dung|cho|dung|do|quay dau|di vao|di nguoc|dieu khien)([^,;.]+)", re.IGNORECASE)
PENALTY_RANGE_ASCII_RE = re.compile(r"tu\s+([\d\.]+)\s+dong\s+den\s+([\d\.]+)\s+dong", re.IGNORECASE)
PENALTY_WITH_ACTOR_ACTION_ASCII_RE = re.compile(
    r"phat tien tu\s+([\d\.]+)\s+dong\s+den\s+([\d\.]+)\s+dong\s+(?:doi voi|cho)\s+([^.;:\n]+?)(?:,|:|;|\s)+(khong [^.;:\n]+|vuot [^.;:\n]+|di [^.;:\n]+|thuc hien [^.;:\n]+|su dung [^.;:\n]+|cho [^.;:\n]+)",
    re.IGNORECASE,
)

# Relation canonical names
REL_VI_PHAM = "vi_pham"
REL_PHAT_TIEN = "bi_phat_tien"
REL_QUY_DINH = "quy_dinh_ve"

# Scope patterns
SCOPE_RE = re.compile(r"(?:Luật|Bộ luật|Nghị định|Thông tư|Pháp lệnh|Quyết định) này quy định về\s+([^.;]+)", re.IGNORECASE)
SCOPE_HEADER_RE = re.compile(r"^Phạm vi điều chỉnh", re.IGNORECASE)
SCOPE_PATTERNS = [
    re.compile(r"([\w\s,]+) quy định về ([^.;]+)", re.IGNORECASE),
    re.compile(r"([\w\s,]+) bao gồm ([^.;]+)", re.IGNORECASE),
    re.compile(r"phạm vi điều chỉnh của ([\w\s,]+) là ([^.;]+)", re.IGNORECASE),
    re.compile(r"phạm vi điều chỉnh của ([\w\s,]+) bao gồm ([^.;]+)", re.IGNORECASE),
    re.compile(r"([\w\s,]+) có phạm vi điều chỉnh ([^.;]+)", re.IGNORECASE),
]

def normalize_money(val: str) -> int:
    try:
        return int(val.replace(".", ""))
    except Exception:
        return 0


def strip_accents(text: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", text) if unicodedata.category(c) != "Mn")


def clean_phrase(val: str) -> str:
    return val.strip().strip(",.;: ")


def extract_from_text(text: str) -> Dict[str, str | int]:
    """Heuristic extraction of actor/action/penalty from a unit text."""

    result: Dict[str, str | int] = {}
    text_lower = text.lower()
    text_ascii = strip_accents(text_lower)

    def apply_combined(pattern, source_text, ascii_mode: bool = False) -> Optional[Dict[str, str | int]]:
        m = pattern.search(source_text)
        if not m:
            return None
        return {
            "penalty_min": normalize_money(m.group(1)),
            "penalty_max": normalize_money(m.group(2)),
            "actor": clean_phrase(m.group(3)),
            "action": clean_phrase(m.group(4)),
            "_source": "combined_ascii" if ascii_mode else "combined_unicode",
        }

    combined_unicode = apply_combined(PENALTY_WITH_ACTOR_ACTION_RE, text_lower)
    if combined_unicode:
        return combined_unicode

    combined_ascii = apply_combined(PENALTY_WITH_ACTOR_ACTION_ASCII_RE, text_ascii, ascii_mode=True)
    if combined_ascii:
        return combined_ascii

    # Fall back to actor/action + optional penalty range; scan per clause for better alignment
    clauses = re.split(r"[.;\n]", text_lower)
    for clause in clauses:
        clause = clause.strip()
        if not clause:
            continue

        actor = ACTOR_RE.search(clause)
        action = ACTION_RE.search(clause)
        penalty = PENALTY_RANGE_RE.search(clause)

        if not actor or not action:
            actor = actor or ACTOR_ASCII_RE.search(strip_accents(clause))
            action = action or ACTION_ASCII_RE.search(strip_accents(clause))
            penalty = penalty or PENALTY_RANGE_ASCII_RE.search(strip_accents(clause))

        if actor and action:
            result["actor"] = clean_phrase(actor.group(0))
            result["action"] = clean_phrase(action.group(0))
            if penalty:
                result["penalty_min"] = normalize_money(penalty.group(1))
                result["penalty_max"] = normalize_money(penalty.group(2))
            result["_source"] = "clause_fallback"
            return result

    return result


def upsert_concept(cur, name: str, concept_type: str = "entity") -> uuid.UUID:
    cur.execute(
        """
        INSERT INTO concepts (name, concept_type)
        VALUES (%s, %s)
        ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
        RETURNING id;
        """,
        (name, concept_type),
    )
    return cur.fetchone()[0]


def upsert_relation(cur, name: str, relation_type: str = "legal_rule") -> uuid.UUID:
    cur.execute(
        """
        INSERT INTO relations (name, relation_type)
        VALUES (%s, %s)
        ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
        RETURNING id;
        """,
        (name, relation_type),
    )
    return cur.fetchone()[0]


def triple_exists(cur, subject_id, relation_id, object_id, unit_id) -> bool:
    cur.execute(
        """
        SELECT 1 FROM triples
        WHERE subject_id = %s AND relation_id = %s AND object_id = %s AND unit_id = %s
        LIMIT 1;
        """,
        (subject_id, relation_id, object_id, unit_id),
    )
    return cur.fetchone() is not None


def insert_triple(cur, subject_id, relation_id, object_id, unit_id, doc_ref: str, tfidf: float = 0.5, confidence: float = 0.8):
    cur.execute(
        """
        INSERT INTO triples (subject_id, relation_id, object_id, unit_id, doc_ref, tfidf, confidence)
        VALUES (%s, %s, %s, %s, %s, %s, %s);
        """,
        (subject_id, relation_id, object_id, unit_id, doc_ref, tfidf, confidence),
    )


def build_doc_ref(doc_title: str, doc_number: Optional[str], unit_code: Optional[str]) -> str:
    parts = []
    if doc_number:
        parts.append(doc_number)
    elif doc_title:
        parts.append(doc_title)
    if unit_code:
        parts.append(unit_code)
    return " - ".join(parts) if parts else "unknown"


def process_units(cur, rel_vi_pham_id, rel_phat_tien_id, rel_quy_dinh_id, limit: int, offset: int, verbose: bool) -> Counter:
    cur.execute(
        """
        SELECT u.id as unit_id, u.text, u.code, d.title, d.number
        FROM units u
        JOIN documents d ON d.id = u.document_id
        ORDER BY u.id
        LIMIT %s OFFSET %s;
        """,
        (limit, offset),
    )

    stats = Counter()
    rows = cur.fetchall()
    for row in rows:
        text = row["text"] or ""
        code = row["code"] or None
        doc_ref = build_doc_ref(row["title"], row["number"], code)

        # 1. Check for Scope/Regulation
        scope_match = SCOPE_RE.search(text)
        if scope_match:
            content = clean_phrase(scope_match.group(1))
            doc_title = row["title"]
            if doc_title and content:
                subj_id = upsert_concept(cur, doc_title, "legal_doc")
                obj_id = upsert_concept(cur, content, "scope")

                if not triple_exists(cur, subj_id, rel_quy_dinh_id, obj_id, row["unit_id"]):
                    insert_triple(cur, subj_id, rel_quy_dinh_id, obj_id, row["unit_id"], doc_ref, confidence=0.95)
                    stats["scope_triples_inserted"] += 1
                    if verbose:
                        print(f"[scope] unit={row['unit_id']} doc='{doc_title}' scope='{content[:50]}...'")

        # 2. Check for Penalty/Violation
        # Try extra scope patterns
        for pat in SCOPE_PATTERNS:
            m = pat.search(text)
            if m:
                subj_name = clean_phrase(m.group(1))
                obj_name = clean_phrase(m.group(2))
                if subj_name and obj_name:
                    subj_id = upsert_concept(cur, subj_name, "entity")
                    obj_id = upsert_concept(cur, obj_name, "entity")
                    rel_id = upsert_relation(cur, "phạm vi điều chỉnh") # Use specific relation

                    if not triple_exists(cur, subj_id, rel_id, obj_id, row["unit_id"]):
                        insert_triple(cur, subj_id, rel_id, obj_id, row["unit_id"], doc_ref)
                        stats["scope_triples_inserted"] += 1
                    if verbose:
                        print(f"[scope_extra] unit={row['unit_id']} subj='{subj_name}' obj='{obj_name}'")

        info = extract_from_text(text)
        if not info.get("actor") or not info.get("action"):
            stats["skipped_no_actor_action"] += 1
            continue

        actor_name = info["actor"]
        action_name = info["action"]

        subj_id = upsert_concept(cur, actor_name, "entity")
        obj_id = upsert_concept(cur, action_name, "action")

        if not triple_exists(cur, subj_id, rel_vi_pham_id, obj_id, row["unit_id"]):
            insert_triple(cur, subj_id, rel_vi_pham_id, obj_id, row["unit_id"], doc_ref)
            stats["triples_inserted"] += 1

        if info.get("penalty_min") and info.get("penalty_max"):
            pen_text = f"{info['penalty_min']}-{info['penalty_max']}"
            pen_concept_id = upsert_concept(cur, pen_text, "penalty")
            if not triple_exists(cur, obj_id, rel_phat_tien_id, pen_concept_id, row["unit_id"]):
                insert_triple(cur, obj_id, rel_phat_tien_id, pen_concept_id, row["unit_id"], doc_ref, confidence=0.9)
                stats["penalty_triples_inserted"] += 1

        if verbose:
            source = info.get("_source", "unknown")
            print(f"[match:{source}] unit={row['unit_id']} actor='{actor_name}' action='{action_name}' doc='{doc_ref}'")

    return stats


def main(argv=None):
    parser = argparse.ArgumentParser(description="Extract legal triples into Postgres")
    parser.add_argument("--limit", type=int, default=10_000, help="Number of units to process")
    parser.add_argument("--offset", type=int, default=0, help="Offset for units")
    parser.add_argument("--verbose", action="store_true", help="Print matches as they are found")
    args = parser.parse_args(argv)

    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = False
    try:
        with conn, conn.cursor(cursor_factory=DictCursor) as cur:
            rel_vi_pham_id = upsert_relation(cur, REL_VI_PHAM)
            rel_phat_tien_id = upsert_relation(cur, REL_PHAT_TIEN)
            rel_quy_dinh_id = upsert_relation(cur, REL_QUY_DINH)

            stats = process_units(cur, rel_vi_pham_id, rel_phat_tien_id, rel_quy_dinh_id, args.limit, args.offset, args.verbose)
            conn.commit()

            print(
                f"Processed limit={args.limit} offset={args.offset} | "
                f"triples={stats['triples_inserted']} penalty_triples={stats['penalty_triples_inserted']} "
                f"scope_triples={stats['scope_triples_inserted']} "
                f"skipped_no_actor_action={stats['skipped_no_actor_action']}"
            )
    finally:
        conn.close()


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(1)
