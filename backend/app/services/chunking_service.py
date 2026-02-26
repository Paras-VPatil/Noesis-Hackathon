from langchain_text_splitters import RecursiveCharacterTextSplitter
import re
import uuid
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# Optimized chunk parameters
CHUNK_SIZE = 500        # tokens (~375 words)
CHUNK_OVERLAP = 50      # helps maintain context continuity
SEPARATORS = ["\n\n", "\n", ".", "!", "?", ",", " "]
MIN_CHUNK_SIZE = 50     # Minimum viable chunk size
MAX_CHUNK_SIZE = 1500   # Maximum chunk size to prevent overly large chunks

class ChunkingError(Exception):
    """Custom exception for chunking operations."""
    pass

def chunk_text(text: str, metadata: dict) -> list[dict]:
    """
    Split text into chunks with context continuity overlaps and intelligent sizing.
    
    Args:
        text: The textto chunk
        metadata: Dictionary containing documentId, fileName, sourceFormat, subjectId
        
    Returns:
        List of chunk dictionaries with enriched metadata
        
    Raises:
        ChunkingError: If text is invalid or chunking fails
    """
    if not text or not isinstance(text, str):
        raise ChunkingError("Text must be a non-empty string")
    
    if not metadata or not isinstance(metadata, dict):
        raise ChunkingError("Metadata must be a non-empty dictionary")
    
    # Validate required metadata
    required_fields = ["documentId", "fileName", "sourceFormat", "subjectId"]
    for field in required_fields:
        if field not in metadata:
            raise ChunkingError(f"Missing required metadata field: {field}")
    
    # Preprocess text: remove excessive whitespace while preserving structure
    text = _preprocess_text(text)
    
    if len(text.strip()) < MIN_CHUNK_SIZE:
        logger.warning(f"Text too short ({len(text)} chars) for {metadata['fileName']}")
        raise ChunkingError(f"Text is too short to chunk: {len(text)} characters")
    
    logger.info(f"Chunking {metadata['fileName']}: {len(text)} chars")
    
    # Use adaptive chunk size based on content type
    chunk_size = _get_adaptive_chunk_size(metadata.get("sourceFormat", "unknown"))
    
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=CHUNK_OVERLAP,
        separators=SEPARATORS,
        length_function=len,
    )
    
    chunks_raw = splitter.split_text(text)
    
    if not chunks_raw:
        raise ChunkingError("No chunks generated from text")
    
    logger.info(f"Generated {len(chunks_raw)} chunks from {metadata['fileName']}")
    
    result = []
    for i, c in enumerate(chunks_raw):
        if len(c.strip()) < MIN_CHUNK_SIZE:
            logger.debug(f"Skipping small chunk {i} ({len(c)} chars)")
            continue
            
        chunk_id = str(uuid.uuid4())
        location_ref = extract_location_ref(c, metadata, i)
        
        result.append({
            "chunkId": chunk_id,
            "text": c.strip(),
            "subjectId": metadata.get("subjectId"),
            "documentId": metadata.get("documentId"),
            "fileName": metadata.get("fileName", "Unknown"),
            "sourceFormat": metadata.get("sourceFormat", "unknown"),
            "locationRef": location_ref,
            "chunkIndex": i,
            "chunkLength": len(c),
            "wordCount": len(c.split()),
        })
        
    return result

def extract_location_ref(chunk_text: str, metadata: dict, index: int) -> str:
    """
    Build a human-readable citation reference for where this chunk came from.
    
    Args:
        chunk_text: The chunk content
        metadata: Document metadata
        index: Chunk index
        
    Returns:
        Human-readable location reference
    """
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

def _preprocess_text(text: str) -> str:
    """
    Clean and normalize text for chunking.
    
    Args:
        text: Raw text to preprocess
        
    Returns:
        Cleaned text
    """
    # Remove multiple consecutive newlines (limit to max 2)
    text = re.sub(r'\n\n\n+', '\n\n', text)
    
    # Remove trailing whitespace from lines
    lines = [line.rstrip() for line in text.split('\n')]
    text = '\n'.join(lines)
    
    # Remove trailing/leading whitespace
    text = text.strip()
    
    return text

def _get_adaptive_chunk_size(source_format: str) -> int:
    """
    Get adaptive chunk size based on document type.
    
    Args:
        source_format: Document format (pdf, pptx, docx, etc.)
        
    Returns:
        Recommended chunk size
    """
    format_map = {
        "pdf": 500,      # Technical documents usually need smaller chunks
        "pptx": 400,     # Slides are more concise
        "docx": 550,     # Word docs can be slightly larger
        "txt": 600,      # Plain text can handle larger chunks
        "image": 300,    # OCR text tends to be noisy
    }
    return format_map.get(source_format.lower(), CHUNK_SIZE)

def merge_small_chunks(chunks: list[dict], min_size: int = MIN_CHUNK_SIZE) -> list[dict]:
    """
    Merge consecutive chunks that are too small.
    
    Args:
        chunks: List of chunks
        min_size: Minimum viable chunk size
        
    Returns:
        List of chunks with small ones merged
    """
    if not chunks:
        return []
    
    merged = []
    current_chunk = None
    
    for chunk in chunks:
        if len(chunk["text"]) < min_size:
            # Merge with current or next
            if current_chunk:
                current_chunk["text"] += "\n\n" + chunk["text"]
                current_chunk["chunkLength"] += len(chunk["text"])
            else:
                current_chunk = chunk.copy()
        else:
            if current_chunk:
                merged.append(current_chunk)
            current_chunk = chunk.copy()
    
    if current_chunk:
        merged.append(current_chunk)
    
    logger.info(f"Merged small chunks: {len(chunks)} -> {len(merged)}")
    return merged
