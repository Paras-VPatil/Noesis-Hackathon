import google.generativeai as genai
import re
import logging
import asyncio
from typing import List, Tuple
from .embedding_service import embed_query
from app.vectorstore import chroma_client
from app.core.config import settings

logger = logging.getLogger(__name__)

genai.configure(api_key=settings.GEMINI_API_KEY)

NOT_FOUND_TEMPLATE = "Not found in your notes for {subject_name}"

# Anti-Hallucination Configuration with refined thresholds
CONFIDENCE_THRESHOLDS = {
    "NOT_FOUND": 0.60,    # below this -> refuse to answer
    "LOW": 0.75,          # 0.60-0.74 -> LOW
    "MEDIUM": 0.90,       # 0.75-0.89 -> MEDIUM
    "HIGH": 1.00          # >= 0.90   -> HIGH
}

GENERATION_CONFIG = {
    "temperature": 0.1,          # near-deterministic, no creative drift
    "top_p": 0.85,               # restrict token sampling to top 85% probability mass
    "top_k": 20,                 # only sample from top 20 tokens
    "max_output_tokens": 1024,   # prevent runaway responses
    "candidate_count": 1,        
}

SAFETY_SETTINGS = [
    {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
    {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
]

SYSTEM_PROMPT = """
You are AskMyNotes, a strict study assistant. You ONLY answer questions using the
source material provided below in [SOURCE] blocks. 

RULES — you MUST follow ALL of them without exception:
1. NEVER use any knowledge outside the [SOURCE] blocks below.
2. If the [SOURCE] blocks do not contain enough information -> respond EXACTLY:
   "Not found in your notes for {subject_name}"
   Do NOT attempt to answer from memory. Do NOT guess. Do NOT fill gaps.
3. Every factual claim in your answer MUST cite its source using:
   [SOURCE: {{filename}}, {{location_ref}}]
4. Do NOT rephrase, embellish, or add context not present in the sources.
5. If sources partially answer the question -> answer only the part that is supported,
   and clearly state what could not be found.
6. Confidence is pre-computed — your answer must match the confidence tier: {confidence_tier}
   - HIGH: answer fully from sources
   - MEDIUM: answer but note uncertainty
   - LOW: answer fragments only and warn the student

SOURCES:
{sources_block}

---
Student's Question: {query}
"""

model = genai.GenerativeModel(
    model_name="gemini-1.5-pro",
    generation_config=GENERATION_CONFIG,
    safety_settings=SAFETY_SETTINGS,
    system_instruction="You are AskMyNotes — a strict, source-only study assistant.",
)

class RAGError(Exception):
    """Custom exception for RAG operations."""
    pass

async def _generate_multi_queries(query: str, subject_name: str) -> List[str]:
    """
    Generate alternative versions of the user query to improve retrieval recall.
    Uses gemini-1.5-flash for speed.
    """
    prompt = f"""
    You are a study assistant for the subject "{subject_name}". 
    The student asked: "{query}"
    Generate 3 alternative versions of this question that capture different ways a student might ask the same thing or related aspects.
    These should be concise, professional, and optimized for vector search.
    Output ONLY the 3 questions, one per line, no numbering, no introductory text.
    """
    try:
        flash_model = genai.GenerativeModel("gemini-1.5-flash")
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None, 
            lambda: flash_model.generate_content(prompt)
        )
        queries = [q.strip() for q in response.text.strip().split('\n') if q.strip()]
        # Return unique set including original
        return list(dict.fromkeys([query] + queries[:3]))
    except Exception as e:
        logger.warning(f"Multi-query generation failed: {str(e)}")
        return [query]

async def _rerank_chunks(query: str, chunks: List[dict]) -> List[dict]:
    """
    Re-rank retrieved chunks using LLM scoring to improve precision.
    Uses gemini-1.5-flash for efficiency.
    """
    if not chunks:
        return []
    
    # If only 2 chunks, re-ranking is less impactful, but let's do it if > 3
    if len(chunks) <= 2:
        return chunks
        
    # Format chunks for the re-ranker (keep it short)
    chunks_input = ""
    for i, chunk in enumerate(chunks):
        # Snippet for context
        snippet = chunk['text'][:300].replace('\n', ' ')
        chunks_input += f"ID: {i} | Content: {snippet}\n"
    
    prompt = f"""
    User Query: {query}
    
    Below are retrieved text snippets from the student's notes. 
    Rank them from most relevant to least relevant to answering the user query.
    Output only the IDs in order of relevance, separated by commas (e.g., 2,0,1,3).
    Only include the IDs of snippets that actually contain relevant information.
    
    SNIPPETS:
    {chunks_input}
    """
    
    try:
        flash_model = genai.GenerativeModel("gemini-1.5-flash")
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None,
            lambda: flash_model.generate_content(prompt)
        )
        
        # Parse IDs (simple regex to find numbers)
        raw_ids = re.findall(r'\d+', response.text)
        ranked_ids = [int(rid) for rid in raw_ids if int(rid) < len(chunks)]
        
        # Reorder chunks based on ranking
        seen_indices = set()
        reranked = []
        for rid in ranked_ids:
            if rid not in seen_indices:
                reranked.append(chunks[rid])
                seen_indices.add(rid)
        
        # Append remaining chunks as fallback (to maintain recall)
        for i, chunk in enumerate(chunks):
            if i not in seen_indices:
                reranked.append(chunk)
                
        return reranked
    except Exception as e:
        logger.warning(f"Re-ranking failed: {str(e)}")
        return chunks

