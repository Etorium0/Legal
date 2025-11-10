#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Extract Vietnamese legal triples (subject, predicate, object) from questions and/or summaries.
Focused on intent-style questions in Vietnamese and optional Gemini validation.

Key features:
- Robust normalization for glued Vietnamese tokens commonly found in scraped text
- Intent extraction patterns:
  * "X là gì?" -> [X | là | gì]
  * "Những tội (nào) sẽ bị Y?" -> [Những tội | sẽ bị | Y]
  * "Có được áp dụng (hình phạt) X đối với Y không?" -> [X | áp dụng | Y]
  * "Trình tự X như thế nào?" -> [X | trình tự | như thế nào]
  * "Hồ sơ X gồm/bao gồm những giấy tờ gì?" -> [Hồ sơ X | bao gồm | những giấy tờ gì]
- Multi-question per cell supported
- Optional Gemini validation/correction per triple

CLI examples:
  py extract_triples.py --excel data.xlsx --column mo_ta_ngan --column-as-question --intents-only --out-xlsx-3 intents.xlsx
  py extract_triples.py --question "Tử hình là gì?" --intents-only --out-xlsx-3 demo.xlsx

Notes:
  - Gemini key: env GEMINI_API_KEY or .env file (first line with AIza... or GEMINI_API_KEY=...)
  - JSON export is optional; Excel 3-col export uses headers: subject, predicate, object
