import re
from bs4 import BeautifulSoup

with open('debug_32766.html', encoding='utf-8') as f:
    html = f.read()

soup = BeautifulSoup(html, 'html.parser')
html_str = str(soup)

# Try to find title1 variable
match = re.search(r"var\s+title1\s*=\s*['\"]([^'\"]+)['\"]", html_str)
if match:
    print("Found title1:", match.group(1))
else:
    print("title1 not found")

# Also try direct search in raw HTML
match2 = re.search(r"var\s+title1\s*=\s*['\"]([^'\"]+)['\"]", html)
if match2:
    print("Found in raw HTML:", match2.group(1))
