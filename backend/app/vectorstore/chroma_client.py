import chromadb
from chromadb.config import Settings
from app.core.config import settings
import os

# Initialize the ChromaDB client with persistent storage
os.makedirs(settings.CHROMA_PERSIST_DIRECTORY, exist_ok=True)

chroma_client = chromadb.PersistentClient(
    path=settings.CHROMA_PERSIST_DIRECTORY,
    settings=Settings(anonymized_telemetry=False)
)

def get_collection(subject_id: str):
    """
    Get or create a ChromaDB collection for a specific subject.
    Every subject gets its own namespace to strictly prevent cross-subject data bleed.
    """
    collection_name = f"subject_{subject_id}"
    return chroma_client.get_or_create_collection(
        name=collection_name,
        metadata={"hnsw:space": "cosine"} # Use cosine similarity for embeddings
    )

def delete_collection(subject_id: str):
    """
    Delete a subject's collection.
    """
    collection_name = f"subject_{subject_id}"
    try:
        chroma_client.delete_collection(name=collection_name)
        return True
    except ValueError:
        return False
