"""
Export data scraped by law-crawler into Legal-Supporter via the ingestion API.

Steps:
1) Run the existing crawlers to populate the MySQL tables (PDChuDe/PDDeMuc/PDChuong/PDDieu...).
2) Set LEGAL_SUPPORTER_URL to the running backend (default http://localhost:8080).
3) Optionally set DEMUC_IDS as a comma-separated list to limit export (e.g. "1,2,10").
4) Run:  python export_legalsupporter.py

The script will POST /api/v1/query/ingest with document + units payloads that
match Legal-Supporter’s schema. It keeps parent-child links using codes, so
chapters must be sent before their articles within each document payload.
"""

import os
import sys
import requests

from models.models import PDChuDe, PDDeMuc, PDChuong, PDDieu


BACKEND_URL = os.getenv("LEGAL_SUPPORTER_URL", "http://localhost:8080").rstrip("/")
AUTO_EMBED = os.getenv("LEGAL_SUPPORTER_AUTO_EMBED", "false").lower() == "true"
DEMUC_IDS = os.getenv("DEMUC_IDS")  # comma-separated demuc ids to export


def build_units_for_demuc(demuc_id: str):
    """Return a list of units (chapters + articles) for the given DeMuc.

    - Chapter unit codes use the existing MAPC so that article parent_code can point to them.
    - Article unit codes use the PDDieu MAPC.
    - order_index preserves the original stt where available.
    """
    units = []

    chapters = (PDChuong
                .select()
                .where(PDChuong.demuc_id == demuc_id)
                .order_by(PDChuong.stt))

    # If a DeMuc has no chapters, create a synthetic parent to attach articles.
    synthetic_parent_code = None
    if not chapters.exists():
        synthetic_parent_code = f"demuc-{demuc_id}"
        units.append({
            "level": "chapter",
            "code": synthetic_parent_code,
            "text": "Tổng hợp",
            "order_index": 0,
        })

    for ch in chapters:
        ch_code = ch.mapc
        ch_text = ch.ten or f"Chương {ch.chimuc}" or "Chương"
        units.append({
            "level": "chapter",
            "code": ch_code,
            "text": ch_text,
            "order_index": ch.stt or 0,
        })

        dieus = (PDDieu
                 .select()
                 .where(PDDieu.chuong_id == ch.mapc)
                 .order_by(PDDieu.stt))
        for idx, dieu in enumerate(dieus):
            code = dieu.mapc
            body = (dieu.ten or "") + "\n" + (dieu.noidung or "")
            units.append({
                "level": "article",
                "code": code,
                "parent_code": ch_code,
                "text": body.strip(),
                "order_index": dieu.stt if dieu.stt is not None else idx,
            })

    # Articles that did not get chapters (fallback)
    if synthetic_parent_code:
        dieus = (PDDieu
                 .select()
                 .where(PDDieu.demuc_id == demuc_id)
                 .order_by(PDDieu.stt))
        for idx, dieu in enumerate(dieus):
            code = dieu.mapc
            body = (dieu.ten or "") + "\n" + (dieu.noidung or "")
            units.append({
                "level": "article",
                "code": code,
                "parent_code": synthetic_parent_code,
                "text": body.strip(),
                "order_index": dieu.stt if dieu.stt is not None else idx,
            })

    return units


def ingest_demuc(demuc: PDDeMuc, chude_title: str | None):
    units = build_units_for_demuc(demuc.id)
    if not units:
        print(f"[skip] DeMuc {demuc.id} - {demuc.ten}: no units")
        return

    number = str(demuc.stt) if demuc.stt is not None else None
    authority = chude_title if chude_title else None

    payload = {
        "document": {
            "title": demuc.ten or f"Đề mục {demuc.id}",
            "type": "code",  # generic type for pháp điển đề mục
            "number": number,
            "authority": authority,
        },
        "units": units,
        "auto_embed": AUTO_EMBED,
    }

    url = f"{BACKEND_URL}/api/v1/query/ingest"
    try:
        resp = requests.post(url, json=payload, timeout=90)
        resp.raise_for_status()
        print(f"[ok] DeMuc {demuc.id} -> document {resp.json().get('document_id')}")
    except Exception as exc:
        print(f"[fail] DeMuc {demuc.id}: {exc}")


def main():
    selected_ids = None
    if DEMUC_IDS:
        selected_ids = [x.strip() for x in DEMUC_IDS.split(',') if x.strip()]

    query = PDDeMuc.select()
    if selected_ids:
        query = query.where(PDDeMuc.id.in_(selected_ids))
    query = query.order_by(PDDeMuc.stt)

    # Preload chủ đề to enrich authority field
    chude_map = {c.id: c.ten for c in PDChuDe.select()}

    print(f"Target backend: {BACKEND_URL}")
    print(f"Auto-embed: {AUTO_EMBED}")
    if selected_ids:
        print(f"Filtering DeMuc IDs: {selected_ids}")

    for demuc in query:
        chude_title = chude_map.get(str(demuc.chude_id))
        ingest_demuc(demuc, chude_title)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(1)
