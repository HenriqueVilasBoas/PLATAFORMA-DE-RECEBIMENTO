#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for Logistics Inspection App
Tests all CRUD operations, validation, and specialized features
"""

import requests
import json
import base64
from datetime import datetime
import uuid
import time

# Backend URL from environment
BACKEND_URL = "https://receipt-monitor.preview.emergentagent.com/api"

class LogisticsAPITester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.session = requests.Session()
        self.test_cargo_ids = []
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
    
    def create_test_cargo_data(self, with_non_conformance=False):
        """Create test cargo inspection data"""
        base_data = {
            "invoiceNumber": f"INV-2025-{str(uuid.uuid4())[:8]}",
            "materialType": "Steel Pipes",
            "quantityReceived": "500",
            "nonConforming": with_non_conformance,
            "notes": "Test cargo inspection data",
            "photos": [self.create_sample_photo_data()]
        }
        
        if with_non_conformance:
            base_data.update({
                "nonConformanceType": "Physical Damage",
                "nonConformingQuantity": "25",
                "notes": "Minor dents on 25 pipes - test data"
            })
        
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
    
    def test_create_cargo_inspection(self):
        """Test creating cargo inspections"""
        # Test 1: Create cargo without non-conformance
        try:
            cargo_data = self.create_test_cargo_data(with_non_conformance=False)
            response = self.session.post(
                f"{self.base_url}/cargo-inspections",
                json=cargo_data,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                if "id" in data and "invoiceNumber" in data:
                    self.test_cargo_ids.append(data["id"])
                    self.log_result("Create Cargo (Compliant)", True, f"ID: {data['id']}")
                else:
                    self.log_result("Create Cargo (Compliant)", False, f"Missing required fields: {data}")
            else:
                self.log_result("Create Cargo (Compliant)", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_result("Create Cargo (Compliant)", False, f"Exception: {str(e)}")
        
        # Test 2: Create cargo with non-conformance
        try:
            cargo_data = self.create_test_cargo_data(with_non_conformance=True)
            response = self.session.post(
                f"{self.base_url}/cargo-inspections",
                json=cargo_data,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                if "id" in data and data.get("nonConforming") == True:
                    self.test_cargo_ids.append(data["id"])
                    self.log_result("Create Cargo (Non-Conforming)", True, f"ID: {data['id']}")
                else:
                    self.log_result("Create Cargo (Non-Conforming)", False, f"Non-conformance not properly set: {data}")
            else:
                self.log_result("Create Cargo (Non-Conforming)", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_result("Create Cargo (Non-Conforming)", False, f"Exception: {str(e)}")
        
        # Test 3: Test validation - missing required fields
        try:
            invalid_data = {"notes": "Missing required fields"}
            response = self.session.post(
                f"{self.base_url}/cargo-inspections",
                json=invalid_data,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code in [400, 422]:  # Should fail validation
                self.log_result("Create Cargo (Validation)", True, "Properly rejected invalid data")
            else:
                self.log_result("Create Cargo (Validation)", False, f"Should have failed validation, got: {response.status_code}")
        except Exception as e:
            self.log_result("Create Cargo (Validation)", False, f"Exception: {str(e)}")
    
    def test_get_cargo_inspections(self):
        """Test getting all cargo inspections with pagination"""
        try:
            # Test basic get all
            response = self.session.get(f"{self.base_url}/cargo-inspections")
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_result("Get All Cargo", True, f"Retrieved {len(data)} inspections")
                else:
                    self.log_result("Get All Cargo", False, f"Expected list, got: {type(data)}")
            else:
                self.log_result("Get All Cargo", False, f"Status: {response.status_code}")
            
            # Test pagination
            response = self.session.get(f"{self.base_url}/cargo-inspections?skip=0&limit=1")
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list) and len(data) <= 1:
                    self.log_result("Get Cargo (Pagination)", True, f"Pagination working, got {len(data)} items")
                else:
                    self.log_result("Get Cargo (Pagination)", False, f"Pagination failed: {len(data)} items")
            else:
                self.log_result("Get Cargo (Pagination)", False, f"Status: {response.status_code}")
                
        except Exception as e:
            self.log_result("Get All Cargo", False, f"Exception: {str(e)}")
    
    def test_get_specific_cargo(self):
        """Test getting specific cargo inspection by ID"""
        if not self.test_cargo_ids:
            self.log_result("Get Specific Cargo", False, "No test cargo IDs available")
            return
        
        try:
            cargo_id = self.test_cargo_ids[0]
            response = self.session.get(f"{self.base_url}/cargo-inspections/{cargo_id}")
            
            if response.status_code == 200:
                data = response.json()
                if data.get("id") == cargo_id:
                    self.log_result("Get Specific Cargo", True, f"Retrieved cargo {cargo_id}")
                else:
                    self.log_result("Get Specific Cargo", False, f"ID mismatch: expected {cargo_id}, got {data.get('id')}")
            else:
                self.log_result("Get Specific Cargo", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("Get Specific Cargo", False, f"Exception: {str(e)}")
        
        # Test non-existent cargo
        try:
            fake_id = str(uuid.uuid4())
            response = self.session.get(f"{self.base_url}/cargo-inspections/{fake_id}")
            if response.status_code == 404:
                self.log_result("Get Non-existent Cargo", True, "Properly returned 404")
            else:
                self.log_result("Get Non-existent Cargo", False, f"Expected 404, got: {response.status_code}")
        except Exception as e:
            self.log_result("Get Non-existent Cargo", False, f"Exception: {str(e)}")
    
    def test_update_cargo_inspection(self):
        """Test updating cargo inspection"""
        if not self.test_cargo_ids:
            self.log_result("Update Cargo", False, "No test cargo IDs available")
            return
        
        try:
            cargo_id = self.test_cargo_ids[0]
            update_data = {
                "notes": "Updated notes - test modification",
                "nonConforming": True,
                "nonConformanceType": "Updated Damage Type",
                "nonConformingQuantity": "10"
            }
            
            response = self.session.put(
                f"{self.base_url}/cargo-inspections/{cargo_id}",
                json=update_data,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("notes") == update_data["notes"] and data.get("nonConforming") == True:
                    self.log_result("Update Cargo", True, f"Successfully updated cargo {cargo_id}")
                else:
                    self.log_result("Update Cargo", False, f"Update not reflected: {data}")
            else:
                self.log_result("Update Cargo", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_result("Update Cargo", False, f"Exception: {str(e)}")
    
    def test_dashboard_stats(self):
        """Test dashboard statistics endpoint"""
        try:
            response = self.session.get(f"{self.base_url}/cargo-inspections/stats/dashboard")
            
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
    
    def test_bulk_sync(self):
        """Test bulk sync functionality"""
        try:
            # Create multiple cargo inspections for bulk sync
            bulk_cargos = []
            for i in range(3):
                cargo_data = self.create_test_cargo_data(with_non_conformance=(i % 2 == 0))
                cargo_data["id"] = str(uuid.uuid4())
                cargo_data["inspectionDate"] = datetime.utcnow().isoformat()
                cargo_data["lastModified"] = datetime.utcnow().isoformat()
                bulk_cargos.append(cargo_data)
            
            sync_data = {
                "cargos": bulk_cargos,
                "lastSyncTimestamp": datetime.utcnow().isoformat()
            }
            
            response = self.session.post(
                f"{self.base_url}/cargo-inspections/bulk-sync",
                json=sync_data,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("synced_count") == 3:
                    # Store IDs for cleanup
                    self.test_cargo_ids.extend([cargo["id"] for cargo in bulk_cargos])
                    self.log_result("Bulk Sync", True, f"Synced {data['synced_count']} inspections")
                else:
                    self.log_result("Bulk Sync", False, f"Expected 3 synced, got: {data.get('synced_count')}")
            else:
                self.log_result("Bulk Sync", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_result("Bulk Sync", False, f"Exception: {str(e)}")
    
    def test_delete_cargo_inspection(self):
        """Test deleting cargo inspection"""
        if not self.test_cargo_ids:
            self.log_result("Delete Cargo", False, "No test cargo IDs available")
            return
        
        try:
            # Test deleting existing cargo
            cargo_id = self.test_cargo_ids.pop()  # Remove from list
            response = self.session.delete(f"{self.base_url}/cargo-inspections/{cargo_id}")
            
            if response.status_code == 200:
                data = response.json()
                if "message" in data:
                    self.log_result("Delete Cargo", True, f"Deleted cargo {cargo_id}")
                else:
                    self.log_result("Delete Cargo", False, f"Unexpected response: {data}")
            else:
                self.log_result("Delete Cargo", False, f"Status: {response.status_code}")
            
            # Test deleting non-existent cargo
            fake_id = str(uuid.uuid4())
            response = self.session.delete(f"{self.base_url}/cargo-inspections/{fake_id}")
            if response.status_code == 404:
                self.log_result("Delete Non-existent Cargo", True, "Properly returned 404")
            else:
                self.log_result("Delete Non-existent Cargo", False, f"Expected 404, got: {response.status_code}")
                
        except Exception as e:
            self.log_result("Delete Cargo", False, f"Exception: {str(e)}")
    
    def cleanup_test_data(self):
        """Clean up test data"""
        print("\n🧹 Cleaning up test data...")
        for cargo_id in self.test_cargo_ids:
            try:
                self.session.delete(f"{self.base_url}/cargo-inspections/{cargo_id}")
            except:
                pass  # Ignore cleanup errors
    
    def run_all_tests(self):
        """Run all backend API tests"""
        print("🚀 Starting Logistics Inspection Backend API Tests")
        print(f"🔗 Testing against: {self.base_url}")
        print("=" * 60)
        
        # Basic connectivity tests
        self.test_health_check()
        self.test_root_endpoint()
        
        # CRUD operations
        self.test_create_cargo_inspection()
        self.test_get_cargo_inspections()
        self.test_get_specific_cargo()
        self.test_update_cargo_inspection()
        
        # Advanced features
        self.test_dashboard_stats()
        self.test_bulk_sync()
        
        # Cleanup test (delete)
        self.test_delete_cargo_inspection()
        
        # Final cleanup
        self.cleanup_test_data()
        
        # Print summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
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
    tester = LogisticsAPITester()
    results = tester.run_all_tests()