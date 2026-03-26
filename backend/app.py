import json
import logging
import os
import tempfile
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from flask import Flask, jsonify, request
import jwt
from datetime import timedelta

SECRET_KEY = "change-this-to-a-long-random-secret"
JWT_ALGORITHM = "HS256"

USERS = {}

try:
    from openai import OpenAI
except ImportError:
    OpenAI = None


app = Flask(__name__)
app.logger.setLevel(logging.INFO)


SESSIONS: Dict[str, Dict[str, Any]] = {}
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _parse_bool(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.strip().lower() in {"1", "true", "yes", "y", "on"}
    return False


def _debug_enabled() -> bool:
    header_debug = request.headers.get("X-Debug")
    query_debug = request.args.get("debug")
    body_debug = None
    if request.is_json:
        body = request.get_json(silent=True) or {}
        body_debug = body.get("debug")
    return _parse_bool(header_debug) or _parse_bool(query_debug) or _parse_bool(body_debug)


def _openai_client() -> Optional[Any]:
    if OpenAI is None:
        return None
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return None
    return OpenAI(api_key=api_key)


def _call_chat(messages: List[Dict[str, str]], temperature: float = 0.5) -> Optional[str]:
    client = _openai_client()
    if not client:
        return None
    try:
        completion = client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=messages,
            temperature=temperature,
        )
        return completion.choices[0].message.content.strip()
    except Exception as exc:
        app.logger.warning("OpenAI chat call failed: %s", exc)
        return None


def _transcribe_audio(uploaded_file) -> Optional[str]:
    client = _openai_client()
    if not client:
        return None

    suffix = os.path.splitext(uploaded_file.filename or "audio.webm")[1] or ".webm"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=True) as tmp:
        uploaded_file.save(tmp.name)
        with open(tmp.name, "rb") as f:
            try:
                result = client.audio.transcriptions.create(model="whisper-1", file=f)
                return (result.text or "").strip()
            except Exception as exc:
                app.logger.warning("Whisper transcription failed: %s", exc)
                return None


def _build_system_prompt(job_description: str, background: str, topics: List[str]) -> str:
    topic_text = ", ".join(topics) if topics else "general behavioral interview skills"
    return (
        "You are a professional behavioral interviewer. "
        "Run a realistic interview for the provided role and candidate background. "
        "Ask one question at a time. Ask follow-up probing questions when needed. "
        "If the user is stuck, offer a brief hint and continue. "
        "Keep tone constructive and concise.\n\n"
        f"Job Description:\n{job_description}\n\n"
        f"Candidate Background:\n{background}\n\n"
        f"Topics to cover: {topic_text}\n"
    )


def _mock_first_question(topics: List[str]) -> str:
    if topics:
        return f"To start, tell me about a time you demonstrated {topics[0]}."
    return "To start, tell me about yourself and a recent challenge you handled at work."


def _mock_next_question(session: Dict[str, Any], user_text: str) -> str:
    topics = session["topics"]
    idx = session["current_topic_index"]
    if not user_text or len(user_text.split()) < 15:
        return "Can you add more specifics using the situation, action, and result?"

    if idx + 1 < len(topics):
        session["current_topic_index"] += 1
        next_topic = topics[session["current_topic_index"]]
        return f"Good context. Now walk me through a situation that shows {next_topic}."
    return "Thanks. Before we wrap, what would you improve in one of your examples?"


def _extract_feedback_json(raw_text: str) -> Optional[Dict[str, Any]]:
    try:
        return json.loads(raw_text)
    except Exception:
        pass
    start = raw_text.find("{")
    end = raw_text.rfind("}")
    if start >= 0 and end > start:
        try:
            return json.loads(raw_text[start : end + 1])
        except Exception:
            return None
    return None


def _mock_feedback(session: Dict[str, Any]) -> Dict[str, Any]:
    user_answers = [m["content"] for m in session["messages"] if m["role"] == "user"]
    avg_len = 0 if not user_answers else sum(len(a.split()) for a in user_answers) / len(user_answers)
    confidence_score = min(95, max(50, int(55 + avg_len * 0.8)))
    base = min(90, max(45, int(50 + avg_len * 0.7)))
    return {
        "clarity": {"score": base, "comment": "Responses were generally understandable."},
        "relevance": {"score": base + 2, "comment": "Most examples stayed on topic."},
        "structure": {"score": base - 3, "comment": "Use clearer STAR framing in each answer."},
        "confidence": {"score": confidence_score, "comment": "Tone was steady; add stronger ownership language."},
        "depth": {"score": base - 1, "comment": "Add measurable outcomes to increase impact."},
        "overall_coaching_note": "Prioritize concise STAR stories with specific metrics and decisions.",
    }


