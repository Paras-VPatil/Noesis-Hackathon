import google.generativeai as genai
from app.core.config import settings

genai.configure(api_key=settings.GEMINI_API_KEY)

EMBEDDING_MODEL = "models/text-embedding-004"
EMBEDDING_DIM = 768
TASK_TYPE_DOC = "RETRIEVAL_DOCUMENT"
TASK_TYPE_QUERY = "RETRIEVAL_QUERY"

def embed_chunks(chunks: list[dict]) -> list[dict]:
    """Embed document chunks with RETRIEVAL_DOCUMENT task type for asymmetric retrieval."""
    if not chunks:
        return []
        
    texts = [c["text"] for c in chunks]
    
    result = genai.embed_content(
        model=EMBEDDING_MODEL,
        content=texts,
        task_type=TASK_TYPE_DOC,
    )
    
    for chunk, embedding in zip(chunks, result["embedding"]):
        chunk["embedding"] = embedding
        
    return chunks

def embed_query(query: str) -> list[float]:
    """Embed a user query with RETRIEVAL_QUERY task type."""
    result = genai.embed_content(
        model=EMBEDDING_MODEL,
        content=query,
        task_type=TASK_TYPE_QUERY,
    )
    return result["embedding"]
