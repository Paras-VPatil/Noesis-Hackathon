from datetime import datetime
from typing import List

from fastapi import APIRouter, HTTPException

from app.core.database import get_db
from app.schemas.subject_schema import SubjectCreate, SubjectResponse

router = APIRouter()
MOCK_USER_ID = "user_123"  # Temporary mock for hackathon testing

ALLOWED_SUBJECTS = [
    {"id": "maths", "name": "Maths"},
    {"id": "chemistry", "name": "Chemistry"},
    {"id": "physics", "name": "Physics"},
]


def _normalize(name: str) -> str:
    return name.strip().lower()


async def _ensure_fixed_subjects(db):
    for subject in ALLOWED_SUBJECTS:
        existing = await db.subjects.find_one({"id": subject["id"], "userId": MOCK_USER_ID})
        if existing:
            continue
        await db.subjects.insert_one(
            {
                "id": subject["id"],
                "name": subject["name"],
                "userId": MOCK_USER_ID,
                "createdAt": datetime.utcnow(),
            }
        )


@router.post("/", response_model=SubjectResponse)
async def create_subject(subject_in: SubjectCreate):
    """
    Fixed-subject mode:
    - only Maths/Chemistry/Physics are valid
    - returns existing subject record if already present
    - rejects any non-fixed subject name
    """
    db = get_db()
    await _ensure_fixed_subjects(db)

    normalized = _normalize(subject_in.name)
    match = next((item for item in ALLOWED_SUBJECTS if _normalize(item["name"]) == normalized), None)
    if not match:
        raise HTTPException(
            status_code=400,
            detail="Only fixed subjects are allowed: Maths, Chemistry, Physics.",
        )

    subject = await db.subjects.find_one({"id": match["id"], "userId": MOCK_USER_ID})
    if not subject:
        subject = {
            "id": match["id"],
            "name": match["name"],
            "userId": MOCK_USER_ID,
            "createdAt": datetime.utcnow(),
        }
        await db.subjects.insert_one(subject)

    return SubjectResponse(**subject)


@router.get("/", response_model=List[SubjectResponse])
async def list_subjects():
    db = get_db()
    await _ensure_fixed_subjects(db)

    ids = [item["id"] for item in ALLOWED_SUBJECTS]
    cursor = db.subjects.find({"userId": MOCK_USER_ID, "id": {"$in": ids}})
    found = await cursor.to_list(length=10)
    by_id = {item["id"]: item for item in found}

    ordered = [by_id[item["id"]] for item in ALLOWED_SUBJECTS if item["id"] in by_id]
    return [SubjectResponse(**subject) for subject in ordered]


@router.get("/{subject_id}", response_model=SubjectResponse)
async def get_subject(subject_id: str):
    db = get_db()
    await _ensure_fixed_subjects(db)

    if subject_id not in {item["id"] for item in ALLOWED_SUBJECTS}:
        raise HTTPException(
            status_code=404,
            detail="Subject not found. Allowed subjects: Maths, Chemistry, Physics.",
        )

    subject = await db.subjects.find_one({"id": subject_id, "userId": MOCK_USER_ID})
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    return SubjectResponse(**subject)
