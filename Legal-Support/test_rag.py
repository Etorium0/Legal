import requests
import json
import os

url = "http://localhost:8080/api/v1/query/rag"
payload = {
    "question": "Luật giao thông đường bộ",
    "top_k": 5,
    "answer": True
}
headers = {
    "Content-Type": "application/json"
}

try:
    response = requests.post(url, json=payload, headers=headers)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