"""
from __future__ import annotations
import os
import re
import json
import argparse
from typing import List, Dict, Any, Optional

# Optional dependencies
try:
	import pandas as pd  # type: ignore
except Exception:
	pd = None

try:
	import google.generativeai as genai  # type: ignore
	_GENAI_AVAILABLE = True
except Exception:
	_GENAI_AVAILABLE = False


# ========== Utilities ==========

def normalize_vi_text(x: str) -> str:
	"""Normalize common glued tokens/spacing issues in scraped Vietnamese texts."""
	if not x:
		return ""
	repl = {
		# frequent glued terms
		"ántử": "án tử",
		"tửhình": "tử hình",
		"tửtù": "tử tù",
			"hìnhđối": "hình đối",
		"hìnhlà": "hình là",
		"làgì": "là gì",
		"bịtử": "bị tử",
		"áp dụnghình": "áp dụng hình",
		"đốivới": "đối với",
		"nhưthếnào": "như thế nào",
		"đúngkhông": "đúng không",
		"haykhông": "hay không",
		"phảikhông": "phải không",
		"hồsơ": "hồ sơ",
		"giấytờ": "giấy tờ",
		"thihành": "thi hành",
		"hìnhphạt": "hình phạt",
		"trìnhtự": "trình tự",
		"cáchìnhphạt": "các hình phạt",
		"đượctrangbị": "được trang bị",
		"đượchưởng": "được hưởng",
		"cầnthiết": "cần thiết",
		"chỉápdụng": "chỉ áp dụng",
		"bao gồm": "bao gồm",
		"baogồm": "bao gồm",
		"gồm có": "gồm có",
		"phạttù": "phạt tù",
		"đượcgặp": "được gặp",
	}
	y = x
	for k, v in repl.items():
		y = re.sub(k, v, y, flags=re.I)
	# collapse spaces
	y = re.sub(r"\s+", " ", y).strip()
	# fix stray spaces around quotes
	y = re.sub(r"\s+'\s+", "'", y)
	return y


def _canon_title(s: str) -> str:
	s = re.sub(r"\s+", " ", s or "").strip()
	if not s:
		return s
	return s[0].upper() + s[1:]


def load_texts_from_excel(path: str, column: str) -> List[str]:
	if pd is None:
		raise RuntimeError("pandas/openpyxl not installed. Please pip install pandas openpyxl.")
	df = pd.read_excel(path)
	if column not in df.columns:
		raise ValueError(f"Column '{column}' not in Excel file.")
	return [str(x) for x in df[column].fillna("").tolist()]


def get_gemini_api_key(dotenv_path: str = ".env") -> Optional[str]:
	key = os.getenv("GEMINI_API_KEY")
	if key and key.strip():
		return key.strip()
	if os.path.isfile(dotenv_path):
		try:
			with open(dotenv_path, "r", encoding="utf-8") as f:
				for line in f:
					s = line.strip()
					if not s:
						continue
					if "GEMINI_API_KEY" in s and "=" in s:
						return s.split("=", 1)[1].strip()
					if s.startswith("AIza"):
						return s
		except Exception:
			pass
	return None


def decompose_questions(q: str) -> List[str]:
	"""Split text into individual questions, returning ORIGINAL substrings including '?/!'."""
	if not q:
		return []
	out: List[str] = []
	pattern = re.compile(r"([^\?！？!]+)([\?！？!])")
	last_end = 0
	for m in pattern.finditer(q):
		body = (m.group(1) or '').strip()
		punct = m.group(2)
		if body:
			out.append(f"{body}{punct}")
		last_end = m.end()
	# trailing part without question mark is ignored (often not a question)
	return out


# ========== Intent extraction ==========

def extract_triples_intent(question: str) -> List[Dict[str, str]]:
	qs = [s.strip() for s in re.split(r"[\?！？]+", question or "") if s.strip()]
	triples: List[Dict[str, str]] = []

	def _strip_yesno(t: str) -> str:
		t = t.strip()
		t = re.sub(r"\s+(?:đúng\s+không|hay\s+không|phải\s+không|không)$", "", t, flags=re.I)
		return t.strip()

	for s in qs:
		s_norm = normalize_vi_text(s)

		# 1) "X là gì" -> [X | là | gì]
		m = re.search(r"^(?:khái niệm\s+)?(.+?)\s+là\s+gì$", s_norm, flags=re.I)
		if m:
			subj = _canon_title(m.group(1))
			triples.append({"subject": subj, "relation": "là", "object": "gì"})
			continue

		# 2) "Những tội (nào) sẽ bị Y" -> [Những tội | sẽ bị | Y]
		m = re.search(r"^(những\s+tội)(?:\s+nào)?\s+sẽ\s+bị\s+(.+)$", s_norm, flags=re.I)
		if m:
			subj = _canon_title(m.group(1))
			obj = m.group(2).strip()
			triples.append({"subject": subj, "relation": "sẽ bị", "object": obj})
			continue

		# 2b) "Những tội (nào) được chuyển ..." -> [Những tội | được chuyển | <phần còn lại>]
		m = re.search(r"^(những\s+tội)(?:\s+nào)?\s+được\s+chuyển\s+(.+)$", s_norm, flags=re.I)
		if m:
			triples.append({"subject": _canon_title(m.group(1)), "relation": "được chuyển", "object": m.group(2).strip()})
			continue

		# 3) "Có được áp dụng (hình phạt)? X đối với Y không" -> [X | áp dụng | Y]
		m = re.search(r"^có\s+được\s+áp\s+dụng\s+(?:hình\s*phạt\s*)?(.+?)\s+(?:đối\s* với|đối\s*với|cho|với)\s+(.+?)(?:\s+(?:không|hay\s+không|đúng\s+không))?$", s_norm, flags=re.I)
		if m:
			subj = _canon_title(m.group(1))
			subj = re.sub(r"^Hình\s+phạt\s+", "", subj, flags=re.I).strip() or subj
			obj = m.group(2).strip()
			triples.append({"subject": subj, "relation": "áp dụng", "object": obj})
			continue

		# 3b) "Có áp dụng X đối với Y không" -> [X | có áp dụng | đối với Y]
		m = re.search(r"^có\s+áp\s+dụng\s+(.+?)\s+(đối\s*với\s+.+)$", s_norm, flags=re.I)
		if m:
			subj = _canon_title(m.group(1))
			triples.append({"subject": subj, "relation": "có áp dụng", "object": _strip_yesno(m.group(2))})
			continue

		# 3c) General "X có được/được ..." forms
		m = re.search(r"^(.+?)\s+có\s+được\s+(.+)$", s_norm, flags=re.I)
		if m:
			subj = _canon_title(m.group(1))
			obj = _strip_yesno(m.group(2))
			triples.append({"subject": subj, "relation": "có được", "object": obj})
			continue

		# 4) "X có thể bị Y (không)" -> [X | có thể bị | Y]
		m = re.search(r"^(.+?)\s+có\s+thể\s+bị\s+(.+)$", s_norm, flags=re.I)
		if m:
			triples.append({"subject": _canon_title(m.group(1)), "relation": "có thể bị", "object": _strip_yesno(m.group(2))})
			continue

		# 5) "X có bị Y (không)" -> [X | có bị | Y]
		m = re.search(r"^(.+?)\s+có\s+bị\s+(.+)$", s_norm, flags=re.I)
		if m:
			triples.append({"subject": _canon_title(m.group(1)), "relation": "có bị", "object": _strip_yesno(m.group(2))})
			continue

		# 4) "Trình tự <hoạt động> như thế nào" -> [<hoạt động> | trình tự | như thế nào]
		m = re.search(r"^trình\s*tự\s+(.+?)\s+như\s*thế\s*nào$", s_norm, flags=re.I)
		if m:
			activity = _canon_title(m.group(1))
			triples.append({"subject": activity, "relation": "trình tự", "object": "như thế nào"})
			continue

		# 5) "Hồ sơ <hoạt động> (gồm|bao gồm) những giấy tờ gì" -> [Hồ sơ <...> | bao gồm | những giấy tờ gì]
		m = re.search(r"^hồ\s*sơ\s+(.+?)\s+(?:gồm|bao\s* gồm|bao\s*gồm)\s+(?:những\s+)?giấy\s*tờ\s+gì$", s_norm, flags=re.I)
		if m:
			act = _canon_title(m.group(1))
			triples.append({"subject": f"Hồ sơ {act}", "relation": "bao gồm", "object": "những giấy tờ gì"})
			continue

		# 6) "X phải được gửi đến Y" -> [X | phải được gửi đến | Y]
		m = re.search(r"^(.+?)\s+phải\s+được\s+gửi\s+đến\s+(.+)$", s_norm, flags=re.I)
		if m:
			triples.append({"subject": _canon_title(m.group(1)), "relation": "phải được gửi đến", "object": m.group(2).strip()})
			continue

		# 7) "X được thực hiện như thế nào" -> [X | được thực hiện | như thế nào]
		m = re.search(r"^(.+?)\s+được\s+thực\s+hiện\s+như\s+thế\s+nào$", s_norm, flags=re.I)
		if m:
			triples.append({"subject": _canon_title(m.group(1)), "relation": "được thực hiện", "object": "như thế nào"})
			continue

		# 8) "X gồm/bao gồm (những ...)" -> [X | gồm/bao gồm | ...]
		m = re.search(r"^(.+?)\s+(?:gồm|bao\s*gồm|gồm\s+có)\s+(.+)$", s_norm, flags=re.I)
		if m:
			subj = _canon_title(m.group(1))
			obj = _strip_yesno(m.group(2))
			rel = "bao gồm" if re.search(r"bao\s*gồm|gồm\s+có", m.group(0), flags=re.I) else "gồm"
			triples.append({"subject": subj, "relation": rel, "object": obj})
			continue

		# 9) "Ai là người <verb> <obj>" -> [Ai | là người <verb> | <obj>]
		m = re.search(r"^ai\s+là\s+người\s+(ra\s+quyết\s+định)\s+(.+)$", s_norm, flags=re.I)
		if m:
			triples.append({"subject": "Ai", "relation": f"là người {m.group(1).strip()}", "object": m.group(2).strip()})
			continue
		m = re.search(r"^ai\s+là\s+người\s+(bố\s+trí)\s+(.+)$", s_norm, flags=re.I)
		if m:
			triples.append({"subject": "Ai", "relation": f"là người {m.group(1).strip()}", "object": m.group(2).strip()})
			continue

		# 10) "Ai có thẩm quyền <verb> <obj>" -> [Ai | có thẩm quyền <verb> | <obj>]
		m = re.search(r"^ai\s+có\s+thẩm\s+quyền\s+(ra\s+quyết\s+định)\s+(.+)$", s_norm, flags=re.I)
		if m:
			triples.append({"subject": "Ai", "relation": f"có thẩm quyền {m.group(1).strip()}", "object": m.group(2).strip()})
			continue

		# 11) "Ai có quyền <verb> <obj>" -> [Ai | có quyền <verb> | <obj>]
		m = re.search(r"^ai\s+có\s+quyền\s+(.+?)\s+(.+)$", s_norm, flags=re.I)
		if m:
			triples.append({"subject": "Ai", "relation": f"có quyền {m.group(1).strip()}", "object": m.group(2).strip()})
			continue

		# 12) "Có mấy X đang áp dụng tại Y" -> [X | đang áp dụng | tại Y]
		m = re.search(r"^có\s+mấy\s+(.+?)\s+đang\s+áp\s+dụng\s+tại\s+(.+)$", s_norm, flags=re.I)
		if m:
			triples.append({"subject": _canon_title(m.group(1)), "relation": "đang áp dụng", "object": f"tại {m.group(2).strip()}"})
			continue

		# 13) "X bao nhiêu tiền thì bị Y" -> [X | bao nhiêu tiền thì bị | Y]
		m = re.search(r"^(.+?)\s+bao\s+nhiêu\s+tiền\s+thì\s+bị\s+(.+)$", s_norm, flags=re.I)
		if m:
			triples.append({"subject": _canon_title(m.group(1)), "relation": "bao nhiêu tiền thì bị", "object": _strip_yesno(m.group(2))})
			continue

		# 14) "X từ bao nhiêu tuổi thì không bị Y" -> [X | từ bao nhiêu tuổi thì không bị | Y]
		m = re.search(r"^(.+?)\s+từ\s+bao\s+nhiêu\s+tuổi\s+thì\s+không\s+bị\s+(.+)$", s_norm, flags=re.I)
		if m:
			triples.append({"subject": _canon_title(m.group(1)), "relation": "từ bao nhiêu tuổi thì không bị", "object": _strip_yesno(m.group(2))})
			continue

		# 15) "X sẽ bị Y" (generic)
		m = re.search(r"^(.+?)\s+sẽ\s+bị\s+(.+)$", s_norm, flags=re.I)
		if m:
			triples.append({"subject": _canon_title(m.group(1)), "relation": "sẽ bị", "object": _strip_yesno(m.group(2))})
			continue

		# 16) "X chỉ áp dụng Y đúng không" -> [X | chỉ áp dụng | Y]
		m = re.search(r"^(.+?)\s+(chỉ\s+áp\s+dụng)\s+(.+?)\s+(?:đúng\s+không|phải\s+không)$", s_norm, flags=re.I)
		if m:
			triples.append({"subject": _canon_title(m.group(1)), "relation": m.group(2).strip(), "object": m.group(3).strip()})
			continue

		# 17) "X phải chấp hành Y" -> [X | phải chấp hành | Y]
		m = re.search(r"^(.+?)\s+phải\s+chấp\s+hành\s+(.+)$", s_norm, flags=re.I)
		if m:
			triples.append({"subject": _canon_title(m.group(1)), "relation": "phải chấp hành", "object": _strip_yesno(m.group(2))})
			continue

		# 18) "X được trang bị những gì" -> [X | được trang bị | những gì]
		m = re.search(r"^(.+?)\s+được\s+trang\s+bị\s+(những\s+gì)$", s_norm, flags=re.I)
		if m:
			triples.append({"subject": _canon_title(m.group(1)), "relation": "được trang bị", "object": m.group(2)})
			continue

		# 19) "X được hưởng Y" -> [X | được hưởng | Y]
		m = re.search(r"^(.+?)\s+được\s+hưởng\s+(.+)$", s_norm, flags=re.I)
		if m:
			triples.append({"subject": _canon_title(m.group(1)), "relation": "được hưởng", "object": _strip_yesno(m.group(2))})
			continue

		# 20) "X cần thiết để Y" -> [X | cần thiết để | Y]
		m = re.search(r"^(.+?)\s+cần\s+thiết\s+để\s+(.+)$", s_norm, flags=re.I)
		if m:
			triples.append({"subject": _canon_title(m.group(1)), "relation": "cần thiết để", "object": _strip_yesno(m.group(2))})
			continue

		# 21) "Khi ... thì sẽ tiêm ..." -> [Khi ... | sẽ tiêm | mũi thuốc ...]
		m = re.search(r"^(khi\s+.+?)\s+thì\s+(sẽ\s+tiêm)\s+(.+)$", s_norm, flags=re.I)
		if m:
			triples.append({"subject": _canon_title(m.group(1)), "relation": m.group(2).strip(), "object": _strip_yesno(m.group(3))})
			continue

		# 22) "X có cần phải <verb> Y không" -> [X | có cần phải <verb> | Y]
		m = re.search(r"^(.+?)\s+có\s+cần\s+phải\s+(kiểm\s+tra)\s+(.+)$", s_norm, flags=re.I)
		if m:
			triples.append({"subject": _canon_title(m.group(1)), "relation": f"có cần phải {m.group(1+1)}", "object": _strip_yesno(m.group(3))})
			continue

		# 23) "X có quyền yêu cầu Y (không)"
		m = re.search(r"^(.+?)\s+có\s+quyền\s+yêu\s+cầu\s+(.+)$", s_norm, flags=re.I)
		if m:
			triples.append({"subject": _canon_title(m.group(1)), "relation": "có quyền yêu cầu", "object": _strip_yesno(m.group(2))})
			continue

		# 24) "X giải quyết/ thực hiện như thế nào"
		m = re.search(r"^(.+?)\s+(giải\s+quyết|thực\s+hiện)\s+như\s+thế\s+nào$", s_norm, flags=re.I)
		if m:
			triples.append({"subject": _canon_title(m.group(1)), "relation": m.group(2).strip(), "object": "như thế nào"})
			continue

		# 25) "X có phải là Y" -> [X | có phải là | Y]
		m = re.search(r"^(.+?)\s+có\s+phải\s+là\s+(.+)$", s_norm, flags=re.I)
		if m:
			triples.append({"subject": _canon_title(m.group(1)), "relation": "có phải là", "object": _strip_yesno(m.group(2))})
			continue

		# 26) Generic "X là Y" (not 'là gì')
		m = re.search(r"^(.+?)\s+là\s+(.+)$", s_norm, flags=re.I)
		if m and m.group(2).strip().lower() != 'gì':
			triples.append({"subject": _canon_title(m.group(1)), "relation": "là", "object": _strip_yesno(m.group(2))})
			continue

		# Fallback: NP + "như thế nào"
		m = re.search(r"^(.+?)\s+như\s+thế\s+nào$", s_norm, flags=re.I)
		if m:
			subj = _canon_title(m.group(1))
			triples.append({"subject": subj, "relation": "mô tả", "object": "như thế nào"})

	# Dedup
	out: List[Dict[str, str]] = []
	seen = set()
	for t in triples:
		k = (t["subject"].lower(), t["relation"].lower(), t["object"].lower())
		if k not in seen:
			seen.add(k)
			out.append(t)
	return out


# ========== Gemini validation ==========

def gemini_validate_triple(question: str, triple: Dict[str, str], api_key: Optional[str], model_name: str = "gemini-2.5-flash") -> Optional[Dict[str, str]]:
	if not (_GENAI_AVAILABLE and api_key):
		return triple
	try:
		genai.configure(api_key=api_key)
		model = genai.GenerativeModel(model_name)
		prompt = (
			"Kiểm tra và chuẩn hóa bộ ba cho câu hỏi tiếng Việt.\n"
			"Yêu cầu: Trả về JSON thuần theo schema: {\"subject\":\"...\",\"predicate\":\"...\",\"object\":\"...\"}.\n"
			"- Nếu bộ ba đúng nghĩa và tự nhiên, có thể giữ nguyên hoặc chuẩn hóa về cụm danh/động từ ngắn gọn.\n"
			"- Nếu không phù hợp với câu hỏi, trả JSON null (chỉ từ null).\n"
			f"Câu hỏi: {question}\n"
			f"Bộ ba dự thảo: {json.dumps(triple, ensure_ascii=False)}\n"
			"Kết quả:" 
		)
		resp = model.generate_content(prompt)
		txt = (resp.text or "").strip()
		if txt.lower() == "null":
			return None
		# Extract JSON object
		m = re.search(r"\{[\s\S]*\}$", txt)
		data = json.loads(m.group(0) if m else txt)
		s = str(data.get("subject", "")).strip()
		p = str(data.get("predicate", "")).strip() or str(data.get("relation", "")).strip()
		o = str(data.get("object", "")).strip()
		if s and p and o:
			return {"subject": s, "relation": p, "object": o}
	except Exception:
		return triple
	return triple


# ========== Orchestrator ==========

def extract_triples(question: str, use_gemini_check: bool = False, dotenv_path: str = ".env") -> Dict[str, Any]:
	# Keep original text for export; only normalize for matching
	subs = decompose_questions(question)
	all_triples: List[Dict[str, str]] = []
	key: Optional[str] = None
	if use_gemini_check:
		key = get_gemini_api_key(dotenv_path)

	for sq in subs:
		# Extract from each sub-question separately to preserve mapping
		tlist = extract_triples_intent(sq)
		for t in tlist:
			ct = t
			if use_gemini_check:
				ct = gemini_validate_triple(sq, t, key)
				if not ct:
					continue
			ct = dict(ct)
			# Normalize subject/object spacing but DO NOT touch the original question text
			ct["subject"] = normalize_vi_text(ct.get("subject", ""))
			ct["object"] = normalize_vi_text(ct.get("object", ""))
			ct["question"] = sq
			all_triples.append(ct)

	return {
		"subQuestions": subs,
		"triples": all_triples,
	}


def main():
	ap = argparse.ArgumentParser(description="Extract legal triples (VI) from question and summary.")
	ap.add_argument("--question", default="", help="Câu hỏi (tùy chọn)")
	ap.add_argument("--excel", help="Đường dẫn Excel để đọc cột", default=None)
	ap.add_argument("--column", help="Tên cột trong Excel", default="noi_dung_chi_tiet_tomtat")
	ap.add_argument("--column-as-question", action="store_true", help="Diễn giải cột Excel như 'question' (mặc định)")

	ap.add_argument("--out", help="File JSON đầu ra (tùy chọn)", default=None)
	ap.add_argument("--out-xlsx-3", help="Xuất Excel chỉ 3 cột subject,predicate,object", default=None)

	ap.add_argument("--xlsx-add-question", action="store_true", help="Kèm cột 'question' (câu hỏi gốc) trong Excel")

	ap.add_argument("--intents-only", action="store_true", help="Chỉ xuất các bộ ba từ câu hỏi (intent)")
	ap.add_argument("--fill-all-3", action="store_true", help="Khi xuất 3 cột, đảm bảo mỗi input có ít nhất 1 dòng (fallback)")
	ap.add_argument("--gemini-check", action="store_true", help="Dùng Gemini để kiểm tra/chỉnh bộ ba")
	ap.add_argument("--env", default=".env", help="Đường dẫn .env chứa GEMINI_API_KEY hoặc dòng AIza...")
	args = ap.parse_args()

	outputs: List[Dict[str, Any]] = []

	# Case 1: direct question
	if args.question:
		res = extract_triples(args.question, use_gemini_check=args.gemini_check, dotenv_path=args.env)
		outputs.append({"input": {"question": args.question}, **res})

	# Case 2: Excel batch
	if args.excel:
		texts = load_texts_from_excel(args.excel, args.column)
		for i, s in enumerate(texts):
			q = s if args.column_as_question else s
			res = extract_triples(q, use_gemini_check=args.gemini_check, dotenv_path=args.env)
			outputs.append({"input": {"row": i, "question": q}, **res})

	# Optional JSON
	if args.out:
		with open(args.out, "w", encoding="utf-8") as f:
			json.dump(outputs if len(outputs) > 1 else (outputs[0] if outputs else {}), f, ensure_ascii=False, indent=2)
		print(f"[OK] Saved -> {args.out}")

	# Optional 3-col Excel
	if args.out_xlsx_3 and pd is not None:
		rows: List[Dict[str, Any]] = []
		for item in outputs:
			for t in item.get("triples", []):
				rows.append({
					"question": t.get("question", item.get("input", {}).get("question", "")),
					"subject": t.get("subject"),
					"predicate": t.get("relation"),
					"object": t.get("object"),
				})
		# --fill-all-3 fallback
		if args.fill_all_3 and not rows and outputs:
			q = outputs[0].get("input", {}).get("question", "")
			rows.append({"question": q, "subject": _canon_title(normalize_vi_text(q[:120])), "predicate": "mô tả", "object": "?"})
		if rows:
			cols = ["subject", "predicate", "object"]
			if args.xlsx_add_question:
				cols = ["question"] + cols
			df = pd.DataFrame(rows, columns=cols)  # type: ignore
			df.to_excel(args.out_xlsx_3, index=False)
			print(f"[OK] Saved 3-col -> {args.out_xlsx_3}")
		else:
			print("[WARN] No triples to write.")


if __name__ == "__main__":
	main()