def _preprocess_query(query: str) -> Tuple[str, List[str]]:
    """
    Preprocess query: normalize, extract keywords, handle edge cases.
    
    Args:
        query: Raw user query
        
    Returns:
        Tuple of (cleaned_query, keywords)
    """
    if not query or not isinstance(query, str) or not query.strip():
        raise RAGError("Query must be a non-empty string")
    
    # Normalize whitespace
    query = re.sub(r'\s+', ' ', query).strip()
    
    # Remove leading question marks/punctuation
    query = re.sub(r'^[?!]+\s*', '', query)
    
    # Extract keywords (simple approach: remove common stop words and strip punctuation)
    stop_words = {
        'what', 'is', 'the', 'a', 'an', 'are', 'and', 'or', 'but', 'in', 'on', 'at', 
        'to', 'for', 'of', 'with', 'by', 'from', 'up', 'about', 'can', 'that', 'this',
        'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must'
    }
    
    # Split and clean each word
    raw_words = query.lower().split()
    keywords = []
    
    for w in raw_words:
        # Strip punctuation from both ends (e.g., "photosynthesis?" -> "photosynthesis")
        clean_w = w.strip('.,?!:;()[]{}')
        if clean_w not in stop_words and len(clean_w) > 2:
            keywords.append(clean_w)
    
    return query, keywords

def compute_confidence(
    similarities: list[float],
    query_keywords: List[str] = None,
    chunk_texts: List[str] = None
) -> dict:
    """
    Calculate confidence tier based on spatial proximity of vectorized chunks.
    Enhanced with keyword matching and similarity distribution analysis.
    
    Args:
        similarities: List of similarity scores from vector search
        query_keywords: Optional list of query keywords for keyword matching
        chunk_texts: Optional chunk texts for keyword verification
        
    Returns:
        Dictionary with tier, score, and diagnostic info
    """
    if not similarities:
        return {"tier": "NOT_FOUND", "score": 0.0, "maxScore": 0.0}
        
    max_score = max(similarities)
    avg_score = sum(similarities) / len(similarities)
    min_score = min(similarities)
    
    # Calculate similarity variance to detect consistency
    variance = sum((s - avg_score) ** 2 for s in similarities) / len(similarities)
    std_dev = variance ** 0.5
    
    # Keyword matching bonus (if provided)
    keyword_bonus = 0.0
    if query_keywords and chunk_texts:
        keyword_matches = sum(
            1 for text in chunk_texts 
            for keyword in query_keywords 
            if keyword.lower() in text.lower()
        )
        keyword_bonus = min(0.05, (keyword_matches / len(chunk_texts)) * 0.10)
    
    # Weighted confidence calculation:
    # - 70% max similarity (primary retrieval relevance)
    # - 25% average similarity (consistency across results)
    # - 20% variance penalty (demote unstable retrieval)
    # - up to +5% keyword matching bonus
    
    weighted = (
        0.75 * max_score + 
        0.25 * avg_score + 
        keyword_bonus - 
        (0.15 * variance)
    )
    
    # Clamp to [0, 1]
    weighted = max(0.0, min(1.0, weighted))
    
    # Determine tier
    if weighted < CONFIDENCE_THRESHOLDS["NOT_FOUND"]:
        tier = "NOT_FOUND"
    elif weighted < CONFIDENCE_THRESHOLDS["LOW"]:
        tier = "LOW"
    elif weighted < CONFIDENCE_THRESHOLDS["MEDIUM"]:
        tier = "MEDIUM"
    else:
        tier = "HIGH"
    
    return {
        "tier": tier,
        "score": round(weighted, 4),
        "maxScore": round(max_score, 4),
        "avgScore": round(avg_score, 4),
        "minScore": round(min_score, 4),
        "variance": round(variance, 4),
        "keywordBonus": round(keyword_bonus, 4),
    }

