from langchain_text_splitters import RecursiveCharacterTextSplitter
import re
import uuid

CHUNK_SIZE = 500        # tokens (~375 words)
CHUNK_OVERLAP = 50      # helps maintain context continuity
SEPARATORS = ["\n\n", "\n", ".", "!", "?", ",", " "]

def chunk_text(text: str, metadata: dict) -> list[dict]:
    """Split text into chunks with context continuity overlaps."""
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
        separators=SEPARATORS,
        length_function=len,
    )
    
    # We create raw strings first
    chunks_raw = splitter.split_text(text)
    
    result = []
    for i, c in enumerate(chunks_raw):
        chunk_id = str(uuid.uuid4())
        location_ref = extract_location_ref(c, metadata, i)
        
        result.append({
            "chunkId": chunk_id,
            "text": c,
            "subjectId": metadata.get("subjectId"),
            "documentId": metadata.get("documentId"),
            "fileName": metadata.get("fileName", "Unknown"),
            "sourceFormat": metadata.get("sourceFormat", "unknown"),
            "locationRef": location_ref,
            "chunkIndex": i,
        })
        
    return result

def extract_location_ref(chunk_text: str, metadata: dict, index: int) -> str:
    """Build a human-readable citation reference for where this chunk came from."""
    fmt = metadata.get("sourceFormat", "").lower()
    
    if fmt == "pdf":
        # Extract page number injected during PyMuPDF extraction: [Page X]
        match = re.search(r"\[Page (\d+)\]", chunk_text)
        if match:
            return f"Page {match.group(1)}"
        return "PDF text"
    elif fmt == "pptx":
        # Extract slide number injected during extraction: [Slide X]
        match = re.search(r"\[Slide (\d+)\]", chunk_text)
        if match:
            return f"Slide {match.group(1)}"
        return "Presentation slide"
    else:
        # Default fallback
        return f"Section {index + 1}"
