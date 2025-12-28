import requests
import json
import time

API_URL = "http://localhost:8080/api/v1"

def test_query(question):
    print(f"\nTesting Question: {question}")
    url = f"{API_URL}/query"
    start = time.time()
    try:
        response = requests.post(url, json={"text": question, "debug": True}, timeout=180) # Increased timeout
        print(f"Status: {response.status_code}")
        print(f"Time: {time.time() - start:.2f}s")
        if response.status_code != 200:
            print(f"Error Body: {response.text}")
        else:
            try:
                data = response.json()
                print("Response received (summary):")
                if 'answers' in data and data['answers']:
                    print(f"Answers count: {len(data['answers'])}")
                    for idx, ans in enumerate(data['answers'], start=1):
                        doc_ref = ans.get('doc_ref', '')
                        score = ans.get('score', 0)
                        snippet = ans.get('snippet', '')
                        if snippet and len(snippet) > 600:
                            snippet = snippet[:600] + "..."
                        print(f"{idx}. {doc_ref} | score: {score:.2f}")
                        if snippet:
                            print(snippet)
                else:
                    print("No answers found.")
                
                if 'debug' in data:
                     debug = data['debug'] or {}
                     candidates = debug.get('candidates') or []
                     stars = debug.get('stars') or []
                     print(f"Debug: {len(candidates)} candidates, {len(stars)} stars")
            except Exception as e:
                print(f"Error parsing response: {e}")
                print(f"Raw body: {response.text[:200]}")
    except Exception as e:
        print(f"Exception: {e}")

if __name__ == "__main__":
    # Test 1: The one that was slow
    test_query("hành vi bị nghiêm cấm trong phòng chống tham nhũng")
    
    # Test 2: The one that 500'd
    test_query("trách nhiệm của sĩ quan")
