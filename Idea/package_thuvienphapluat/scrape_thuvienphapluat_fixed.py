#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
FIXED VERSION: Scrape thuvienphapluat.vn search results and article details, then export to Excel.
Usage (examples):
  python scrape_thuvienphapluat_fixed.py --query "tử hình" --max-pages 3 --out "ket_qua_tim_kiem_tu_hinh.xlsx"
"""

import argparse
import csv
import random
import re
import sys
import time
import urllib.parse
from dataclasses import dataclass, asdict
from typing import Iterable, List, Optional, Tuple

# --- HTTP / Parsing
try:
    import requests
except Exception as e:
    print("Missing dependency: requests. Install with: pip install requests", file=sys.stderr)
    raise

try:
    from bs4 import BeautifulSoup
except Exception as e:
    print("Missing dependency: beautifulsoup4. Install with: pip install beautifulsoup4 lxml", file=sys.stderr)
    raise

# Optional Playwright fallback for JS rendering (only used if --use-js is set)
PLAYWRIGHT_AVAILABLE = False
try:
    from playwright.sync_api import sync_playwright
    PLAYWRIGHT_AVAILABLE = True
except Exception:
    pass

# Optional: pandas for Excel
try:
    import pandas as pd
    PANDAS_AVAILABLE = True
except Exception:
    PANDAS_AVAILABLE = False


BASE_SEARCH = "https://thuvienphapluat.vn/phap-luat/tim-tu-van"
DEFAULT_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Cache-Control": "no-cache",
    "Pragma": "no-cache",
}


@dataclass
class Row:
    tieu_de: str
    url: str
    ngay_dang: str
    mo_ta_ngan: str
    linh_vuc: str
    noi_dung_chi_tiet: str


def sleep_polite(min_s: float, max_s: float):
    time.sleep(random.uniform(min_s, max_s))


def get_soup(session: requests.Session, url: str, retries: int = 3, timeout: int = 20) -> Optional[BeautifulSoup]:
    last_err = None
    for attempt in range(1, retries + 1):
        try:
            resp = session.get(url, headers=DEFAULT_HEADERS, timeout=timeout)
            if resp.status_code == 200 and resp.text:
                return BeautifulSoup(resp.text, "lxml")
            else:
                last_err = RuntimeError(f"HTTP {resp.status_code}")
        except Exception as e:
            last_err = e
        sleep_polite(1.0 * attempt, 2.0 * attempt)
    print(f"[WARN] Failed to fetch {url}: {last_err}", file=sys.stderr)
    return None


def parse_search_page(soup: BeautifulSoup, current_page: int = 1) -> Tuple[List[dict], Optional[str]]:
    """
    Return list of dicts with {title, url, date, snippet, category},
    and the next page url (or None).
    """
    results = []
    
    # FIXED: Use the correct selector for search results
    items = soup.select("article.news-card.tvpl-find")
    
    if not items:
        print("[DEBUG] No articles found with primary selector, trying fallbacks...")
        # Fallback selectors
        items = soup.select("article.news-card") or soup.select("div.search-result-item") or soup.select("li.search-result-item")

    print(f"[DEBUG] Found {len(items)} article elements")

    for it in items:
        # Title & URL - FIXED: look for the title-link
        a = it.select_one("a.title-link, a[href*='ho-tro-phap-luat'], a[title]")
        if not a:
            continue
            
        title = " ".join(a.get_text(strip=True).split())
        url = urllib.parse.urljoin("https://thuvienphapluat.vn", a["href"])

        # Date - FIXED: look for sub-time class
        date = ""
        date_el = it.select_one(".sub-time, .time, time")
        if date_el:
            date = " ".join(date_el.get_text(strip=True).split())

        # Snippet / short desc - FIXED: look for line-clamp-2 class
        snippet = ""
        snippet_el = it.select_one(".line-clamp-2, .desc, .description, p")
        if snippet_el:
            snippet = " ".join(snippet_el.get_text(strip=True).split())

        # Category / field - FIXED: look for keyword section
        category = ""
        keyword_section = it.select_one("#keywordfind, .keyword")
        if keyword_section:
            keyword_links = keyword_section.select("a span")
            if keyword_links:
                category = ", ".join([kw.get_text(strip=True) for kw in keyword_links[:2]])  # Take first 2 keywords

        print(f"[DEBUG] Parsed: {title[:50]}... | URL: {url[:50]}... | Date: {date}")

        results.append({
            "title": title,
            "url": url,
            "date": date,
            "snippet": snippet,
            "category": category
        })

    # Next page - FIXED: look for pagination
    next_url = None
    # Look for pagination area and get the next page
    pagination_area = soup.select_one("ul.pagination, .pagination")
    if pagination_area:
        # Find all page links and determine next page
        page_links = pagination_area.select("a[href*='page=']")
        if page_links:
            # Look for the next page (current_page + 1)
            next_page_num = current_page + 1
            for link in page_links:
                href = link.get("href", "")
                if f"page={next_page_num}" in href:
                    next_url = href if href.startswith("http") else urllib.parse.urljoin("https://thuvienphapluat.vn", href)
                    break

    return results, next_url


def clean_text(txt: str) -> str:
    if not txt:
        return ""
    # Remove excessive whitespace & non-breaking spaces
    txt = re.sub(r"\s+", " ", txt.replace("\xa0", " ")).strip()
    return txt


def parse_detail_content(soup: BeautifulSoup) -> Tuple[str, str]:
    """
    Extract (field/category, full content) from an article detail page.
    """
    # Field / Category
    field = ""
    for sel in ["a.category", ".category a", ".breadcrumbs a:last-child", ".tags a", ".field a", ".keyword a"]:
        el = soup.select_one(sel)
        if el and el.get_text(strip=True):
            field = clean_text(el.get_text())
            break

    # Content selectors (try many; stop at the first with enough text)
    content = ""
    content_selectors = [
        "div.article-content",
        "div#contentDetail",
        "div#ctl00_ContentPlaceHolder1_ctl00_divHTML",
        "div#ctl00_ContentPlaceHolder1_ctl00_divNoiDung",
        "div.content-detail",
        "div.post-content",
        "article",
        "div#content",
        "div.main-content",
        ".content",
        ".article-body"
    ]
    for sel in content_selectors:
        el = soup.select_one(sel)
        if el:
            text = clean_text(el.get_text(separator=" ", strip=True))
            if len(text) > 120:  # require some reasonable length
                content = text
                break

    # Fallback: combine paragraphs
    if not content:
        ps = soup.select("article p, .article-content p, .post-content p, #contentDetail p, .content p")
        if ps:
            text = clean_text(" ".join(p.get_text(" ", strip=True) for p in ps))
            content = text

    return field, content


def fetch_detail(session: requests.Session, url: str, retries: int = 3, use_js: bool = False, js_timeout_ms: int = 8000) -> Tuple[str, str]:
    """
    Return (field, content). If use_js=True and Playwright is available, render with JS.
    """
    if use_js and PLAYWRIGHT_AVAILABLE:
        for attempt in range(1, retries + 1):
            try:
                with sync_playwright() as p:
                    browser = p.chromium.launch(headless=True)
                    ctx = browser.new_context(user_agent=DEFAULT_HEADERS["User-Agent"])
                    page = ctx.new_page()
                    page.goto(url, wait_until="domcontentloaded", timeout=js_timeout_ms)
                    page.wait_for_timeout(1000 + 300 * attempt)  # give dynamic blocks time
                    html = page.content()
                    browser.close()
                soup = BeautifulSoup(html, "lxml")
                return parse_detail_content(soup)
            except Exception as e:
                print(f"[JS WARN] {e} (attempt {attempt}/{retries})", file=sys.stderr)
                sleep_polite(1.0 * attempt, 2.0 * attempt)
        return "", ""

    # Plain requests path
    soup = get_soup(session, url, retries=retries)
    if soup is None:
        return "", ""
    return parse_detail_content(soup)


def crawl(query: str, max_pages: int, use_js: bool, per_detail_sleep: Tuple[float, float]) -> List[Row]:
    session = requests.Session()
    session.headers.update(DEFAULT_HEADERS)

    results: List[Row] = []
    page_url = f"{BASE_SEARCH}?q={urllib.parse.quote(query)}"
    pages_done = 0

    while page_url and pages_done < max_pages:
        print(f"[INFO] Fetching search page: {page_url}")
        soup = get_soup(session, page_url)
        if soup is None:
            print(f"[WARN] Skip page due to fetch error: {page_url}", file=sys.stderr)
            break

        items, next_url = parse_search_page(soup, pages_done + 1)
        print(f"[INFO] Found {len(items)} results on this page.")

        for idx, it in enumerate(items, 1):
            title = it.get("title", "")
            url = it.get("url", "")
            date = it.get("date", "")
            snippet = it.get("snippet", "")
            category_list = it.get("category", "")

            if not url:
                continue

            # Fetch detail
            field, content = fetch_detail(session, url, retries=3, use_js=use_js)
            field_final = field or category_list  # prefer detailed field if available
            print(f"  - [{idx}/{len(items)}] {title[:60]}... (field: {field_final})")

            row = Row(
                tieu_de=title,
                url=url,
                ngay_dang=date,
                mo_ta_ngan=snippet,
                linh_vuc=field_final,
                noi_dung_chi_tiet=content
            )
            results.append(row)

            # Polite delay between article fetches
            sleep_polite(per_detail_sleep[0], per_detail_sleep[1])

        page_url = next_url
        pages_done += 1
        # Polite delay between pages
        sleep_polite(1.5, 3.0)

    return results


def export_excel(rows: List[Row], out_path: str):
    if not rows:
        print("[WARN] No rows to export.")
        return

    data = [asdict(r) for r in rows]
    if PANDAS_AVAILABLE:
        df = pd.DataFrame(data)
        # Order columns similar to user's screenshot
        cols = ["tieu_de", "url", "ngay_dang", "mo_ta_ngan", "linh_vuc", "noi_dung_chi_tiet"]
        df = df[[c for c in cols if c in df.columns]]
        df.to_excel(out_path, index=False)
        print(f"[OK] Excel saved -> {out_path}")
    else:
        # Fallback to CSV
        csv_path = out_path if out_path.lower().endswith(".csv") else out_path.rsplit(".", 1)[0] + ".csv"
        with open(csv_path, "w", newline="", encoding="utf-8-sig") as f:
            writer = csv.DictWriter(f, fieldnames=list(data[0].keys()))
            writer.writeheader()
            writer.writerows(data)
        print(f"[OK] CSV saved -> {csv_path}")


def main():
    ap = argparse.ArgumentParser(description="Scrape thuvienphapluat.vn search results and article details.")
    ap.add_argument("--query", "-q", required=True, help="Search query (e.g., 'tử hình')")
    ap.add_argument("--max-pages", type=int, default=1, help="Max number of result pages to crawl")
    ap.add_argument("--out", default="ket_qua_tim_kiem.xlsx", help="Output Excel filename (.xlsx). CSV fallback if pandas missing.")
    ap.add_argument("--use-js", action="store_true", help="Use Playwright headless browser for article pages (helps if site blocks bots).")
    ap.add_argument("--min-sleep", type=float, default=0.6, help="Min delay between article requests (seconds).")
    ap.add_argument("--max-sleep", type=float, default=1.4, help="Max delay between article requests (seconds).")
    args = ap.parse_args()

    if args.use_js and not PLAYWRIGHT_AVAILABLE:
        print("[WARN] --use-js specified but Playwright not installed. Install with:\n"
              "  pip install playwright && playwright install chromium", file=sys.stderr)

    rows = crawl(args.query, args.max_pages, args.use_js, (args.min_sleep, args.max_sleep))
    export_excel(rows, args.out)


if __name__ == "__main__":
    main()