from __future__ import annotations

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo import ASCENDING, IndexModel

from app.core.config import settings


class MongoProxy:
    """Proxy object so `from app.core.database import db` stays valid after connect."""

    def __init__(self) -> None:
        self._database: AsyncIOMotorDatabase | None = None

    def set_database(self, database: AsyncIOMotorDatabase) -> None:
        self._database = database

    def clear(self) -> None:
        self._database = None

    def _get_database(self) -> AsyncIOMotorDatabase:
        if self._database is None:
            raise RuntimeError("MongoDB is not connected. Call connect_to_mongo() first.")
        return self._database

    def __getattr__(self, item: str):
        return getattr(self._get_database(), item)

    def __getitem__(self, item: str):
        return self._get_database()[item]


mongo_client: AsyncIOMotorClient | None = None
db = MongoProxy()


async def _create_indexes(database: AsyncIOMotorDatabase) -> None:
    await database["chunks"].create_indexes(
        [
            IndexModel([("chunkId", ASCENDING)], name="ux_chunks_chunkId", unique=True),
            IndexModel([("subjectId", ASCENDING)], name="ix_chunks_subjectId"),
            IndexModel([("documentId", ASCENDING)], name="ix_chunks_documentId"),
        ]
    )

    await database["qa_logs"].create_indexes(
        [
            IndexModel([("subjectId", ASCENDING)], name="ix_qalogs_subjectId"),
            IndexModel(
                [("subjectId", ASCENDING), ("confidenceTier", ASCENDING)],
                name="ix_qalogs_subject_confidence",
            ),
        ]
    )


async def connect_to_mongo() -> AsyncIOMotorDatabase:
    global mongo_client

    if mongo_client is None:
        mongo_client = AsyncIOMotorClient(
            settings.MONGODB_URL,
            serverSelectionTimeoutMS=5000,
            uuidRepresentation="standard",
        )
        await mongo_client.admin.command("ping")
        database = mongo_client[settings.DATABASE_NAME]
        db.set_database(database)
        await _create_indexes(database)

    return db._get_database()


async def close_mongo_connection() -> None:
    global mongo_client

    if mongo_client is not None:
        mongo_client.close()
        mongo_client = None

    db.clear()


def get_database() -> AsyncIOMotorDatabase:
    return db._get_database()


def get_db() -> AsyncIOMotorDatabase:
    """Compatibility helper used by route/service modules."""
    return get_database()
