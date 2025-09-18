from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Define Models for Cargo Inspection
class PhotoData(BaseModel):
    id: str
    base64: str
    timestamp: str
    width: Optional[int] = None
    height: Optional[int] = None

class CargoInspection(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    invoiceNumber: str
    materialType: str
    quantityReceived: str
    nonConforming: bool = False
    nonConformanceType: Optional[str] = None
    nonConformingQuantity: Optional[str] = None
    notes: Optional[str] = None
    photos: List[PhotoData] = []
    inspectionDate: datetime = Field(default_factory=datetime.utcnow)
    lastModified: datetime = Field(default_factory=datetime.utcnow)

class CargoInspectionCreate(BaseModel):
    invoiceNumber: str
    materialType: str
    quantityReceived: str
    nonConforming: bool = False
    nonConformanceType: Optional[str] = None
    nonConformingQuantity: Optional[str] = None
    notes: Optional[str] = None
    photos: List[PhotoData] = []

class CargoInspectionUpdate(BaseModel):
    invoiceNumber: Optional[str] = None
    materialType: Optional[str] = None
    quantityReceived: Optional[str] = None
    nonConforming: Optional[bool] = None
    nonConformanceType: Optional[str] = None
    nonConformingQuantity: Optional[str] = None
    notes: Optional[str] = None
    photos: Optional[List[PhotoData]] = None

class SyncData(BaseModel):
    cargos: List[CargoInspection]
    lastSyncTimestamp: str

# Cargo Inspection Routes
@api_router.post("/cargo-inspections", response_model=CargoInspection)
async def create_cargo_inspection(cargo: CargoInspectionCreate):
    """Create a new cargo inspection"""
    try:
        cargo_dict = cargo.dict()
        cargo_obj = CargoInspection(**cargo_dict)
        
        result = await db.cargo_inspections.insert_one(cargo_obj.dict())
        
        if result.inserted_id:
            return cargo_obj
        else:
            raise HTTPException(status_code=500, detail="Failed to create cargo inspection")
    except Exception as e:
        logging.error(f"Error creating cargo inspection: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/cargo-inspections", response_model=List[CargoInspection])
async def get_cargo_inspections(skip: int = 0, limit: int = 100):
    """Get all cargo inspections with pagination"""
    try:
        cursor = db.cargo_inspections.find().skip(skip).limit(limit).sort("inspectionDate", -1)
        cargos = await cursor.to_list(length=limit)
        return [CargoInspection(**cargo) for cargo in cargos]
    except Exception as e:
        logging.error(f"Error getting cargo inspections: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/cargo-inspections/{cargo_id}", response_model=CargoInspection)
async def get_cargo_inspection(cargo_id: str):
    """Get a specific cargo inspection by ID"""
    try:
        cargo = await db.cargo_inspections.find_one({"id": cargo_id})
        if not cargo:
            raise HTTPException(status_code=404, detail="Cargo inspection not found")
        return CargoInspection(**cargo)
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error getting cargo inspection {cargo_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.put("/cargo-inspections/{cargo_id}", response_model=CargoInspection)
async def update_cargo_inspection(cargo_id: str, cargo_update: CargoInspectionUpdate):
    """Update a cargo inspection"""
    try:
        # First check if cargo exists
        existing_cargo = await db.cargo_inspections.find_one({"id": cargo_id})
        if not existing_cargo:
            raise HTTPException(status_code=404, detail="Cargo inspection not found")
        
        # Update only provided fields
        update_data = {k: v for k, v in cargo_update.dict().items() if v is not None}
        update_data["lastModified"] = datetime.utcnow()
        
        result = await db.cargo_inspections.update_one(
            {"id": cargo_id},
            {"$set": update_data}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Cargo inspection not found")
        
        # Return updated cargo
        updated_cargo = await db.cargo_inspections.find_one({"id": cargo_id})
        return CargoInspection(**updated_cargo)
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error updating cargo inspection {cargo_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/cargo-inspections/{cargo_id}")
async def delete_cargo_inspection(cargo_id: str):
    """Delete a cargo inspection"""
    try:
        result = await db.cargo_inspections.delete_one({"id": cargo_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Cargo inspection not found")
        return {"message": "Cargo inspection deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error deleting cargo inspection {cargo_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/cargo-inspections/bulk-sync")
async def bulk_sync_cargo_inspections(sync_data: SyncData):
    """Bulk sync cargo inspections from mobile app"""
    try:
        operations = []
        
        for cargo in sync_data.cargos:
            # Check if cargo exists
            existing = await db.cargo_inspections.find_one({"id": cargo.id})
            
            if existing:
                # Update existing
                operations.append({
                    "update_one": {
                        "filter": {"id": cargo.id},
                        "update": {"$set": cargo.dict()},
                        "upsert": False
                    }
                })
            else:
                # Insert new
                operations.append({
                    "insert_one": {
                        "document": cargo.dict()
                    }
                })
        
        if operations:
            # Execute bulk operations
            for op in operations:
                if "insert_one" in op:
                    await db.cargo_inspections.insert_one(op["insert_one"]["document"])
                elif "update_one" in op:
                    await db.cargo_inspections.update_one(
                        op["update_one"]["filter"],
                        op["update_one"]["update"]
                    )
        
        return {
            "message": f"Successfully synced {len(sync_data.cargos)} cargo inspections",
            "synced_count": len(sync_data.cargos),
            "sync_timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logging.error(f"Error in bulk sync: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/cargo-inspections/stats/dashboard")
async def get_dashboard_stats():
    """Get dashboard statistics"""
    try:
        # Total inspections
        total_count = await db.cargo_inspections.count_documents({})
        
        # Compliant vs Non-compliant
        compliant_count = await db.cargo_inspections.count_documents({"nonConforming": False})
        non_compliant_count = await db.cargo_inspections.count_documents({"nonConforming": True})
        
        # Recent inspections (last 7 days)
        seven_days_ago = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        seven_days_ago = seven_days_ago.replace(day=seven_days_ago.day - 7)
        recent_count = await db.cargo_inspections.count_documents({
            "inspectionDate": {"$gte": seven_days_ago}
        })
        
        # Most common non-conformance types
        pipeline = [
            {"$match": {"nonConforming": True, "nonConformanceType": {"$ne": None}}},
            {"$group": {"_id": "$nonConformanceType", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 5}
        ]
        non_conformance_stats = await db.cargo_inspections.aggregate(pipeline).to_list(5)
        
        return {
            "totalInspections": total_count,
            "compliantCount": compliant_count,
            "nonCompliantCount": non_compliant_count,
            "recentCount": recent_count,
            "complianceRate": (compliant_count / total_count * 100) if total_count > 0 else 0,
            "nonConformanceTypes": non_conformance_stats
        }
    except Exception as e:
        logging.error(f"Error getting dashboard stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Health check
@api_router.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "logistics-inspection-api"
    }

# Original routes for backward compatibility
@api_router.get("/")
async def root():
    return {"message": "Logistics Inspection API", "version": "1.0.0"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()