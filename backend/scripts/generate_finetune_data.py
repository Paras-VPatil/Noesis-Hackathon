import asyncio
import json
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings
from app.services.rag_service import build_sources_block

# This script generates a JSONL file required to fine-tune Gemini on Vertex AI.
# It pulls verified Q&A interactions from your MongoDB `qa_logs` collection.

async def generate_finetune_data():
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.DATABASE_NAME]
    
    # We only want to train on High-quality, human-verified logs
    # or logs where the system correctly identified "NOT FOUND".
    pipeline = [
        {"$match": {
            "$or": [
                {"humanVerified": True, "rating": {"$gte": 4}},
                {"confidenceTier": "NOT_FOUND"} # Crucial for teaching the model when NOT to hallucinate
            ]
        }},
        {"$limit": 500} # We recommend 100-500 high-quality examples
    ]
    
    logs = await db.qa_logs.aggregate(pipeline).to_list(length=1000)
    
    if not logs:
        print("Not enough verified QA logs found in DB to generate training data.")
        print("Please use the app and verify answers first, or manually create synthetic data.")
        return

    dataset = []
    
    for log in logs:
        # Fetch the exact chunks that were presented to the LLM during this query
        chunks_cursor = db.chunks.find({"chunkId": {"$in": log.get("topChunkIds", [])}})
        chunks = await chunks_cursor.to_list(length=10)
        
        # Reconstruct the exact source block the model saw
        sources_block = build_sources_block(chunks)
        
        input_text = (
            f"SOURCES:\n{sources_block}\n\n"
            f"---\nStudent's Question: {log['query']}"
        )
        
        output_text = log.get('verifiedAnswer', log.get('answer'))
        
        dataset.append({
            "messages": [
                {"role": "system", "content": "You are AskMyNotes — a strict, source-only study assistant."},
                {"role": "user", "content": input_text},
                {"role": "model", "content": output_text}
            ]
        })

    # Write the JSONL file for Vertex AI / Gemini API Fine-tuning
    with open("askmynotes_finetune.jsonl", "w", encoding="utf-8") as f:
        for entry in dataset:
            f.write(json.dumps(entry) + "\n")
            
    print(f"✅ Generated 'askmynotes_finetune.jsonl' with {len(dataset)} examples.")
    print("Next step: Upload this file to Google Cloud Storage or use the Gemini API to start the tuning job.")

if __name__ == "__main__":
    asyncio.run(generate_finetune_data())
