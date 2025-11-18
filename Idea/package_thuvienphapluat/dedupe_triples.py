#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Deduplicate triples JSON produced by extract_action_triples.py
Usage (PowerShell):
  .\.venv\Scripts\python.exe .\Idea\package_thuvienphapluat\dedupe_triples.py \
    --input .\Idea\triples_all.json --output .\Idea\triples_all_dedup.json
"""
import argparse, json, re
from typing import Dict, List

# Reuse light normalizers

def cleanup_vi_tokens(s: str) -> str:
    if not s:
        return s
    x = s.replace('\u00a0', ' ').replace('–', '-').replace('—', '-')
    x = re.sub(r'\s+', ' ', x).strip()
    return x


def _norm_item(x: str) -> str:
    s = cleanup_vi_tokens(x or '')
    # Drop trailing Điều (...) refs
    s = re.sub(r"\s*\(Đi\S*\s*\d+[^\)]*\)\s*$", "", s, flags=re.IGNORECASE)
    # Drop single trailing digit footnotes
    s = re.sub(r"\s+[1-9]$", "", s)
    s = re.sub(r"\s+", " ", s).strip().lower()
    return s


def dedupe(triples: List[Dict[str, str]]) -> List[Dict[str, str]]:
    seen = set()
    out: List[Dict[str, str]] = []
    for t in triples:
        k = (_norm_item(t.get('subject','')), _norm_item(t.get('predicate','')), _norm_item(t.get('object','')))
        if k in seen:
            continue
        seen.add(k)
        out.append(t)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--input', required=True)
    ap.add_argument('--output', required=True)
    args = ap.parse_args()

    with open(args.input, 'r', encoding='utf-8') as f:
        data = json.load(f)
    if not isinstance(data, list):
        raise SystemExit('Input JSON must be a list of triples')

    before = len(data)
    data2 = dedupe(data)
    after = len(data2)

    with open(args.output, 'w', encoding='utf-8') as f:
        json.dump(data2, f, ensure_ascii=False, indent=2)

    print(f'Deduped {before-after} duplicates. Kept {after} triples. Wrote: {args.output}')


if __name__ == '__main__':
    main()
