from __future__ import annotations

from datetime import datetime
import re
from typing import List, Tuple
import uuid

from app.core.database import get_db

MAX_CONTEXT_TURNS = 4

FOLLOW_UP_PATTERNS = (
    "it",
    "that",
    "this",
    "those",
    "these",
    "previous",
    "earlier",
    "same topic",
    "same concept",
    "give an example",
    "another example",
    "simplify",
    "explain further",
    "compare",
)


def create_session_id() -> str:
    return str(uuid.uuid4())


def _is_follow_up_query(query: str) -> bool:
    normalized = re.sub(r"\s+", " ", query.strip().lower())
    if not normalized:
        return False
    return any(pattern in normalized for pattern in FOLLOW_UP_PATTERNS)


def resolve_query_with_context(query: str, turns: List[dict]) -> Tuple[str, bool]:
    """
    For short follow-up prompts, append prior questions from the same session.
    This is only for retrieval disambiguation, not as factual source material.
    """
    if not turns or not _is_follow_up_query(query):
        return query, False

    previous_questions = [turn.get("query", "").strip() for turn in turns[-2:] if turn.get("query")]
    if not previous_questions:
        return query, False

    context_hint = " | ".join(previous_questions)
    resolved_query = (
        f"{query.strip()} (Conversation context in same subject: {context_hint})"
    )
    return resolved_query, True


async def get_recent_turns(
    *,
    session_id: str,
    subject_id: str,
    user_id: str,
    limit: int = MAX_CONTEXT_TURNS,
) -> List[dict]:
    db = get_db()
    cursor = (
        db.conversation_turns.find(
            {
                "sessionId": session_id,
                "subjectId": subject_id,
                "userId": user_id,
            }
        )
        .sort("createdAt", -1)
        .limit(limit)
    )

    turns = await cursor.to_list(length=limit)
    turns.reverse()
    return turns


async def save_turn(
    *,
    session_id: str,
    subject_id: str,
    user_id: str,
    query: str,
    resolved_query: str,
    answer: str,
    confidence_tier: str,
    citations: List[dict],
    evidence_snippets: List[str],
    context_used: bool,
) -> None:
    db = get_db()
    await db.conversation_turns.insert_one(
        {
            "id": str(uuid.uuid4()),
            "sessionId": session_id,
            "subjectId": subject_id,
            "userId": user_id,
            "query": query,
            "resolvedQuery": resolved_query,
            "answer": answer,
            "confidenceTier": confidence_tier,
            "citations": citations,
            "evidenceSnippets": evidence_snippets,
            "contextUsed": context_used,
            "createdAt": datetime.utcnow(),
        }
    )
