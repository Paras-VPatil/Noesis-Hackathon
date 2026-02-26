import google.generativeai as genai
from app.core.config import settings
import asyncio
import math
import logging

logger = logging.getLogger(__name__)

genai.configure(api_key=settings.GEMINI_API_KEY)

EMBEDDING_MODEL = "models/text-embedding-004"
EMBEDDING_DIM = 768
TASK_TYPE_DOC = "RETRIEVAL_DOCUMENT"
TASK_TYPE_QUERY = "RETRIEVAL_QUERY"
MAX_RETRIES = 3
RETRY_DELAY = 1.0  # seconds

class EmbeddingError(Exception):
    """Custom exception for embedding operations."""
    pass

def _stabilize_fallback_embedding(embedding: list[float]) -> list[float]:
    """
    Stabilize fallback embeddings by mean-centering and L2 normalization.
    This is only used in rare mismatch fallback mode.
    """
    if not embedding:
        return embedding

    mean_val = sum(embedding) / len(embedding)
    centered = [x - mean_val for x in embedding]
    norm = math.sqrt(sum(x * x for x in centered))
    if norm == 0:
        return embedding
    return [x / norm for x in centered]

async def embed_chunks(chunks: list[dict], batch_size: int = 50) -> list[dict]:
    """
    Embed document chunks with RETRIEVAL_DOCUMENT task type for asymmetric retrieval.
    
    Args:
        chunks: List of chunk dictionaries with 'text' key
        batch_size: Number of chunks to embed per API call (default 50)
        
    Returns:
        List of chunks with 'embedding' field added
        
    Raises:
        EmbeddingError: If embedding fails after retries
    """
    if not chunks:
        return []
    
    logger.info(f"Embedding {len(chunks)} chunks in batches of {batch_size}")
    
    # Validate chunks have required fields
    for chunk in chunks:
        if "text" not in chunk:
            raise EmbeddingError("Chunk missing 'text' field")
        if not chunk["text"].strip():
            raise EmbeddingError("Chunk contains empty text")
    
    # Process in batches to handle rate limits
    embedded_chunks = []
    texts = [c["text"] for c in chunks]
    
    for i in range(0, len(texts), batch_size):
        batch_texts = texts[i:i + batch_size]
        batch_chunks = chunks[i:i + batch_size]
        
        embeddings = await _embed_with_retry(batch_texts, TASK_TYPE_DOC)

        # Defensive handling: some providers/mocks may return mismatched counts.
        if len(embeddings) != len(batch_chunks):
            logger.warning(
                "Embedding count mismatch (expected %d, got %d). Falling back to per-chunk embedding.",
                len(batch_chunks),
                len(embeddings),
            )
            embeddings = []
            for chunk in batch_chunks:
                single = await _embed_with_retry([chunk["text"]], TASK_TYPE_DOC)
                if not single:
                    raise EmbeddingError("Failed to embed chunk during fallback mode")
                embeddings.append(_stabilize_fallback_embedding(single[0]))
        
        for chunk, embedding in zip(batch_chunks, embeddings):
            chunk["embedding"] = embedding
            embedded_chunks.append(chunk)
            
    logger.info(f"Successfully embedded {len(embedded_chunks)} chunks")
    return embedded_chunks

async def embed_query(query: str) -> list[float]:
    """
    Embed a user query with RETRIEVAL_QUERY task type.
    
    Args:
        query: The user's question/query string
        
    Returns:
        Query embedding vector (list of floats)
        
    Raises:
        EmbeddingError: If embedding fails after retries
    """
    if not query or not query.strip():
        raise EmbeddingError("Query cannot be empty")
    
    logger.info(f"Embedding query: {query[:50]}...")
    
    embeddings = await _embed_with_retry([query], TASK_TYPE_QUERY)
    return embeddings[0]

async def _embed_with_retry(texts: list[str], task_type: str) -> list[list[float]]:
    """
    Helper function to embed texts with exponential backoff retry logic.
    
    Args:
        texts: List of text strings to embed
        task_type: Either TASK_TYPE_DOC or TASK_TYPE_QUERY
        
    Returns:
        List of embedding vectors
        
    Raises:
        EmbeddingError: If all retries fail
    """
    for attempt in range(MAX_RETRIES):
        try:
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                None,
                lambda: genai.embed_content(
                    model=EMBEDDING_MODEL,
                    content=texts,
                    task_type=task_type,
                )
            )
            return result["embedding"]
            
        except Exception as e:
            logger.warning(f"Embedding attempt {attempt + 1}/{MAX_RETRIES} failed: {str(e)}")
            
            if attempt < MAX_RETRIES - 1:
                wait_time = RETRY_DELAY * (2 ** attempt)  # Exponential backoff
                await asyncio.sleep(wait_time)
            else:
                logger.error(f"Embedding failed after {MAX_RETRIES} retries")
                raise EmbeddingError(f"Failed to embed texts: {str(e)}")

def validate_embedding(embedding: list[float]) -> bool:
    """Validate embedding vector quality."""
    if not embedding or len(embedding) != EMBEDDING_DIM:
        return False
    # Check for NaN or Inf values
    import math
    return all(not math.isnan(x) and not math.isinf(x) for x in embedding)