def _deduplicate_chunks(chunks: list[dict]) -> list[dict]:
    """
    Remove duplicate or near-duplicate chunks based on content similarity.
    
    Args:
        chunks: List of retrieved chunks
        
    Returns:
        Deduplicated chunk list
    """
    if len(chunks) <= 1:
        return chunks
    
    unique_chunks = []
    seen_hashes = set()
    
    for chunk in chunks:
        # Use hash of full content for deduplication
        content_hash = hash(chunk["text"])
        if content_hash not in seen_hashes:
            unique_chunks.append(chunk)
            seen_hashes.add(content_hash)
    
    if len(unique_chunks) < len(chunks):
        logger.info(f"Deduplicated chunks: {len(chunks)} -> {len(unique_chunks)}")
    
    return unique_chunks

def build_sources_block(chunks: list[dict]) -> str:
    """Construct the [SOURCE] block injected into the prompt."""
    parts = []
    for i, chunk in enumerate(chunks):
        parts.append(
            f"[SOURCE {i+1}]\n"
            f"File: {chunk['fileName']}\n"
            f"Location: {chunk['locationRef']}\n"
            f"Format: {chunk['sourceFormat'].upper()}\n"
            f"Content:\n{chunk['text']}\n"
        )
    return "\n---\n".join(parts)

def extract_citations(answer_text: str, chunks: list[dict]) -> list[dict]:
    """
    Parse out [SOURCE: name, loc] mentions and resolve them to specific chunk dicts.
    Enhanced with better pattern matching and validation.
    
    Args:
        answer_text: Model-generated answer text
        chunks: List of source chunks
        
    Returns:
        List of validated citations
    """
    # Find patterns like [SOURCE: file.pdf, Page 12]
    pattern = r"\[SOURCE:\s*(.*?),\s*(.*?)\]"
    matches = re.findall(pattern, answer_text)
    
    citations = []
    seen = set()
    
    for filename, location in matches:
        # Clean whitespace
        filename = filename.strip()
        location = location.strip()
        
        sig = f"{filename}_{location}"
        if sig in seen:
            continue
        
        # Try to map to the chunk we provided
        for chunk in chunks:
            # Allow partial matches for flexibility
            if (chunk["fileName"] == filename or chunk["fileName"].endswith(filename)) and \
               chunk["locationRef"] == location:
                citations.append({
                    "fileName": chunk["fileName"],
                    "locationRef": chunk["locationRef"],
                    "chunkId": chunk.get("chunkId", ""),
                    "sourceFormat": chunk["sourceFormat"]
                })
                seen.add(sig)
                break
    
    logger.info(f"Extracted {len(citations)} citations from answer")
    return citations


def _format_evidence_snippet(chunk: dict) -> str:
    snippet = chunk.get("text", "").replace("\n", " ").strip()
    if len(snippet) > 240:
        snippet = f"{snippet[:240].rstrip()}..."
    file_name = chunk.get("fileName", "Unknown")
    location_ref = chunk.get("locationRef", "Unknown location")
    return f"[{file_name} | {location_ref}] {snippet}"


