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

# Define Models for Material Inspection
class PhotoData(BaseModel):
    id: str
    base64: str
    timestamp: str
    width: Optional[int] = None
    height: Optional[int] = None

class MaterialInspection(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    invoiceNumber: str
    materialType: str
    quantityReceived: Optional[str] = None
    receiveDate: str
    qualityInspector: str
    safetyInspector: Optional[str] = None
    logisticsInspector: Optional[str] = None
    nonConforming: bool = False
    nonConformanceType: Optional[str] = None
    nonConformingQuantity: Optional[str] = None
    notes: Optional[str] = None
    photos: List[PhotoData] = []
    inspectionDate: datetime = Field(default_factory=datetime.utcnow)
    lastModified: datetime = Field(default_factory=datetime.utcnow)

class MaterialInspectionCreate(BaseModel):
    invoiceNumber: str
    materialType: str
    quantityReceived: Optional[str] = None
    receiveDate: str
    qualityInspector: str
    safetyInspector: Optional[str] = None
    logisticsInspector: Optional[str] = None
    nonConforming: bool = False
    nonConformanceType: Optional[str] = None
    nonConformingQuantity: Optional[str] = None
    notes: Optional[str] = None
    photos: List[PhotoData] = []

class MaterialInspectionUpdate(BaseModel):
    invoiceNumber: Optional[str] = None
    materialType: Optional[str] = None
    quantityReceived: Optional[str] = None
    receiveDate: Optional[str] = None
    qualityInspector: Optional[str] = None
    safetyInspector: Optional[str] = None
    logisticsInspector: Optional[str] = None
    nonConforming: Optional[bool] = None
    nonConformanceType: Optional[str] = None
    nonConformingQuantity: Optional[str] = None
    notes: Optional[str] = None
    photos: Optional[List[PhotoData]] = None

class SyncData(BaseModel):
    materials: List[MaterialInspection]
    lastSyncTimestamp: str

# Material Inspection Routes
@api_router.post("/material-inspections", response_model=MaterialInspection)
async def create_material_inspection(material: MaterialInspectionCreate):
    """Create a new material inspection"""
    try:
        material_dict = material.dict()
        material_obj = MaterialInspection(**material_dict)
        
        result = await db.material_inspections.insert_one(material_obj.dict())
        
        if result.inserted_id:
            return material_obj
        else:
            raise HTTPException(status_code=500, detail="Failed to create material inspection")
    except Exception as e:
        logging.error(f"Error creating material inspection: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/material-inspections", response_model=List[MaterialInspection])
async def get_material_inspections(skip: int = 0, limit: int = 100):
    """Get all material inspections with pagination"""
    try:
        cursor = db.material_inspections.find().skip(skip).limit(limit).sort("inspectionDate", -1)
        materials = await cursor.to_list(length=limit)
        return [MaterialInspection(**material) for material in materials]
    except Exception as e:
        logging.error(f"Error getting material inspections: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/material-inspections/{material_id}", response_model=MaterialInspection)
async def get_material_inspection(material_id: str):
    """Get a specific material inspection by ID"""
    try:
        material = await db.material_inspections.find_one({"id": material_id})
        if not material:
            raise HTTPException(status_code=404, detail="Material inspection not found")
        return MaterialInspection(**material)
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error getting material inspection {material_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.put("/material-inspections/{material_id}", response_model=MaterialInspection)
async def update_material_inspection(material_id: str, material_update: MaterialInspectionUpdate):
    """Update a material inspection"""
    try:
        # First check if material exists
        existing_material = await db.material_inspections.find_one({"id": material_id})
        if not existing_material:
            raise HTTPException(status_code=404, detail="Material inspection not found")
        
        # Update only provided fields
        update_data = {k: v for k, v in material_update.dict().items() if v is not None}
        update_data["lastModified"] = datetime.utcnow()
        
        result = await db.material_inspections.update_one(
            {"id": material_id},
            {"$set": update_data}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Material inspection not found")
        
        # Return updated material
        updated_material = await db.material_inspections.find_one({"id": material_id})
        return MaterialInspection(**updated_material)
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error updating material inspection {material_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/material-inspections/{material_id}")
async def delete_material_inspection(material_id: str):
    """Delete a material inspection"""
    try:
        result = await db.material_inspections.delete_one({"id": material_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Material inspection not found")
        return {"message": "Material inspection deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error deleting material inspection {material_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/material-inspections/bulk-sync")
async def bulk_sync_material_inspections(sync_data: SyncData):
    """Bulk sync material inspections from mobile app"""
    try:
        operations = []
        
        for material in sync_data.materials:
            # Check if material exists
            existing = await db.material_inspections.find_one({"id": material.id})
            
            if existing:
                # Update existing
                operations.append({
                    "update_one": {
                        "filter": {"id": material.id},
                        "update": {"$set": material.dict()},
                        "upsert": False
                    }
                })
            else:
                # Insert new
                operations.append({
                    "insert_one": {
                        "document": material.dict()
                    }
                })
        
        if operations:
            # Execute bulk operations
            for op in operations:
                if "insert_one" in op:
                    await db.material_inspections.insert_one(op["insert_one"]["document"])
                elif "update_one" in op:
                    await db.material_inspections.update_one(
                        op["update_one"]["filter"],
                        op["update_one"]["update"]
                    )
        
        return {
            "message": f"Successfully synced {len(sync_data.materials)} material inspections",
            "synced_count": len(sync_data.materials),
            "sync_timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logging.error(f"Error in bulk sync: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/material-inspections/stats/dashboard")
async def get_dashboard_stats():
    """Get dashboard statistics"""
    try:
        # Total inspections
        total_count = await db.material_inspections.count_documents({})
        
        # Compliant vs Non-compliant
        compliant_count = await db.material_inspections.count_documents({"nonConforming": False})
        non_compliant_count = await db.material_inspections.count_documents({"nonConforming": True})
        
        # Recent inspections (last 7 days)
        seven_days_ago = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        seven_days_ago = seven_days_ago.replace(day=seven_days_ago.day - 7)
        recent_count = await db.material_inspections.count_documents({
            "inspectionDate": {"$gte": seven_days_ago}
        })
        
        # Most common non-conformance types
        pipeline = [
            {"$match": {"nonConforming": True, "nonConformanceType": {"$ne": None}}},
            {"$group": {"_id": "$nonConformanceType", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 5}
        ]
        non_conformance_stats = await db.material_inspections.aggregate(pipeline).to_list(5)
        
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

# Backward compatibility - redirect cargo endpoints to material endpoints
@api_router.post("/cargo-inspections", response_model=MaterialInspection)
async def create_cargo_inspection_compat(material: MaterialInspectionCreate):
    return await create_material_inspection(material)

@api_router.get("/cargo-inspections", response_model=List[MaterialInspection])
async def get_cargo_inspections_compat(skip: int = 0, limit: int = 100):
    return await get_material_inspections(skip, limit)

@api_router.get("/cargo-inspections/{material_id}", response_model=MaterialInspection)
async def get_cargo_inspection_compat(material_id: str):
    return await get_material_inspection(material_id)

@api_router.put("/cargo-inspections/{material_id}", response_model=MaterialInspection)
async def update_cargo_inspection_compat(material_id: str, material_update: MaterialInspectionUpdate):
    return await update_material_inspection(material_id, material_update)

@api_router.delete("/cargo-inspections/{material_id}")
async def delete_cargo_inspection_compat(material_id: str):
    return await delete_material_inspection(material_id)

@api_router.get("/cargo-inspections/stats/dashboard")
async def get_cargo_dashboard_stats_compat():
    return await get_dashboard_stats()

# Health check
@api_router.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "material-receiving-control-api"
    }

# Root endpoint
@api_router.get("/")
async def root():
    return {"message": "Material Receiving Control API", "version": "1.0.0"}

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