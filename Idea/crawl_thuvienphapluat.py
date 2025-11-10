# -*- coding: utf-8 -*-
"""
Scraper for thuvienphapluat.vn Q&A search results using Selenium + undetected_chromedriver.

- Navigates the search results for query "tử hình"
- Extracts question title (.item-title a), summary (.item-summary), and detail link (href)
- Opens each detail link and extracts full answer content (.content-answer or similar)
- Paginates or infinite-scrolls through all results
- Saves to CSV (utf-8-sig) with columns: Câu hỏi, Tóm tắt, Trả lời đầy đủ, Link

Run:
    python crawl_thuvienphapluat.py --headless  # optional
    python crawl_thuvienphapluat.py --max-pages 3  # limit pages for testing

Works with Python 3.10+
"""

from __future__ import annotations

import argparse
import random
import sys
import time
from dataclasses import dataclass
from typing import List, Dict, Set, Optional

import pandas as pd

# Selenium imports
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import (
    TimeoutException,
    NoSuchElementException,
    WebDriverException,
)
import traceback

# undetected chromedriver
import undetected_chromedriver as uc

START_URL = (
    "https://thuvienphapluat.vn/hoi-dap-phap-luat/tim-tu-van?searchType=1&q=t%E1%BB%AD+h%C3%ACnh"
)
OUTPUT_CSV = "thuvienphapluat_tuhinh.csv"


@dataclass
class QAItem:
    question: str
    summary: str
    answer: str
    link: str


def _sleep(min_s: float = 1.2, max_s: float = 2.8) -> None:
    time.sleep(random.uniform(min_s, max_s))


def setup_driver(headless: bool = False) -> uc.Chrome:
    """Create and configure undetected_chromedriver Chrome instance.

    If Chrome/ChromeDriver versions mismatch, parse the error message to get
    the current Chrome major version and retry with version_main=MAJOR.
    """
    def build_options() -> uc.ChromeOptions:
        opts = uc.ChromeOptions()
        # Browser hardening / stealth flags
        opts.add_argument("--no-sandbox")
        opts.add_argument("--disable-dev-shm-usage")
        opts.add_argument("--disable-blink-features=AutomationControlled")
        opts.add_argument("--disable-infobars")
        opts.add_argument("--disable-extensions")
        opts.add_argument("--start-maximized")
        opts.add_argument("--disable-gpu")

        # Randomize user-agent slightly to reduce blocking
        user_agents = [
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
        ]
        opts.add_argument(f"--user-agent={random.choice(user_agents)}")
        if headless:
            # New headless mode for Chrome
            opts.add_argument("--headless=new")
            # Explicit window size helps some sites render fully in headless
            opts.add_argument("--window-size=1920,1080")
        return opts

    def _post_init_config(drv: uc.Chrome) -> uc.Chrome:
        drv.set_page_load_timeout(45)
        drv.implicitly_wait(3)
        return drv

    try:
        options = build_options()
        return _post_init_config(uc.Chrome(options=options, use_subprocess=True))
    except WebDriverException as e:
        # Try to detect chrome version from error: "Current browser version is 140.0.x"
        msg = str(e)
        print(f"Lỗi khởi tạo trình duyệt (sẽ thử sửa tự động): {msg}")
        major = None
        try:
            import re

            m = re.search(r"Current browser version is\s+(\d+)\.", msg)
            if m:
                major = int(m.group(1))
        except Exception:
            major = None

        if major is not None:
            try:
                print(f"Thử khởi tạo lại với phiên bản ChromeDriver tương thích (v{major})...")
                options2 = build_options()
                return _post_init_config(uc.Chrome(options=options2, version_main=major, use_subprocess=True))
            except WebDriverException as e2:
                print(f"Không thể tự khắc phục: {e2}")
                raise
        else:
            raise


def wait_for_results(driver: uc.Chrome, timeout: int = 35) -> None:
    """Wait until search result anchors are present (tries multiple selectors)."""
    selectors = [
        ".item-title a",
        ".item .item-title a",
        ".list-news .title a",
        ".search-result .title a",
        ".result-item .title a",
        "a[href*='/hoi-dap-phap-luat/']",
    ]
    WebDriverWait(driver, timeout).until(
        lambda d: any(len(d.find_elements(By.CSS_SELECTOR, sel)) > 0 for sel in selectors)
    )


