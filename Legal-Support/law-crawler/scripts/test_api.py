import requests
import json
import time

BASE_URL = "http://localhost:8080/api/v1/query"

def test_query(question):
    print(f"\n{'='*50}")
    print(f"Testing Question: {question}")
    print(f"{'='*50}")
    
    # 1. Test Graph Query
    print("\n--- Graph Query (POST /api/v1/query) ---")
    try:
        payload = {"text": question, "debug": True}
        start = time.time()
        resp = requests.post(f"{BASE_URL}", json=payload)
        duration = time.time() - start
        
        if resp.status_code == 200:
            data = resp.json()
            answers = data.get("answers", [])
            print(f"Status: {resp.status_code} (Time: {duration:.2f}s)")
            print(f"Found {len(answers)} potential answers/snippets.")
            
            for i, ans in enumerate(answers[:3]): # Show top 3
                print(f"\n[Result {i+1}] Score: {ans.get('score')}")
                print(f"Doc: {ans.get('doc_ref')}")
                print(f"Snippet: {ans.get('snippet')}")
                
            if 'debug' in data:
                debug = data['debug'] or {}
                print(f"\nDebug Info:")
                candidates = debug.get('candidates') or []
                stars = debug.get('stars') or []
                print(f"- Terms extracted: {len(candidates)} candidates found")
                print(f"- Stars built: {len(stars)}")
        else:
            print(f"Error {resp.status_code}: {resp.text}")
            
    except Exception as e:
        print(f"Exception: {e}")

    # 2. Test RAG Query (Semantic Search)
    print("\n--- RAG Query (POST /api/v1/query/rag) ---")
    try:
        payload = {
            "question": question, 
            "top_k": 3, 
            "answer": True # Try to generate an answer
        }
        start = time.time()
        resp = requests.post(f"{BASE_URL}/rag", json=payload)
        duration = time.time() - start
        
        if resp.status_code == 200:
            data = resp.json()
            items = data.get("items", [])
            answer = data.get("answer", "")
            
            print(f"Status: {resp.status_code} (Time: {duration:.2f}s)")
            if answer:
                print(f"\nGenerated Answer: {answer}")
            else:
                print("\nNo answer generated (Embedding/QA provider likely missing)")
                
            print(f"Found {len(items)} semantic matches.")
            for i, item in enumerate(items[:3]):
                print(f"\n[Match {i+1}] Distance: {item.get('distance')}")
                print(f"Doc: {item.get('document_title')}")
                print(f"Snippet: {item.get('snippet')}")
        else:
            print(f"Error {resp.status_code}: {resp.text}")
            
    except Exception as e:
        print(f"Exception: {e}")

if __name__ == "__main__":
    # Test connectivity first
    try:
        print("Checking API connectivity...")
        resp = requests.get(f"{BASE_URL}/documents?limit=1")
        if resp.status_code == 200:
            print(f"API is UP. Total documents: {resp.json().get('total')}")
        else:
            print(f"API returned status {resp.status_code}")
    except Exception as e:
        print(f"Could not connect to API: {e}")
        print("Ensure the docker container is running and port 8080 is mapped.")
        exit(1)

    # Questions to test
    questions = [
        "hành vi bị nghiêm cấm trong phòng chống tham nhũng",
        "trách nhiệm của sĩ quan",
        "thuế suất thuế thu nhập doanh nghiệp",
        "nguyên tắc xử lý vi phạm"
    ]
    
    for q in questions:
        test_query(q)
