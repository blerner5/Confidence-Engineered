const API_BASE = "http://127.0.0.1:5000/api/session";

export async function startInterviewSession() {
  const response = await fetch(`${API_BASE}/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  return response.json();
}

export async function respondInterviewSession(sessionId, userMessage) {
  const response = await fetch(`${API_BASE}/respond`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId, user_message: userMessage }),
  });
  return response.json();
}

export async function endInterviewSession(sessionId) {
  const response = await fetch(`${API_BASE}/end`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId }),
  });
  return response.json();
}