def try_close_overlays(driver: uc.Chrome) -> None:
    """Best-effort close consent banners or overlays if present."""
    candidates = [
        # Common consent or popup buttons (guesses, guarded by try/except)
        (By.XPATH, "//button[contains(., 'Đồng ý') or contains(., 'Chấp nhận') or contains(., 'Tôi đồng ý')]")
        ,
        (By.XPATH, "//div[contains(@class,'close') or contains(@class,'popup')]//button"),
        (By.XPATH, "//button[contains(., 'Close') or contains(., 'close') or contains(., 'Đóng')]")
    ]
    for by, locator in candidates:
        try:
            elem = WebDriverWait(driver, 3).until(EC.element_to_be_clickable((by, locator)))
            driver.execute_script("arguments[0].click();", elem)
            _sleep(0.5, 1.2)
        except Exception:
            pass


def extract_summary_for_anchor(anchor) -> str:
    """Try to locate summary text near an anchor element."""
    try:
        # Go up to the nearest container with class 'item' or similar, then find .item-summary inside
        container = anchor.find_element(
            By.XPATH,
            "./ancestor::*[contains(@class,'item') or contains(@class,'result')][1]",
        )
        try:
            summary_elem = container.find_element(By.CSS_SELECTOR, ".item-summary")
            return summary_elem.text.strip()
        except NoSuchElementException:
            # Fallback: any element containing 'summary' class
            try:
                summary_elem = container.find_element(
                    By.XPATH, ".//*[contains(@class,'summary') or contains(@class,'desc')]"
                )
                return summary_elem.text.strip()
            except NoSuchElementException:
                return ""
    except Exception:
        return ""


def extract_answer_from_detail(driver: uc.Chrome, url: str) -> str:
    """Open detail URL in a new tab and extract full answer content."""
    answer_text = ""
    try:
        driver.switch_to.new_window("tab")
        driver.get(url)
        _sleep(1.0, 2.0)

        try_close_overlays(driver)

        # Try several selectors commonly used for content containers
        selectors = [
            ".content-answer",
            ".answer",
            ".answer-content",
            ".content-detail",
            ".content",
            ".article-content",
            ".entry-content",
            "article",
        ]

        content_elem = None
        for sel in selectors:
            try:
                content_elem = WebDriverWait(driver, 8).until(
                    EC.presence_of_element_located((By.CSS_SELECTOR, sel))
                )
                if content_elem and content_elem.text and len(content_elem.text.strip()) > 50:
                    break
            except TimeoutException:
                content_elem = None
                continue

        if content_elem is None:
            # Last resort: take visible body text
            try:
                content_elem = driver.find_element(By.TAG_NAME, "body")
            except Exception:
                content_elem = None

        if content_elem is not None:
            answer_text = content_elem.text.strip()

    except Exception as e:
        print(f"  ⚠️ Lỗi khi mở link chi tiết: {e}")
    finally:
        try:
            driver.close()
            driver.switch_to.window(driver.window_handles[0])
        except Exception:
            pass

    return answer_text


def collect_items_on_current_page(driver: uc.Chrome) -> List[Dict[str, str]]:
    items: List[Dict[str, str]] = []
    try:
        anchors = driver.find_elements(By.CSS_SELECTOR, ".item-title a, .list-news .title a, .search-result .title a, .result-item .title a, a[href*='/hoi-dap-phap-luat/']")
    except Exception:
        anchors = []

    for a in anchors:
        try:
            question = (a.text or "").strip()
            link = a.get_attribute("href") or ""
            summary = extract_summary_for_anchor(a)
            if not link:
                continue
            items.append({
                "question": question,
                "summary": summary,
                "link": link,
            })
        except Exception:
            continue
    return items


def try_click_next_page(driver: uc.Chrome, next_index: Optional[int] = None) -> bool:
    """Try to navigate to next page via pagination controls. Returns True if navigated."""
    # Common patterns for next buttons
    candidate_selectors = [
        "a[rel='next']",
        ".pagination .next a",
        "li.next a",
        "a.page-link.next",
    ]
    for sel in candidate_selectors:
        try:
            elem = driver.find_element(By.CSS_SELECTOR, sel)
            if elem.is_enabled():
                driver.execute_script("arguments[0].click();", elem)
                return True
        except Exception:
            continue

    # Try by text
    candidate_xpaths = [
        "//a[contains(@class,'next') and (contains(.,'Sau') or contains(.,'Next') or contains(.,'>'))]",
        "//a[contains(.,'Trang sau') or contains(.,'Sau') or contains(.,'Next')]",
    ]
    for xp in candidate_xpaths:
        try:
            elem = driver.find_element(By.XPATH, xp)
            if elem.is_enabled():
                driver.execute_script("arguments[0].click();", elem)
                return True
        except Exception:
            continue

    # Try numeric page link (if provided next_index)
    if next_index is not None:
        xp_num = f"//ul[contains(@class,'pagination')]//a[normalize-space()='{next_index}' or @data-page='{next_index}']"
        try:
            elem = driver.find_element(By.XPATH, xp_num)
            driver.execute_script("arguments[0].click();", elem)
            return True
        except Exception:
            pass

    return False


