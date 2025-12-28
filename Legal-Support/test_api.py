import requests
import json
import time

url = "http://localhost:8080/api/v1/query"
payload = {
    "text": "Phạm vi điều chỉnh của Luật biển Việt Nam?",
    "debug": True
}
headers = {
    "Content-Type": "application/json; charset=utf-8"
}

start = time.time()
try:
    response = requests.post(url, json=payload, headers=headers, timeout=120)
    print(f"Status Code: {response.status_code}")
    print(f"Time: {time.time() - start:.2f}s")
    
    if response.status_code == 200:
        data = response.json()
        print("\n=== Answer ===")
        answers = data.get('answers')
        if answers:
            for ans in answers:
                print(f"- {ans.get('text')}")
        else:
            print("No answers found.")
            
        print("\n=== Debug Info ===")
        debug = data.get('debug', {})
        
        print("\n[Candidates]")
        for c in debug.get('candidates', []):
            print(f"  {c.get('name')} ({c.get('type')}) - Score: {c.get('score')} - Match: {c.get('match_type')}")
            
        print("\n[Stars]")
        stars = debug.get('stars')
        if stars:
            for i, star in enumerate(stars):
                triples = star.get('matching_triples')
                if triples:
                    print(f"  Star {i+1}: {len(triples)} triples")
                    for t in triples[:3]:
                        print(f"    {t.get('subject')} --[{t.get('relation')}]--> {t.get('object')}")
                else:
                    print(f"  Star {i+1}: 0 triples")
        else:
            print("No stars found.")

    else:
        print(response.text)

except Exception as e:
    print(f"Error: {e}")
