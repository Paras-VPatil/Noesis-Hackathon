from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from app.services.extraction_service import extract_text_from_file
from app.services.chunking_service import chunk_text
from app.services.embedding_service import embed_chunks
from app.vectorstore.chroma_client import get_collection
from app.core.database import get_db
from datetime import datetime
import uuid

router = APIRouter()
MOCK_USER_ID = "user_123"

@router.post("/")
async def upload_document(
    subjectId: str = Form(...),
    file: UploadFile = File(...)
):
    db = get_db()
    
    # 1. Basic validation
    subject = await db.subjects.find_one({"id": subjectId})
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    
    content = await file.read()
    filename = file.filename
    source_format = filename.split(".")[-1].lower() if "." in filename else "unknown"
    
    try:
        # 2. Extract Text (with EasyOCR fallback where needed)
        extraction = await extract_text_from_file(content, filename)
        
        # 3. Create Document entry
        doc_id = str(uuid.uuid4())
        document_entry = {
            "id": doc_id,
            "userId": MOCK_USER_ID,
            "subjectId": subjectId,
            "fileName": filename,
            "sourceFormat": source_format,
            "uploadDate": datetime.utcnow(),
            "status": "Indexed",
            "ocrConfidence": extraction.get("confidence", 1.0)
        }
        await db.documents.insert_one(document_entry)
        
        # 4. Chunk Text
        metadata = {
            "subjectId": subjectId,
            "documentId": doc_id,
            "fileName": filename,
            "sourceFormat": source_format
        }
        chunks = chunk_text(extraction["text"], metadata)
        
        # 5. Embed Chunks (Async batching)
        embedded_chunks = await embed_chunks(chunks)
        
        # 6. Store in MongoDB
        # Remove embedding vector before storing string content in Mongo to save space
        mongo_chunks = []
        for c in embedded_chunks:
            mc = c.copy()
            del mc["embedding"]
            mongo_chunks.append(mc)
        
        if mongo_chunks:
            await db.chunks.insert_one(mongo_chunks[0]) # Simplified for one-shot, or use insert_many
            if len(mongo_chunks) > 1:
                await db.chunks.insert_many(mongo_chunks[1:])
        
        # 7. Store in ChromaDB
        collection = get_collection(subjectId)
        collection.add(
            ids=[c["chunkId"] for c in embedded_chunks],
            embeddings=[c["embedding"] for c in embedded_chunks],
            documents=[c["text"] for c in embedded_chunks],
            metadatas=[{
                "documentId": doc_id,
                "fileName": filename,
                "sourceFormat": source_format,
                "locationRef": c["locationRef"],
                "chunkId": c["chunkId"]
            } for c in embedded_chunks]
        )
        
        return {
            "message": "Upload successful",
            "documentId": doc_id,
            "chunkCount": len(embedded_chunks)
        }
        
    except Exception as e:
        # In a real app, you'd clean up partial records here
        raise HTTPException(status_code=500, detail=str(e))