@app.post("/api/session/start")
def start_session():
    payload = request.get_json(silent=True) or {}
    job_description = (payload.get("job_description") or "").strip()
    background = (payload.get("background") or "").strip()
    topics = payload.get("topics") or payload.get("behavioral_topics") or []
    if not isinstance(topics, list):
        return jsonify({"error": "topics must be a list of strings"}), 400
    topics = [str(t).strip() for t in topics if str(t).strip()]

    if not job_description:
        return jsonify({"error": "job_description is required"}), 400

    system_prompt = _build_system_prompt(job_description, background, topics)
    session_id = str(uuid.uuid4())

    messages = [
        {"role": "system", "content": system_prompt},
        {
            "role": "user",
            "content": "Begin the interview with the first behavioral question.",
        },
    ]
    ai_message = _call_chat(messages, temperature=0.4) or _mock_first_question(topics)
    messages.append({"role": "assistant", "content": ai_message})

    session = {
        "session_id": session_id,
        "created_at": _utc_now(),
        "ended_at": None,
        "status": "active",
        "job_description": job_description,
        "background": background,
        "topics": topics,
        "current_topic_index": 0,
        "messages": messages,
        "feedback": None,
    }
    SESSIONS[session_id] = session

    response = {
        "session_id": session_id,
        "interviewer_message": ai_message,
    }
    if _debug_enabled():
        response["_debug"] = {
            "mode": "openai" if _openai_client() else "mock",
            "topic_count": len(topics),
            "current_topic_index": session["current_topic_index"],
            "messages": session["messages"],
        }
    return jsonify(response), 200


@app.post("/api/session/respond")
def respond_session():
    payload = request.get_json(silent=True) if request.is_json else {}
    payload = payload or {}
    session_id = payload.get("session_id") or request.form.get("session_id")
    if not session_id:
        return jsonify({"error": "session_id is required"}), 400

    session = SESSIONS.get(session_id)
    if not session:
        return jsonify({"error": "session not found"}), 404
    if session["status"] != "active":
        return jsonify({"error": "session is not active"}), 400

    user_text = (payload.get("response") or payload.get("transcript") or "").strip()
    transcript_source = "text"
    if not user_text and "audio" in request.files:
        transcript_source = "audio"
        user_text = (_transcribe_audio(request.files["audio"]) or "").strip()

    if not user_text:
        return jsonify({"error": "response text or audio is required"}), 400

    session["messages"].append({"role": "user", "content": user_text})
    ai_message = _call_chat(session["messages"], temperature=0.5) or _mock_next_question(session, user_text)
    session["messages"].append({"role": "assistant", "content": ai_message})

    response = {
        "session_id": session_id,
        "transcript": user_text,
        "transcript_source": transcript_source,
        "interviewer_message": ai_message,
    }
    if _debug_enabled():
        response["_debug"] = {
            "mode": "openai" if _openai_client() else "mock",
            "current_topic_index": session["current_topic_index"],
            "message_count": len(session["messages"]),
            "last_user_message_word_count": len(user_text.split()),
        }
    return jsonify(response), 200


@app.post("/api/session/end")
def end_session():
    payload = request.get_json(silent=True) or {}
    session_id = payload.get("session_id")
    if not session_id:
        return jsonify({"error": "session_id is required"}), 400

    session = SESSIONS.get(session_id)
    if not session:
        return jsonify({"error": "session not found"}), 404

    if session["status"] == "ended" and session["feedback"]:
        response = {"session_id": session_id, "feedback": session["feedback"]}
        if _debug_enabled():
            response["_debug"] = {"cached_feedback": True}
        return jsonify(response), 200

    feedback_prompt = (
        "Score the candidate from 0-100 on clarity, relevance, structure, confidence, and depth. "
        "Return strict JSON with keys: clarity, relevance, structure, confidence, depth, overall_coaching_note. "
        "Each dimension key must map to an object with score and comment."
    )
    feedback_messages = list(session["messages"]) + [{"role": "user", "content": feedback_prompt}]
    raw_feedback = _call_chat(feedback_messages, temperature=0.2)

    feedback = None
    if raw_feedback:
        feedback = _extract_feedback_json(raw_feedback)
    if not feedback:
        feedback = _mock_feedback(session)

    session["status"] = "ended"
    session["ended_at"] = _utc_now()
    session["feedback"] = feedback

    response = {"session_id": session_id, "feedback": feedback}
    if _debug_enabled():
        response["_debug"] = {
            "mode": "openai" if raw_feedback else "mock",
            "ended_at": session["ended_at"],
            "message_count": len(session["messages"]),
        }
    return jsonify(response), 200


@app.get("/api/session/debug/<session_id>")
def debug_session(session_id: str):
    session = SESSIONS.get(session_id)
    if not session:
        return jsonify({"error": "session not found"}), 404
    return jsonify({"session": session}), 200


if __name__ == "__main__":
    app.run(debug=True)