def infinite_scroll_collect(driver: uc.Chrome, max_rounds: int = 6) -> None:
    """Scroll to load more results on pages using infinite scroll (best-effort)."""
    last_height = driver.execute_script("return document.body.scrollHeight")
    for _ in range(max_rounds):
        driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
        _sleep(1.2, 2.5)
        new_height = driver.execute_script("return document.body.scrollHeight")
        if new_height == last_height:
            break
        last_height = new_height


def scrape(headless: bool = False, max_pages: int = 0) -> List[QAItem]:
    driver = setup_driver(headless=headless)
    all_items: List[QAItem] = []
    seen_links: Set[str] = set()

    try:
        print("Mở trang tìm kiếm...")
        driver.get(START_URL)
        try_close_overlays(driver)
        wait_for_results(driver)

        page = 1
        while True:
            print(f"Đang cào trang {page}...")
            _sleep(1.0, 2.0)

            # For infinite scroll pages, try to load more first
            infinite_scroll_collect(driver, max_rounds=4)

            results = collect_items_on_current_page(driver)
            print(f"  Tìm thấy {len(results)} mục trên trang {page}.")

            # Visit details
            for idx, r in enumerate(results, start=1):
                link = r.get("link", "")
                if not link or link in seen_links:
                    continue
                seen_links.add(link)
                question = r.get("question", "").strip()
                summary = r.get("summary", "").strip()

                print(f"  Đang mở link {idx}/{len(results)}: {link}")
                answer = extract_answer_from_detail(driver, link)
                _sleep(0.8, 1.8)

                all_items.append(
                    QAItem(
                        question=question,
                        summary=summary,
                        answer=answer,
                        link=link,
                    )
                )

            # Save progress intermittently
            if all_items and (page % 2 == 0):
                try:
                    df = pd.DataFrame([
                        {
                            "Câu hỏi": it.question,
                            "Tóm tắt": it.summary,
                            "Trả lời đầy đủ": it.answer,
                            "Link": it.link,
                        }
                        for it in all_items
                    ])
                    df.to_csv(OUTPUT_CSV, index=False, encoding="utf-8-sig")
                    print(f"Đã lưu tạm thời {len(all_items)} dòng vào CSV.")
                except Exception as e:
                    print(f"⚠️ Lỗi khi lưu tạm CSV: {e}")

            # Pagination stop condition
            if max_pages > 0 and page >= max_pages:
                break

            navigated = False
            try:
                navigated = try_click_next_page(driver, next_index=page + 1)
            except Exception:
                navigated = False

            if not navigated:
                # Try another round of infinite scroll, then re-check count
                before = len(collect_items_on_current_page(driver))
                infinite_scroll_collect(driver, max_rounds=2)
                after = len(collect_items_on_current_page(driver))
                if after <= before:
                    # No more items; end
                    break

            # Wait for next page results
            if navigated:
                try:
                    wait_for_results(driver, timeout=20)
                except TimeoutException:
                    pass
                _sleep(1.0, 2.0)
                page += 1
            else:
                # If only infinite scroll, treat as same page iteration; to avoid infinite loop, break
                break

        # Final save
        if all_items:
            df = pd.DataFrame([
                {
                    "Câu hỏi": it.question,
                    "Tóm tắt": it.summary,
                    "Trả lời đầy đủ": it.answer,
                    "Link": it.link,
                }
                for it in all_items
            ])
            df.to_csv(OUTPUT_CSV, index=False, encoding="utf-8-sig")
            print(f"Đã lưu {len(all_items)} dòng vào CSV: {OUTPUT_CSV}")

    finally:
        try:
            driver.quit()
        except Exception:
            pass

    return all_items


def main():
    parser = argparse.ArgumentParser(description="Cào dữ liệu tư vấn pháp luật thuvienphapluat.vn")
    parser.add_argument("--headless", action="store_true", help="Chạy Chrome ở chế độ headless")
    parser.add_argument("--max-pages", type=int, default=0, help="Giới hạn số trang (0 = không giới hạn)")
    args = parser.parse_args()

    try:
        items = scrape(headless=args.headless, max_pages=args.max_pages)
        print(f"Hoàn tất. Tổng số bản ghi đã cào thành công: {len(items)}")
    except Exception as e:
        print(f"Đã xảy ra lỗi: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
