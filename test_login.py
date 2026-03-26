import requests

url = "http://127.0.0.1:5000/api/session/start"

payload = {
    "job_description": "Software Engineer role focusing on backend systems.",
    "background": "3 years experience in Python and Flask.",
    "topics": ["leadership", "problem solving"]
}

response = requests.post(url, json=payload)

print("Status code:", response.status_code)
print("Raw response:", response.text)

try:
    data = response.json()
    print("Session ID:", data.get("session_id"))
    print("Interviewer message:", data.get("interviewer_message"))
except Exception:
    print("Could not parse JSON.")