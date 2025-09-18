#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for Material Receiving Control App
Tests all CRUD operations, validation, new field structure, and backward compatibility
"""

import requests
import json
import base64
from datetime import datetime
import uuid
import time

# Backend URL from environment
BACKEND_URL = "https://receipt-monitor.preview.emergentagent.com/api"

class MaterialReceivingAPITester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.session = requests.Session()
        self.test_material_ids = []
        self.test_results = {
            "passed": 0,
            "failed": 0,
            "errors": []
        }
    
    def log_result(self, test_name, success, message=""):
        """Log test results"""
        if success:
            self.test_results["passed"] += 1
            print(f"✅ {test_name}: PASSED {message}")
        else:
            self.test_results["failed"] += 1
            self.test_results["errors"].append(f"{test_name}: {message}")
            print(f"❌ {test_name}: FAILED - {message}")
    
    def create_sample_photo_data(self):
        """Create sample base64 photo data"""
        # Simple 1x1 pixel PNG in base64
        sample_base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        return {
            "id": str(uuid.uuid4()),
            "base64": sample_base64,
            "timestamp": datetime.utcnow().isoformat(),
            "width": 1920,
            "height": 1080
        }
    
    def create_test_material_data(self, test_case="standard"):
        """Create test material inspection data based on test case"""
        base_data = {
            "invoiceNumber": "MAT-2025-001",
            "materialType": "Steel Beams",
            "receiveDate": "18/01/2025",
            "qualityInspector": "John Smith",
            "nonConforming": True,
            "nonConformanceType": "Physical Damage",
            "nonConformingQuantity": "5",
            "notes": "Minor scratches on 5 beams",
            "photos": [self.create_sample_photo_data()]
        }
        
        if test_case == "optional_quantity":
            # Test with quantityReceived as null/empty (should work)
            base_data["quantityReceived"] = None
        elif test_case == "with_all_inspectors":
            # Test with all inspector fields
            base_data.update({
                "quantityReceived": "100",
                "safetyInspector": "Jane Doe",
                "logisticsInspector": "Bob Wilson"
            })
        elif test_case == "empty_optional_inspector":
            # Test with empty optional inspector
            base_data.update({
                "quantityReceived": "50",
                "safetyInspector": "Jane Doe",
                "logisticsInspector": ""
            })
        elif test_case == "only_quality_inspector":
            # Test with only mandatory qualityInspector
            base_data["quantityReceived"] = "75"
        elif test_case == "missing_quality_inspector":
            # Test validation - should fail without qualityInspector
            del base_data["qualityInspector"]
        
        return base_data
    
    def test_health_check(self):
        """Test health check endpoint"""
        try:
            response = self.session.get(f"{self.base_url}/health")
            if response.status_code == 200:
                data = response.json()
                if "status" in data and data["status"] == "healthy":
                    self.log_result("Health Check", True, f"Status: {data['status']}")
                else:
                    self.log_result("Health Check", False, f"Invalid response: {data}")
            else:
                self.log_result("Health Check", False, f"Status code: {response.status_code}")
        except Exception as e:
            self.log_result("Health Check", False, f"Exception: {str(e)}")
    
    def test_root_endpoint(self):
        """Test root API endpoint"""
        try:
            response = self.session.get(f"{self.base_url}/")
            if response.status_code == 200:
                data = response.json()
                if "message" in data:
                    self.log_result("Root Endpoint", True, f"Message: {data['message']}")
                else:
                    self.log_result("Root Endpoint", False, f"Invalid response: {data}")
            else:
                self.log_result("Root Endpoint", False, f"Status code: {response.status_code}")
        except Exception as e:
            self.log_result("Root Endpoint", False, f"Exception: {str(e)}")
    
    def test_create_material_inspection_new_fields(self):
        """Test creating material inspections with new field structure"""
        
        # Test 1: Create material without quantityReceived (should work)
        try:
            material_data = self.create_test_material_data("optional_quantity")
            response = self.session.post(
                f"{self.base_url}/material-inspections",
                json=material_data,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                if "id" in data and "qualityInspector" in data:
                    self.test_material_ids.append(data["id"])
                    self.log_result("Create Material (Optional Quantity)", True, f"ID: {data['id']}")
                else:
                    self.log_result("Create Material (Optional Quantity)", False, f"Missing required fields: {data}")
            else:
                self.log_result("Create Material (Optional Quantity)", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_result("Create Material (Optional Quantity)", False, f"Exception: {str(e)}")
        
        # Test 2: Create material with all inspector fields
        try:
            material_data = self.create_test_material_data("with_all_inspectors")
            response = self.session.post(
                f"{self.base_url}/material-inspections",
                json=material_data,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                if ("qualityInspector" in data and "safetyInspector" in data and 
                    "logisticsInspector" in data):
                    self.test_material_ids.append(data["id"])
                    self.log_result("Create Material (All Inspectors)", True, f"ID: {data['id']}")
                else:
                    self.log_result("Create Material (All Inspectors)", False, f"Inspector fields missing: {data}")
            else:
                self.log_result("Create Material (All Inspectors)", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_result("Create Material (All Inspectors)", False, f"Exception: {str(e)}")
        
        # Test 3: Create material with only qualityInspector (should work)
        try:
            material_data = self.create_test_material_data("only_quality_inspector")
            response = self.session.post(
                f"{self.base_url}/material-inspections",
                json=material_data,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                if "qualityInspector" in data and data["qualityInspector"] == "John Smith":
                    self.test_material_ids.append(data["id"])
                    self.log_result("Create Material (Quality Inspector Only)", True, f"ID: {data['id']}")
                else:
                    self.log_result("Create Material (Quality Inspector Only)", False, f"Quality inspector not set: {data}")
            else:
                self.log_result("Create Material (Quality Inspector Only)", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_result("Create Material (Quality Inspector Only)", False, f"Exception: {str(e)}")
        
        # Test 4: Test validation - missing qualityInspector (should fail)
        try:
            material_data = self.create_test_material_data("missing_quality_inspector")
            response = self.session.post(
                f"{self.base_url}/material-inspections",
                json=material_data,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code in [400, 422]:  # Should fail validation
                self.log_result("Create Material (Missing Quality Inspector)", True, "Properly rejected missing qualityInspector")
            else:
                self.log_result("Create Material (Missing Quality Inspector)", False, f"Should have failed validation, got: {response.status_code}")
        except Exception as e:
            self.log_result("Create Material (Missing Quality Inspector)", False, f"Exception: {str(e)}")
        
        # Test 5: Test with empty optional inspector
        try:
            material_data = self.create_test_material_data("empty_optional_inspector")
            response = self.session.post(
                f"{self.base_url}/material-inspections",
                json=material_data,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                if "qualityInspector" in data and "safetyInspector" in data:
                    self.test_material_ids.append(data["id"])
                    self.log_result("Create Material (Empty Optional Inspector)", True, f"ID: {data['id']}")
                else:
                    self.log_result("Create Material (Empty Optional Inspector)", False, f"Inspector fields issue: {data}")
            else:
                self.log_result("Create Material (Empty Optional Inspector)", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_result("Create Material (Empty Optional Inspector)", False, f"Exception: {str(e)}")
    
    def test_get_material_inspections(self):
        """Test getting all material inspections with pagination"""
        try:
            # Test basic get all
            response = self.session.get(f"{self.base_url}/material-inspections")
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_result("Get All Materials", True, f"Retrieved {len(data)} inspections")
                else:
                    self.log_result("Get All Materials", False, f"Expected list, got: {type(data)}")
            else:
                self.log_result("Get All Materials", False, f"Status: {response.status_code}")
            
            # Test pagination
            response = self.session.get(f"{self.base_url}/material-inspections?skip=0&limit=1")
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list) and len(data) <= 1:
                    self.log_result("Get Materials (Pagination)", True, f"Pagination working, got {len(data)} items")
                else:
                    self.log_result("Get Materials (Pagination)", False, f"Pagination failed: {len(data)} items")
            else:
                self.log_result("Get Materials (Pagination)", False, f"Status: {response.status_code}")
                
        except Exception as e:
            self.log_result("Get All Materials", False, f"Exception: {str(e)}")
    
    def test_get_specific_material(self):
        """Test getting specific material inspection by ID"""
        if not self.test_material_ids:
            self.log_result("Get Specific Material", False, "No test material IDs available")
            return
        
        try:
            material_id = self.test_material_ids[0]
            response = self.session.get(f"{self.base_url}/material-inspections/{material_id}")
            
            if response.status_code == 200:
                data = response.json()
                if data.get("id") == material_id:
                    self.log_result("Get Specific Material", True, f"Retrieved material {material_id}")
                else:
                    self.log_result("Get Specific Material", False, f"ID mismatch: expected {material_id}, got {data.get('id')}")
            else:
                self.log_result("Get Specific Material", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("Get Specific Material", False, f"Exception: {str(e)}")
        
        # Test non-existent material
        try:
            fake_id = str(uuid.uuid4())
            response = self.session.get(f"{self.base_url}/material-inspections/{fake_id}")
            if response.status_code == 404:
                self.log_result("Get Non-existent Material", True, "Properly returned 404")
            else:
                self.log_result("Get Non-existent Material", False, f"Expected 404, got: {response.status_code}")
        except Exception as e:
            self.log_result("Get Non-existent Material", False, f"Exception: {str(e)}")
    
    def test_update_material_inspection(self):
        """Test updating material inspection with new fields"""
        if not self.test_material_ids:
            self.log_result("Update Material", False, "No test material IDs available")
            return
        
        try:
            material_id = self.test_material_ids[0]
            update_data = {
                "notes": "Updated notes - test modification",
                "safetyInspector": "Updated Safety Inspector",
                "logisticsInspector": "Updated Logistics Inspector",
                "quantityReceived": "200"
            }
            
            response = self.session.put(
                f"{self.base_url}/material-inspections/{material_id}",
                json=update_data,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                if (data.get("notes") == update_data["notes"] and 
                    data.get("safetyInspector") == update_data["safetyInspector"]):
                    self.log_result("Update Material", True, f"Successfully updated material {material_id}")
                else:
                    self.log_result("Update Material", False, f"Update not reflected: {data}")
            else:
                self.log_result("Update Material", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_result("Update Material", False, f"Exception: {str(e)}")
    
    def test_dashboard_stats(self):
        """Test dashboard statistics endpoint"""
        try:
            response = self.session.get(f"{self.base_url}/material-inspections/stats/dashboard")
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["totalInspections", "compliantCount", "nonCompliantCount", "complianceRate"]
                
                if all(field in data for field in required_fields):
                    self.log_result("Dashboard Stats", True, f"Total: {data['totalInspections']}, Compliance: {data['complianceRate']:.1f}%")
                else:
                    missing = [f for f in required_fields if f not in data]
                    self.log_result("Dashboard Stats", False, f"Missing fields: {missing}")
            else:
                self.log_result("Dashboard Stats", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("Dashboard Stats", False, f"Exception: {str(e)}")
    
    def test_bulk_sync_materials(self):
        """Test bulk sync functionality for materials"""
        try:
            # Create multiple material inspections for bulk sync
            bulk_materials = []
            for i in range(3):
                material_data = self.create_test_material_data("with_all_inspectors")
                material_data["id"] = str(uuid.uuid4())
                material_data["invoiceNumber"] = f"MAT-BULK-{i+1}"
                material_data["inspectionDate"] = datetime.utcnow().isoformat()
                material_data["lastModified"] = datetime.utcnow().isoformat()
                bulk_materials.append(material_data)
            
            sync_data = {
                "materials": bulk_materials,
                "lastSyncTimestamp": datetime.utcnow().isoformat()
            }
            
            response = self.session.post(
                f"{self.base_url}/material-inspections/bulk-sync",
                json=sync_data,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("synced_count") == 3:
                    # Store IDs for cleanup
                    self.test_material_ids.extend([material["id"] for material in bulk_materials])
                    self.log_result("Bulk Sync Materials", True, f"Synced {data['synced_count']} inspections")
                else:
                    self.log_result("Bulk Sync Materials", False, f"Expected 3 synced, got: {data.get('synced_count')}")
            else:
                self.log_result("Bulk Sync Materials", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_result("Bulk Sync Materials", False, f"Exception: {str(e)}")
    
    def test_backward_compatibility(self):
        """Test backward compatibility with cargo-inspection endpoints"""
        
        # Test 1: Create via cargo endpoint (should work)
        try:
            material_data = self.create_test_material_data("with_all_inspectors")
            response = self.session.post(
                f"{self.base_url}/cargo-inspections",
                json=material_data,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                if "id" in data and "qualityInspector" in data:
                    self.test_material_ids.append(data["id"])
                    self.log_result("Backward Compatibility (Create)", True, f"Cargo endpoint works, ID: {data['id']}")
                else:
                    self.log_result("Backward Compatibility (Create)", False, f"Missing fields: {data}")
            else:
                self.log_result("Backward Compatibility (Create)", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_result("Backward Compatibility (Create)", False, f"Exception: {str(e)}")
        
        # Test 2: Get via cargo endpoint
        try:
            response = self.session.get(f"{self.base_url}/cargo-inspections")
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_result("Backward Compatibility (Get)", True, f"Cargo endpoint retrieved {len(data)} items")
                else:
                    self.log_result("Backward Compatibility (Get)", False, f"Expected list, got: {type(data)}")
            else:
                self.log_result("Backward Compatibility (Get)", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("Backward Compatibility (Get)", False, f"Exception: {str(e)}")
        
        # Test 3: Dashboard stats via cargo endpoint
        try:
            response = self.session.get(f"{self.base_url}/cargo-inspections/stats/dashboard")
            if response.status_code == 200:
                data = response.json()
                if "totalInspections" in data:
                    self.log_result("Backward Compatibility (Stats)", True, f"Cargo stats endpoint works")
                else:
                    self.log_result("Backward Compatibility (Stats)", False, f"Missing stats fields: {data}")
            else:
                self.log_result("Backward Compatibility (Stats)", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("Backward Compatibility (Stats)", False, f"Exception: {str(e)}")
    
    def test_date_handling(self):
        """Test date handling and formatting"""
        try:
            material_data = self.create_test_material_data("standard")
            # Test with dd/mm/yyyy format
            material_data["receiveDate"] = "18/01/2025"
            
            response = self.session.post(
                f"{self.base_url}/material-inspections",
                json=material_data,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                if "receiveDate" in data:
                    self.test_material_ids.append(data["id"])
                    self.log_result("Date Handling", True, f"Date format accepted: {data.get('receiveDate')}")
                else:
                    self.log_result("Date Handling", False, f"receiveDate missing: {data}")
            else:
                self.log_result("Date Handling", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_result("Date Handling", False, f"Exception: {str(e)}")
    
    def test_delete_material_inspection(self):
        """Test deleting material inspection"""
        if not self.test_material_ids:
            self.log_result("Delete Material", False, "No test material IDs available")
            return
        
        try:
            # Test deleting existing material
            material_id = self.test_material_ids.pop()  # Remove from list
            response = self.session.delete(f"{self.base_url}/material-inspections/{material_id}")
            
            if response.status_code == 200:
                data = response.json()
                if "message" in data:
                    self.log_result("Delete Material", True, f"Deleted material {material_id}")
                else:
                    self.log_result("Delete Material", False, f"Unexpected response: {data}")
            else:
                self.log_result("Delete Material", False, f"Status: {response.status_code}")
            
            # Test deleting non-existent material
            fake_id = str(uuid.uuid4())
            response = self.session.delete(f"{self.base_url}/material-inspections/{fake_id}")
            if response.status_code == 404:
                self.log_result("Delete Non-existent Material", True, "Properly returned 404")
            else:
                self.log_result("Delete Non-existent Material", False, f"Expected 404, got: {response.status_code}")
                
        except Exception as e:
            self.log_result("Delete Material", False, f"Exception: {str(e)}")
    
    def cleanup_test_data(self):
        """Clean up test data"""
        print("\n🧹 Cleaning up test data...")
        for material_id in self.test_material_ids:
            try:
                self.session.delete(f"{self.base_url}/material-inspections/{material_id}")
            except:
                pass  # Ignore cleanup errors
    
    def run_all_tests(self):
        """Run all backend API tests"""
        print("🚀 Starting Material Receiving Control Backend API Tests")
        print(f"🔗 Testing against: {self.base_url}")
        print("=" * 70)
        
        # Basic connectivity tests
        self.test_health_check()
        self.test_root_endpoint()
        
        # New field structure tests
        self.test_create_material_inspection_new_fields()
        self.test_get_material_inspections()
        self.test_get_specific_material()
        self.test_update_material_inspection()
        
        # Date handling test
        self.test_date_handling()
        
        # Advanced features
        self.test_dashboard_stats()
        self.test_bulk_sync_materials()
        
        # Backward compatibility tests
        self.test_backward_compatibility()
        
        # Cleanup test (delete)
        self.test_delete_material_inspection()
        
        # Final cleanup
        self.cleanup_test_data()
        
        # Print summary
        print("\n" + "=" * 70)
        print("📊 TEST SUMMARY")
        print("=" * 70)
        print(f"✅ Passed: {self.test_results['passed']}")
        print(f"❌ Failed: {self.test_results['failed']}")
        
        if self.test_results['errors']:
            print("\n🚨 FAILED TESTS:")
            for error in self.test_results['errors']:
                print(f"   • {error}")
        
        success_rate = (self.test_results['passed'] / (self.test_results['passed'] + self.test_results['failed'])) * 100
        print(f"\n📈 Success Rate: {success_rate:.1f}%")
        
        return self.test_results

if __name__ == "__main__":
    tester = MaterialReceivingAPITester()
    results = tester.run_all_tests()