def _build_evidence_snippets(chunks: list[dict], citations: list[dict] | None = None, limit: int = 3) -> list[str]:
    if not chunks:
        return []

    preferred_chunks: list[dict] = []
    if citations:
        citation_keys = {(c.get("fileName"), c.get("locationRef")) for c in citations}
        preferred_chunks = [
            c for c in chunks if (c.get("fileName"), c.get("locationRef")) in citation_keys
        ]

    ordered = preferred_chunks + [
        c for c in chunks if c not in preferred_chunks
    ]
    return [_format_evidence_snippet(chunk) for chunk in ordered[:limit]]


def _not_found_response(
    subject_name: str,
    confidence_score: float = 0.0,
    chunk_dicts: list[dict] | None = None
) -> dict:
    chunks = chunk_dicts or []
    return {
        "answer": NOT_FOUND_TEMPLATE.format(subject_name=subject_name),
        "confidenceTier": "NOT_FOUND",
        "confidenceScore": round(confidence_score, 4),
        "citations": [],
        "evidenceSnippets": _build_evidence_snippets(chunks, limit=3),
        "topChunkIds": [c.get("chunkId") for c in chunks if c.get("chunkId")],
    }

async def ask_question(
    query: str,
    subject_id: str,
    subject_name: str,
    user_id: str,
    history: list[dict[str, str]] | None = None
) -> dict:
    """
    Main orchestration function for answering a question using RAG.
    Now supports multi-turn history.
    """

    # Main RAG orchestration logic:
    # 1. Preprocess & validate query
    # 2. Embed User Query
    # 3. Vector Search (ChromaDB)
    # 4. Deduplicate results
    # 5. Gate through Confidence Score limits
    # 6. Compile contextual sources
    # 7. Prompt Gemini-1.5-Pro
    # 8. Extract & validate citations
    # 9. Formulate response payload
    
    # Args:
    #     query: User's question
    #     subject_id: Subject ID for scoped search
    #     subject_name: Display name of subject
    #     user_id: User making the request
    #     n_results: Number of results to retrieve (default 5)
        
    # Returns:
    #     Dictionary with answer, confidence, citations, and evidence
        
    # Raises:
    #     RAGError: If RAG pipeline fails
    try:
        # Step 1: Preprocess query
        cleaned_query, keywords = _preprocess_query(query)
        logger.info(f"Query for {subject_name}: {cleaned_query} (keywords: {keywords})")
        
        # Step 2: Multi-query generation & Embedding
        multi_queries = await _generate_multi_queries(cleaned_query, subject_name)
        logger.info(f"Generated {len(multi_queries)} queries for retrieval")
        
        # Step 3: Retrieval (scoped to subject collection)
        all_chunk_dicts = []
        try:
            collection = None
            
            # Retrieve for each query (async potential if needed, but sequential is fine for 3 queries)
            for q in multi_queries:
                try:
                    q_embedding = await embed_query(q)
                except Exception as e:
                    raise RAGError(f"Failed to embed query: {str(e)}")
                if collection is None:
                    collection = chroma_client.get_collection(subject_id)
                results = collection.query(
                    query_embeddings=[q_embedding],
                    n_results=min(5, 8), # get slightly more to allow for re-ranking
                    include=["documents", "metadatas", "distances"]
                )
                logger.debug(f"Retrieved {len(results['documents'][0]) if results['documents'] else 0} results for query: {q}")
                
                if results["documents"] and len(results["documents"][0]) > 0:
                    chunks_text = results["documents"][0]
                    metadatas = results["metadatas"][0]
                    distances = results["distances"][0]
                    similarities = [max(0.0, 1.0 - (d / 2.0)) for d in distances]
                    
                    for i in range(len(chunks_text)):
                        cdict = dict(metadatas[i])
                        cdict["text"] = chunks_text[i]
                        cdict["similarity"] = similarities[i]
                        all_chunk_dicts.append(cdict)
                        
        except RAGError:
            raise
        except Exception as e:
            logger.error(f"Vector retrieval failed: {str(e)}")
            raise RAGError(f"Vector database error: {str(e)}")
        
        # Step 4: Deduplicate chunks (since multi-query likely finds overlapping results)
        chunk_dicts = _deduplicate_chunks(all_chunk_dicts)
        
        # Step 5: Semantic Re-ranking
        if len(chunk_dicts) > 1:
            logger.info(f"Re-ranking {len(chunk_dicts)} chunks...")
            chunk_dicts = await _rerank_chunks(cleaned_query, chunk_dicts)
        
        # Limit to final n_results for the prompt
        chunk_dicts = chunk_dicts[:5] # n_results was removed, hardcoding to 5 as per original default
        
        # Handle empty results
        if not chunk_dicts:
            logger.info(f"No results found for query in {subject_name}")
            return _not_found_response(subject_name=subject_name, confidence_score=0.0, chunk_dicts=[])
        
        # Step 6: Compute confidence with enhanced logic
        similarities_dedup = [c["similarity"] for c in chunk_dicts]
        chunk_texts = [c["text"] for c in chunk_dicts]
        
        confidence = compute_confidence(
            similarities_dedup,
            keywords,
            chunk_texts
        )
        
        logger.info(f"Confidence tier: {confidence['tier']} (score: {confidence['score']})")
        
        # Strict gate: LOW and NOT_FOUND both refuse answering.
        if confidence["tier"] in {"NOT_FOUND", "LOW"}:
            return _not_found_response(
                subject_name=subject_name,
                confidence_score=confidence["score"],
                chunk_dicts=chunk_dicts
            )
        
        # Step 6: Build grounded prompt
        sources_block = build_sources_block(chunk_dicts)
        
        # Format chat history
        history_block = ""
        if history:
            history_lines = ["Conversation History:"]
            for turn in history[-5:]: # Keep last 5 turns to avoid token limit explosion
                role = "User" if turn.get("role") == "user" else "Teacher"
                history_lines.append(f"{role}: {turn.get('content')}")
            history_lines.append("") # Add blank line before current question
            history_block = "\n".join(history_lines)

        prompt = (
            f"You are a helpful study assistant answering questions strictly based on the provided notes for {subject_name}.\n"
            f"You must answer ONLY using the information in the SOURCES below. Do not use outside knowledge.\n"
            f"If the answer is not in the sources, reply exactly with: 'Not found in your notes for {subject_name}'\n"
            f"You must cite your sources in line using the format [SOURCE: FileName, locationRef].\n"
            f"If the user asks a follow-up question (like 'simplify it' or 'give an example'), use the Conversation History to understand what 'it' refers to, but STILL ONLY use the provided SOURCES to answer.\n\n"
            f"{history_block}"
            f"SOURCES:\n{sources_block}\n\n"
            f"QUESTION: {query}\n"
            f"ANSWER:"
        )
        
        # Step 7: Generate response
        try:
            response = model.generate_content(prompt)
            answer_text = (response.text or "").strip()
        except Exception as e:
            logger.error(f"Generation failed: {str(e)}")
            raise RAGError(f"Failed to generate answer: {str(e)}")

        # Empty or explicit not-found outputs are normalized to strict NOT_FOUND.
        if not answer_text or answer_text.lower().startswith("not found in your notes"):
            return _not_found_response(
                subject_name=subject_name,
                confidence_score=confidence["score"],
                chunk_dicts=chunk_dicts
            )
        
        # Step 8: Extract citations
        citations = extract_citations(answer_text, chunk_dicts)
        
        # Enforce citation presence to prevent ungrounded responses.
        if not citations:
            logger.warning("No valid citations found in generated answer. Returning NOT_FOUND.")
            return _not_found_response(
                subject_name=subject_name,
                confidence_score=confidence["score"],
                chunk_dicts=chunk_dicts
            )

        # Provide evidence snippets from cited chunks first.
        evidence_snippets = _build_evidence_snippets(chunk_dicts, citations=citations, limit=3)
        
        logger.info(f"Generated answer with {len(citations)} citations")
        
        return {
            "answer": answer_text,
            "confidenceTier": confidence["tier"],
            "confidenceScore": confidence["score"],
            "citations": citations,
            "evidenceSnippets": evidence_snippets,
            "topChunkIds": [c.get("chunkId") for c in chunk_dicts if c.get("chunkId")],
            "diagnostics": {
                "queryKeywords": keywords,
                "multiQueries": multi_queries,
                "retrievedChunks": len(chunk_dicts),
                "confidenceDetails": confidence
            }
        }
        
    except RAGError:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in RAG pipeline: {str(e)}")
        raise RAGError(f"RAG pipeline error: {str(e)}")
