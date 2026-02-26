import google.generativeai as genai
import re
from .embedding_service import embed_query
from app.vectorstore.chroma_client import get_collection
from app.core.config import settings

genai.configure(api_key=settings.GEMINI_API_KEY)

# Anti-Hallucination Configuration
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
   [SOURCE: {filename}, {location_ref}]
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

def compute_confidence(similarities: list[float]) -> dict:
    """Calculate confidence tier based on spatial proximity of vectorized chunks."""
    if not similarities:
        return {"tier": "NOT_FOUND", "score": 0.0}
        
    max_score = max(similarities)
    avg_score = sum(similarities) / len(similarities)
    
    # 70% max + 30% avg (rewards consistent relevance over fluke hits)
    weighted = 0.7 * max_score + 0.3 * avg_score
    
    if weighted < CONFIDENCE_THRESHOLDS["NOT_FOUND"]:
        tier = "NOT_FOUND"
    elif weighted < CONFIDENCE_THRESHOLDS["LOW"]:
        tier = "LOW"
    elif weighted < CONFIDENCE_THRESHOLDS["MEDIUM"]:
        tier = "MEDIUM"
    else:
        tier = "HIGH"
        
    return {"tier": tier, "score": round(weighted, 4), "maxScore": round(max_score, 4)}

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
    """Parse out [SOURCE: name, loc] mentions and resolve them to specific chunk dicts."""
    # Find patterns like [SOURCE: file.pdf, Page 12]
    pattern = r"\[SOURCE:\s*(.*?),\s*(.*?)\]"
    matches = re.findall(pattern, answer_text)
    
    citations = []
    seen = set()
    
    for filename, location in matches:
        sig = f"{filename}_{location}"
        if sig in seen:
            continue
            
        # Try to map to the chunk we provided
        for chunk in chunks:
            if chunk["fileName"] == filename and chunk["locationRef"] == location:
                citations.append({
                    "fileName": chunk["fileName"],
                    "locationRef": chunk["locationRef"],
                    "chunkId": chunk.get("chunkId", ""),
                    "sourceFormat": chunk["sourceFormat"]
                })
                break
                
        seen.add(sig)
        
    return citations

async def ask_question(query: str, subject_id: str, subject_name: str, user_id: str) -> dict:
    """
    Main RAG orchestration logic:
    1. Embed User Query
    2. Vector Search (ChromaDB)
    3. Gate through Confidence Score limits
    4. Compile contextual sources
    5. Prompt Gemini-1.5-Pro
    6. Formulate Payload
    """
    
    # Step 1: Embed query
    query_embedding = embed_query(query)
    
    # Step 2: Vector search (scoped absolutely to the subject collection)
    collection = get_collection(subject_id)
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=5,
        include=["documents", "metadatas", "distances"]
    )
    
    if not results["documents"] or len(results["documents"][0]) == 0:
        return {
            "answer": f"Not found in your notes for {subject_name}",
            "confidenceTier": "NOT_FOUND",
            "confidenceScore": 0.0,
            "citations": [],
            "evidenceSnippets": [],
            "topChunkIds": []
        }
        
    chunks_text = results["documents"][0]
    metadatas = results["metadatas"][0]
    distances = results["distances"][0]
    
    # Convert ChromaDB L2 distance -> cosine similarity (0 to 1) for thresholds
    similarities = [max(0.0, 1.0 - (d / 2.0)) for d in distances]
    
    # Step 3: Confidence Gate
    confidence = compute_confidence(similarities)
    
    if confidence["tier"] == "NOT_FOUND":
        return {
            "answer": f"Not found in your notes for {subject_name}",
            "confidenceTier": "NOT_FOUND",
            "confidenceScore": confidence["score"],
            "citations": [],
            "evidenceSnippets": [],
            "topChunkIds": [m.get("chunkId") for m in metadatas]
        }
    
    # Step 4: Build grounded prompt
    chunk_dicts = []
    for i in range(len(chunks_text)):
        # Reconstruct full dict
        cdict = dict(metadatas[i])
        cdict["text"] = chunks_text[i]
        cdict["similarity"] = similarities[i]
        chunk_dicts.append(cdict)
        
    sources_block = build_sources_block(chunk_dicts)
    
    prompt = SYSTEM_PROMPT.format(
        subject_name=subject_name,
        confidence_tier=confidence["tier"],
        sources_block=sources_block,
        query=query
    )
    
    # Step 5: Ask Gemini
    response = model.generate_content(prompt)
    answer_text = response.text
    
    # Step 6: Parse citations and extract evidence snippets
    citations = extract_citations(answer_text, chunk_dicts)
    
    # Provide the top three original matching documents' texts (limited preview)
    evidence_snippets = [c["text"][:300] + "..." for c in chunk_dicts[:3]]
    
    return {
        "answer": answer_text,
        "confidenceTier": confidence["tier"],
        "confidenceScore": confidence["score"],
        "citations": citations,
        "evidenceSnippets": evidence_snippets,
        "topChunkIds": [m.get("chunkId") for m in metadatas]
    }
