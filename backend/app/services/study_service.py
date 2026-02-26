import google.generativeai as genai
import json
import random
from app.core.config import settings
from app.core.database import db  # Assuming MongoDB motor setup

genai.configure(api_key=settings.GEMINI_API_KEY)

# Use Flash for faster generation of quizzes
study_model = genai.GenerativeModel(
    model_name="gemini-1.5-flash",
    system_instruction="You are AskMyNotes Quiz Master. Generate questions STRICTLY from the provided source text chunks.",
)

PROMPT_TEMPLATE = """
Generate a study quiz based ONLY on the following text chunks.
Follow this exact JSON structure and do not output anything else.

CHUNKS:
{chunks_text}

JSON SCHEMA:
{{
  "mcqs": [
    {{
      "question": "Question text",
      "options": ["A", "B", "C", "D"],
      "correctOptionIndex": 0,
      "explanation": "Brief explanation",
      "sourceChunkId": "chunk_id_from_above"
    }}, ... (exactly 5 MCQs)
  ],
  "saqs": [
    {{
      "question": "Short answer question",
      "modelAnswer": "Expected correct answer",
      "sourceChunkId": "chunk_id_from_above"
    }}, ... (exactly 3 SAQs)
  ]
}}
"""

async def generate_quiz(subject_id: str) -> dict:
    # 1. Fetch random chunks from MongoDB for this subject
    # We sample 8-10 chunks to base the 8 questions on
    pipeline = [
        {"$match": {"subjectId": subject_id}},
        {"$sample": {"size": 8}}
    ]
    cursor = db.chunks.aggregate(pipeline)
    chunks = await cursor.to_list(length=8)
    
    if not chunks:
        raise ValueError("Not enough notes uploaded for this subject to generate a quiz.")
        
    chunks_text = ""
    for c in chunks:
        chunks_text += f"\n[CHUNK ID: {c['chunkId']}]\n{c['text']}\n"
        
    prompt = PROMPT_TEMPLATE.format(chunks_text=chunks_text)
    
    # Enable JSON mode for gemini
    response = study_model.generate_content(
        prompt,
        generation_config={"response_mime_type": "application/json"}
    )
    
    try:
        quiz_data = json.loads(response.text)
        return quiz_data
    except json.JSONDecodeError:
        # Fallback if model fails to format JSON correctly
        return {"error": "Failed to generate quiz format"}

async def get_remedial_chunk(chunk_id: str) -> dict:
    """Fetch the exact chunk text for a wrong answer in the UI."""
    chunk = await db.chunks.find_one({"chunkId": chunk_id}, {"_id": 0})
    return chunk
