from app.core.database import db

async def generate_heatmap(subject_id: str) -> list[dict]:
    """
    Calculate the coverage heatmap by joining qa_logs (which store retrieved chunkIds)
    with the chunks collection.
    """
    
    pipeline = [
        # Match questions asked in this subject
        {"$match": {"subjectId": subject_id, "confidenceTier": {"$ne": "NOT_FOUND"}}},
        
        # Unwind the topChunkIds array so we can count individual chunk hits
        {"$unwind": "$topChunkIds"},
        
        # Group by chunk id and count occurrences
        {"$group": {
            "_id": "$topChunkIds",
            "frequency": {"$sum": 1}
        }},
        
        # Lookup original chunk details (filename, format, location)
        {"$lookup": {
            "from": "chunks",
            "localField": "_id",
            "foreignField": "chunkId",
            "as": "chunk_details"
        }},
        
        # Unwind chunk details array produced by lookup
        {"$unwind": "$chunk_details"},
        
        # Format the output
        {"$project": {
            "_id": 0,
            "chunkId": "$_id",
            "frequency": 1,
            "fileName": "$chunk_details.fileName",
            "sourceFormat": "$chunk_details.sourceFormat",
            "locationRef": "$chunk_details.locationRef",
            "textPreview": {"$substrCP": ["$chunk_details.text", 0, 100]}
        }},
        
        # Sort by frequency descending
        {"$sort": {"frequency": -1}}
    ]
    
    heatmap_data = await db.qa_logs.aggregate(pipeline).to_list(length=1000)
    
    # Calculate coverage tiers based on frequencies
    if heatmap_data:
        max_freq = max(h["frequency"] for h in heatmap_data)
        for h in heatmap_data:
            # Normalize 0 to 1
            h["coverageScore"] = h["frequency"] / max_freq
            if h["coverageScore"] > 0.66:
                h["coverageTier"] = "HOT"
            elif h["coverageScore"] > 0.33:
                h["coverageTier"] = "WARM"
            else:
                h["coverageTier"] = "COOL"
                
    # Note: Chunks with 0 frequency won't appear here (COLD chunks). 
    # To get those, you would query db.chunks and subtract this list.
    
    return heatmap_data
