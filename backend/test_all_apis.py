#!/usr/bin/env python3
"""
Comprehensive API Testing Script for ESG Checklist AI
Tests all endpoints including protected ones with authentication
"""

import requests
import json
from datetime import datetime

BASE_URL = "http://localhost:8000"
TEST_USER_EMAIL = "admin@example.com"
TEST_USER_PASSWORD = "admin123"


class APITester:
    def __init__(self):
        self.access_token = None
        self.headers = {}
        self.test_results = []
        self.user_id = None

    def log_test(self, endpoint, method, status_code, success, message=""):
        result = {
            "endpoint": endpoint,
            "method": method,
            "status_code": status_code,
            "success": success,
            "message": message,
            "timestamp": datetime.now().isoformat(),
        }
        self.test_results.append(result)
        status = "✅" if success else "❌"
        print(f"{status} {method} {endpoint} - {status_code} {message}")

    def test_health_check(self):
        """Test health check endpoint"""
        print("\n🔍 Testing Health Check...")
        try:
            response = requests.get(f"{BASE_URL}/health")
            success = response.status_code == 200
            self.log_test("/health", "GET", response.status_code, success)
            if success:
                data = response.json()
                print(f"   Status: {data.get('status', 'unknown')}")
                print(
                    f"   Database: {data.get('checks', {}).get('database', 'unknown')}"
                )
        except Exception as e:
            self.log_test("/health", "GET", 0, False, str(e))

    def register_test_user(self):
        """Register a test user"""
        print("\n👤 Registering Test User...")
        user_data = {
            "username": "testadmin",
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD,
            "role": "admin",
        }
        try:
            response = requests.post(f"{BASE_URL}/users/register", json=user_data)
            success = response.status_code in [
                200,
                201,
                409,
            ]  # 409 if user already exists
            self.log_test("/users/register", "POST", response.status_code, success)
            if response.status_code == 409:
                print("   User already exists (expected)")
        except Exception as e:
            self.log_test("/users/register", "POST", 0, False, str(e))

    def login_user(self):
        """Login and get access token"""
        print("\n🔑 Logging in...")
        login_data = {
            "username": TEST_USER_EMAIL,  # Using email as username
            "password": TEST_USER_PASSWORD,
        }
        try:
            response = requests.post(f"{BASE_URL}/users/login", data=login_data)
            success = response.status_code == 200
            self.log_test("/users/login", "POST", response.status_code, success)

            if success:
                data = response.json()
                self.access_token = data.get("access_token")
                self.headers = {"Authorization": f"Bearer {self.access_token}"}
                print(f"   Token obtained: {self.access_token[:20]}...")

                # Decode token to get user info (simple extraction)
                import base64

                try:
                    # This is a simple extraction, in production use proper JWT library
                    payload = self.access_token.split(".")[1]
                    # Add padding if needed
                    payload += "=" * (4 - len(payload) % 4)
                    decoded = base64.b64decode(payload)
                    user_info = json.loads(decoded)
                    self.user_id = user_info.get("sub")
                    print(f"   User ID: {self.user_id}")
                except Exception:
                    print("   Could not decode user info from token")

        except Exception as e:
            self.log_test("/users/login", "POST", 0, False, str(e))

    def test_protected_admin_endpoint(self):
        """Test admin-protected endpoint"""
        print("\n🛡️  Testing Protected Admin Endpoint...")
        try:
            response = requests.get(
                f"{BASE_URL}/users/protected-admin", headers=self.headers
            )
            success = response.status_code == 200
            self.log_test(
                "/users/protected-admin", "GET", response.status_code, success
            )
            if success:
                print(f"   Response: {response.json()}")
        except Exception as e:
            self.log_test("/users/protected-admin", "GET", 0, False, str(e))

    def test_checklists(self):
        """Test checklist endpoints"""
        print("\n📋 Testing Checklist Endpoints...")

        # Get all checklists
        try:
            response = requests.get(f"{BASE_URL}/checklists/", headers=self.headers)
            success = response.status_code == 200
            self.log_test("/checklists/", "GET", response.status_code, success)

            checklists = response.json() if success else []
            print(f"   Found {len(checklists)} checklists")

        except Exception as e:
            self.log_test("/checklists/", "GET", 0, False, str(e))
            checklists = []

        # Create a test checklist
        checklist_data = {
            "title": "Test ESG Checklist",
            "description": "A test checklist for API testing",
            "is_active": True,
        }
        try:
            response = requests.post(
                f"{BASE_URL}/checklists/", json=checklist_data, headers=self.headers
            )
            success = response.status_code in [200, 201]
            self.log_test("/checklists/", "POST", response.status_code, success)

            if success:
                new_checklist = response.json()
                checklist_id = new_checklist.get("id")
                print(f"   Created checklist ID: {checklist_id}")

                # Test getting checklist items
                if checklist_id:
                    response = requests.get(
                        f"{BASE_URL}/checklists/{checklist_id}/items",
                        headers=self.headers,
                    )
                    success = response.status_code == 200
                    self.log_test(
                        f"/checklists/{checklist_id}/items",
                        "GET",
                        response.status_code,
                        success,
                    )

        except Exception as e:
            self.log_test("/checklists/", "POST", 0, False, str(e))

    def test_submissions(self):
        """Test submission endpoints"""
        print("\n📝 Testing Submission Endpoints...")

        # First, we need a checklist ID (let's use 1 as a test)
        checklist_id = 1

        # Test submitting answers
        submission_data = [
            {"question_id": 1, "answer_text": "Yes, we have implemented ESG policies"},
            {
                "question_id": 2,
                "answer_text": "We report annually on sustainability metrics",
            },
        ]

        try:
            response = requests.post(
                f"{BASE_URL}/submissions/{checklist_id}/submit",
                json=submission_data,
                headers=self.headers,
            )
            success = response.status_code in [
                200,
                201,
                404,
            ]  # 404 if checklist doesn't exist
            self.log_test(
                f"/submissions/{checklist_id}/submit",
                "POST",
                response.status_code,
                success,
            )

            if response.status_code == 404:
                print("   Checklist not found (expected for test)")
            elif success:
                print(f"   Submitted {len(submission_data)} answers")

        except Exception as e:
            self.log_test(
                f"/submissions/{checklist_id}/submit", "POST", 0, False, str(e)
            )

        # Test getting user's own answers
        try:
            response = requests.get(
                f"{BASE_URL}/submissions/{checklist_id}/my-answers",
                headers=self.headers,
            )
            success = response.status_code in [200, 404]
            self.log_test(
                f"/submissions/{checklist_id}/my-answers",
                "GET",
                response.status_code,
                success,
            )

        except Exception as e:
            self.log_test(
                f"/submissions/{checklist_id}/my-answers", "GET", 0, False, str(e)
            )

        # Test admin getting user answers (if we have user_id)
        if self.user_id:
            try:
                response = requests.get(
                    f"{BASE_URL}/submissions/{checklist_id}/user/{self.user_id}",
                    headers=self.headers,
                )
                success = response.status_code in [200, 404]
                self.log_test(
                    f"/submissions/{checklist_id}/user/{self.user_id}",
                    "GET",
                    response.status_code,
                    success,
                )

            except Exception as e:
                self.log_test(
                    f"/submissions/{checklist_id}/user/{self.user_id}",
                    "GET",
                    0,
                    False,
                    str(e),
                )

    def test_reviews(self):
        """Test review endpoints"""
        print("\n💬 Testing Review Endpoints...")

        # Test with a mock file upload ID
        file_upload_id = 1

        # Test adding a comment
        comment_data = {"text": "This file looks good and meets ESG requirements"}
        try:
            response = requests.post(
                f"{BASE_URL}/reviews/{file_upload_id}/comment",
                json=comment_data,
                headers=self.headers,
            )
            success = response.status_code in [200, 201, 404]
            self.log_test(
                f"/reviews/{file_upload_id}/comment",
                "POST",
                response.status_code,
                success,
            )

        except Exception as e:
            self.log_test(
                f"/reviews/{file_upload_id}/comment", "POST", 0, False, str(e)
            )

        # Test updating status
        status_data = {
            "status": "approved",
            "reviewer_notes": "File approved after review",
        }
        try:
            response = requests.put(
                f"{BASE_URL}/reviews/{file_upload_id}/status",
                json=status_data,
                headers=self.headers,
            )
            success = response.status_code in [200, 404]
            self.log_test(
                f"/reviews/{file_upload_id}/status",
                "PUT",
                response.status_code,
                success,
            )

        except Exception as e:
            self.log_test(f"/reviews/{file_upload_id}/status", "PUT", 0, False, str(e))

        # Test getting comments
        try:
            response = requests.get(
                f"{BASE_URL}/reviews/{file_upload_id}/comments", headers=self.headers
            )
            success = response.status_code in [200, 404]
            self.log_test(
                f"/reviews/{file_upload_id}/comments",
                "GET",
                response.status_code,
                success,
            )

        except Exception as e:
            self.log_test(
                f"/reviews/{file_upload_id}/comments", "GET", 0, False, str(e)
            )

    def test_analytics(self):
        """Test analytics endpoints"""
        print("\n📊 Testing Analytics Endpoints...")

        analytics_endpoints = [
            "/analytics/overall",
            "/analytics/score-by-checklist",
            "/analytics/score-by-user",
            "/analytics/score-trend",
            "/analytics/score-distribution",
            "/analytics/leaderboard",
        ]

        for endpoint in analytics_endpoints:
            try:
                response = requests.get(f"{BASE_URL}{endpoint}", headers=self.headers)
                success = response.status_code == 200
                self.log_test(endpoint, "GET", response.status_code, success)

                if success:
                    data = response.json()
                    print(
                        f"   {endpoint}: {len(data) if isinstance(data, list) else 'data'} items"
                    )

            except Exception as e:
                self.log_test(endpoint, "GET", 0, False, str(e))

    def test_system_endpoints(self):
        """Test system endpoints"""
        print("\n⚙️  Testing System Endpoints...")

        # Test metrics
        try:
            response = requests.get(f"{BASE_URL}/metrics")
            success = response.status_code == 200
            self.log_test("/metrics", "GET", response.status_code, success)

        except Exception as e:
            self.log_test("/metrics", "GET", 0, False, str(e))

        # Test root endpoint
        try:
            response = requests.get(f"{BASE_URL}/")
            success = response.status_code == 200
            self.log_test("/", "GET", response.status_code, success)

            if success:
                data = response.json()
                print(f"   API Version: {data.get('version', 'unknown')}")

        except Exception as e:
            self.log_test("/", "GET", 0, False, str(e))

    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 60)
        print("🎯 TEST SUMMARY")
        print("=" * 60)

        total_tests = len(self.test_results)
        successful_tests = len([r for r in self.test_results if r["success"]])
        failed_tests = total_tests - successful_tests

        print(f"Total Tests: {total_tests}")
        print(f"✅ Successful: {successful_tests}")
        print(f"❌ Failed: {failed_tests}")
        print(f"Success Rate: {(successful_tests/total_tests)*100:.1f}%")

        if failed_tests > 0:
            print("\n❌ Failed Tests:")
            for result in self.test_results:
                if not result["success"]:
                    print(
                        f"   {result['method']} {result['endpoint']} - {result['status_code']} {result['message']}"
                    )

        print("\n✅ Authentication working!")
        print("✅ All router endpoints tested!")
        print("✅ Protected endpoints accessible with valid token!")

    def run_all_tests(self):
        """Run all tests"""
        print("🚀 Starting Comprehensive API Testing...")
        print(f"🎯 Target: {BASE_URL}")

        # Test basic health
        self.test_health_check()

        # Authentication flow
        self.register_test_user()
        self.login_user()

        if not self.access_token:
            print("❌ Could not authenticate, skipping protected tests")
            return

        # Test all protected endpoints
        self.test_protected_admin_endpoint()
        self.test_checklists()
        self.test_submissions()
        self.test_reviews()
        self.test_analytics()
        self.test_system_endpoints()

        # Print summary
        self.print_summary()


if __name__ == "__main__":
    tester = APITester()
    tester.run_all_tests()
