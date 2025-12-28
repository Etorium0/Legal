import json
import os
import shutil

# Create phap-dien directory
if not os.path.exists("phap-dien"):
    os.makedirs("phap-dien")

# Move demuc folder if it exists in current dir
if os.path.exists("demuc"):
    if os.path.exists("phap-dien/demuc"):
        shutil.rmtree("phap-dien/demuc")
    shutil.move("demuc", "phap-dien/demuc")
    print("Moved demuc folder to phap-dien/demuc")

# Parse jsonData.js
with open("jsonData.js", "r", encoding="utf-8") as f:
    content = f.read()

# Extract variables
# We can use string manipulation or regex since the format is simple: var name = [...];
import re

def extract_var(name, content):
    pattern = r'var ' + name + r' = (\[.*?\]);'
    # Use dotall to match across lines if needed, but here it seems to be one line per var or close enough
    # Actually, jsonData.js might be huge, so regex on whole file might be slow or hit limits.
    # But let's try finding the start index.
    start_str = f"var {name} = "
    start_idx = content.find(start_str)
    if start_idx == -1:
        print(f"Variable {name} not found")
        return None
    
    start_idx += len(start_str)
    # Find the end of the array. It ends with ];
    # But since there are nested objects, we need to balance brackets or just find the next "var " or end of file.
    # Actually, looking at the file snippet:
    # var jdChuDe = [...];
    # var jdDeMuc = [...];
    # var jdAllTree = [...];
    # They seem to be sequential.
    
    # Let's find the semicolon?
    # JSON doesn't contain semicolons outside strings.
    # But simpler: find the next "var " or EOF.
    
    # A safer way: use a simple parser to find the matching closing bracket.
    cnt = 0
    end_idx = start_idx
    started = False
    for i in range(start_idx, len(content)):
        char = content[i]
        if char == '[':
            cnt += 1
            started = True
        elif char == ']':
            cnt -= 1
        
        if started and cnt == 0:
            end_idx = i + 1
            break
            
    json_str = content[start_idx:end_idx]
    try:
        data = json.loads(json_str)
        return data
    except Exception as e:
        print(f"Error parsing JSON for {name}: {e}")
        return None

jdChuDe = extract_var("jdChuDe", content)
if jdChuDe:
    with open("phap-dien/chude.json", "w", encoding="utf-8") as f:
        json.dump(jdChuDe, f, ensure_ascii=False, indent=2)
    print("Saved phap-dien/chude.json")

jdDeMuc = extract_var("jdDeMuc", content)
if jdDeMuc:
    with open("phap-dien/demuc.json", "w", encoding="utf-8") as f:
        json.dump(jdDeMuc, f, ensure_ascii=False, indent=2)
    print("Saved phap-dien/demuc.json")

jdAllTree = extract_var("jdAllTree", content)
if jdAllTree:
    with open("phap-dien/treeNode.json", "w", encoding="utf-8") as f:
        json.dump(jdAllTree, f, ensure_ascii=False, indent=2)
    print("Saved phap-dien/treeNode.json")
