from fastapi import APIRouter, HTTPException
from app.schemas.qa_schema import QARequest, QAResponse
from app.services.rag_service import ask_question
from app.services.conversation_service import (
    create_session_id,
    get_recent_turns,
    resolve_query_with_context,
    save_turn,
)
from app.core.database import get_db
from datetime import datetime
import uuid

router = APIRouter()
MOCK_USER_ID = "user_123"

@router.post("/", response_model=QAResponse)
@router.post("/ask", response_model=QAResponse)
async def ask(request: QARequest):
    db = get_db()
    session_id = request.sessionId or create_session_id()
    
    # Fetch subject name for the prompt
    subject = await db.subjects.find_one({"id": request.subjectId})
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    
    try:
        recent_turns = await get_recent_turns(
            session_id=session_id,
            subject_id=request.subjectId,
            user_id=MOCK_USER_ID,
        )
        resolved_query, context_used = resolve_query_with_context(request.query, recent_turns)

        # Orchestrate the RAG pipeline
        result = await ask_question(
            query=resolved_query,
            subject_id=request.subjectId,
            subject_name=subject["name"],
            user_id=MOCK_USER_ID,
            conversation_history=recent_turns,
        )
        
        # Log the Q&A interaction for heatmap/analytics
        log_entry = {
            "id": str(uuid.uuid4()),
            "userId": MOCK_USER_ID,
            "sessionId": session_id,
            "subjectId": request.subjectId,
            "query": request.query,
            "resolvedQuery": resolved_query,
            "answer": result["answer"],
            "confidenceTier": result["confidenceTier"],
            "confidenceScore": result["confidenceScore"],
            "topChunkIds": result.get("topChunkIds", []),
            "createdAt": datetime.utcnow()
        }
        await db.qa_logs.insert_one(log_entry)

        await save_turn(
            session_id=session_id,
            subject_id=request.subjectId,
            user_id=MOCK_USER_ID,
            query=request.query,
            resolved_query=resolved_query,
            answer=result["answer"],
            confidence_tier=result["confidenceTier"],
            citations=result.get("citations", []),
            evidence_snippets=result.get("evidenceSnippets", []),
            context_used=context_used,
        )

        response_payload = dict(result)
        response_payload["sessionId"] = session_id
        
        return QAResponse(**response_payload)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
