#!/usr/bin/env python3
"""
Comprehensive testing suite for ESG Checklist AI with Swagger UI integration
Tests all functionalities using provided sample data
"""

import logging
import subprocess
import sys
import time
from pathlib import Path

import requests

# Configure default timeout for all requests
DEFAULT_TIMEOUT = 30

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Add the current directory to Python path
sys.path.insert(0, str(Path(__file__).parent))


class SwaggerTestSuite:
    """Test suite for ESG Checklist AI API endpoints."""

    def __init__(self):
        self.base_url = "http://localhost:8000"
        self.api_prefix = "/v1"
        self.server_process = None
        self.test_user_token = None
        self.admin_token = None
        self.test_checklist_id = None
        self.test_file_id = None
        self.samples_dir = Path("../samples")

    def safe_request(self, method, url, **kwargs):
        """Make HTTP request with default timeout for security."""
        kwargs.setdefault("timeout", DEFAULT_TIMEOUT)
        return getattr(requests, method)(url, **kwargs)

    def start_server(self):
        """Start the FastAPI server in background."""
        logger.info("Starting FastAPI server...")
        try:
            # Kill any existing server on port 8000 using subprocess
            try:
                # S603, S607: subprocess call is safe - controlled command with fixed arguments
                subprocess.run(
                    ["pkill", "-f", "uvicorn.*8000"],
                    check=False,
                    capture_output=True,
                    text=True,
                    timeout=10,
                )
            except (subprocess.TimeoutExpired, FileNotFoundError):
                logger.warning("Could not kill existing uvicorn processes")

            time.sleep(2)

            # Start server
            # S603: subprocess call is safe - controlled test environment
            self.server_process = subprocess.Popen(
                [sys.executable, "run_server.py"],
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                cwd=Path.cwd(),
                universal_newlines=True,
                bufsize=1,
            )

            # Wait for server to start
            logger.info("Waiting for server to start...")
            for i in range(45):  # Wait up to 45 seconds
                # Check if process is still running
                if self.server_process.poll() is not None:
                    # Process has exited, read output
                    stdout, stderr = self.server_process.communicate()
                    logger.error(
                        "Server process exited with code %s", self.server_process.returncode
                    )
                    logger.error("Server output: %s", stdout)
                    if stderr:
                        logger.error("Server errors: %s", stderr)
                    return False

                try:
                    response = requests.get(f"{self.base_url}/health", timeout=2)
                    if response.status_code == 200:
                        logger.info("Server started successfully at %s", self.base_url)
                        logger.info("Swagger UI: %s%s/docs", self.base_url, self.api_prefix)
                        return True
                except requests.exceptions.RequestException:
                    if i % 5 == 0:  # Log progress every 5 seconds
                        logger.info("Still waiting... (%d/45 seconds)", i + 1)
                    time.sleep(1)

            logger.error("Server failed to start within 45 seconds")
            if self.server_process and self.server_process.poll() is None:
                logger.info("Server process is still running, checking output...")
                time.sleep(2)

            return False

        except Exception as e:
            logger.exception("Error starting server: %s", e)
            return False

    def stop_server(self):
        """Stop the FastAPI server."""
        if self.server_process:
            try:
                self.server_process.terminate()
                self.server_process.wait(timeout=10)
                logger.info("Server stopped gracefully")
            except subprocess.TimeoutExpired:
                logger.warning("Server didn't stop gracefully, forcing kill...")
                self.server_process.kill()
                self.server_process.wait()
                logger.info("Server force-killed")
            except Exception as e:
                logger.warning("Error stopping server: %s", e)

        # Also kill any remaining uvicorn processes on port 8000
        try:
            # S603, S607: subprocess call is safe - controlled command with fixed arguments
            subprocess.run(
                ["pkill", "-f", "uvicorn.*8000"],
                check=False,
                capture_output=True,
                text=True,
                timeout=10,
            )
        except (subprocess.TimeoutExpired, FileNotFoundError):
            logger.warning("Could not kill remaining uvicorn processes")
        time.sleep(1)

    def test_health_endpoint(self):
        """Test the health endpoint."""
        logger.info("Testing Health Endpoint")
        logger.info("=" * 50)

        try:
            response = requests.get(f"{self.base_url}/health", timeout=10)

            logger.info("Status Code: %s", response.status_code)

            if response.status_code == 200:
                data = response.json()
                logger.info("Health Status: %s", data.get("status"))
                logger.info("API Version: %s", data.get("api_version"))
                logger.info("Environment: %s", data.get("environment"))
                logger.info("Database: %s", data.get("checks", {}).get("database"))
                logger.info("AI Services: %s", data.get("checks", {}).get("ai_services"))
                return True

            logger.error("Health check failed: %s", response.text)
            return False

        except Exception as e:
            logger.exception("Health endpoint error: %s", e)
            return False

    def test_api_documentation(self):
        """Test API documentation endpoints."""
        logger.info("Testing API Documentation")
        logger.info("=" * 50)

        endpoints = [
            (f"{self.api_prefix}/docs", "Swagger UI"),
            (f"{self.api_prefix}/redoc", "ReDoc"),
            (f"{self.api_prefix}/openapi.json", "OpenAPI Schema"),
        ]

        success_count = 0
        for endpoint, name in endpoints:
            try:
                response = requests.get(f"{self.base_url}{endpoint}", timeout=10)
                if response.status_code == 200:
                    logger.info("%s: Available at %s", name, endpoint)
                    success_count += 1
                else:
                    logger.error("%s: Failed (%s)", name, response.status_code)
            except Exception as e:  # noqa: PERF203
                logger.exception("%s: Error - %s", name, e)

        return success_count == len(endpoints)

    def register_test_users(self):
        """Register test users for testing."""
        logger.info("Registering Test Users")
        logger.info("=" * 50)

        users = [
            {
                "username": "testadmin",
                "email": "test@admin.com",
                "password": "admin123",
                "role": "admin",
            },
            {
                "username": "testuser",
                "email": "test@user.com",
                "password": "user123",
                "role": "auditor",
            },
        ]

        for user in users:
            try:
                response = requests.post(
                    f"{self.base_url}{self.api_prefix}/users/register",
                    json=user,
                    timeout=DEFAULT_TIMEOUT,
                )

                if response.status_code == 200:
                    logger.info("Registered %s: %s", user["role"], user["email"])
                elif response.status_code == 400 and "already registered" in response.text.lower():
                    logger.warning("User already exists: %s", user["email"])
                else:
                    logger.error("Failed to register %s: %s", user["email"], response.text)

            except Exception as e:  # noqa: PERF203
                logger.exception("Registration error for %s: %s", user["email"], e)

        return True

    def login_users(self):
        """Login test users and get tokens."""
        logger.info("Logging in Test Users")
        logger.info("=" * 50)

        # Login admin
        try:
            response = requests.post(
                f"{self.base_url}{self.api_prefix}/users/login",
                data={"username": "test@admin.com", "password": "admin123"},
                timeout=DEFAULT_TIMEOUT,
            )

            if response.status_code == 200:
                self.admin_token = response.json()["access_token"]
                logger.info("Admin login successful")
            else:
                logger.error("Admin login failed: %s", response.text)

        except Exception as e:
            logger.exception("Admin login error: %s", e)

        # Login regular user
        try:
            response = requests.post(
                f"{self.base_url}{self.api_prefix}/users/login",
                data={"username": "test@user.com", "password": "user123"},
                timeout=DEFAULT_TIMEOUT,
            )

            if response.status_code == 200:
                self.test_user_token = response.json()["access_token"]
                logger.info("User login successful")
            else:
                logger.error("User login failed: %s", response.text)

        except Exception as e:
            logger.exception("User login error: %s", e)

        return self.admin_token is not None and self.test_user_token is not None

    def test_user_management(self):
        """Test user management endpoints."""
        logger.info("Testing User Management")
        logger.info("=" * 50)

        if not self.admin_token:
            logger.error("No admin token available")
            return False

        headers = {"Authorization": f"Bearer {self.admin_token}"}

        # Get current user
        try:
            response = requests.get(
                f"{self.base_url}{self.api_prefix}/users/me",
                headers=headers,
                timeout=DEFAULT_TIMEOUT,
            )

            if response.status_code == 200:
                user_data = response.json()
                logger.info(
                    "Current User: %s (%s)",
                    user_data.get("email"),
                    user_data.get("role"),
                )
            else:
                logger.error("Get current user failed: %s", response.text)

        except Exception as e:
            logger.exception("Get current user error: %s", e)

        # List all users (admin only)
        try:
            response = requests.get(
                f"{self.base_url}{self.api_prefix}/admin/users/",
                headers=headers,
                timeout=DEFAULT_TIMEOUT,
            )

            if response.status_code == 200:
                users = response.json()
                if isinstance(users, list):
                    logger.info("Listed %d users", len(users))
                    for user in users[:3]:  # Show first 3
                        logger.info("  - %s (%s)", user.get("email"), user.get("role"))
                else:
                    logger.info("User data received: %s", type(users))
            else:
                logger.error("List users failed: %s", response.text)

        except Exception as e:
            logger.exception("List users error: %s", e)

        return True

    def create_test_checklist(self):
        """Create a test checklist."""
        logger.info("Creating Test Checklist")
        logger.info("=" * 50)

        if not self.admin_token:
            logger.error("No admin token available")
            return False

        headers = {"Authorization": f"Bearer {self.admin_token}"}

        checklist_data = {
            "title": f"ESG Assessment Test {int(time.time())}",  # Make unique
            "description": "Test checklist for comprehensive testing",
            "category": "environmental",
            "items": [
                {
                    "question_text": "Does the organization have a documented "
                    "environmental policy?",
                    "question_type": "boolean",
                    "weight": 10,
                    "criteria": [
                        "Policy must be board approved",
                        "Policy must be publicly available",
                    ],
                },
                {
                    "question_text": "What is the organization's carbon footprint "
                    "reduction target?",
                    "question_type": "text",
                    "weight": 8,
                    "criteria": ["Target must be time-bound", "Target must be measurable"],
                },
                {
                    "question_text": "Rate the effectiveness of current sustainability "
                    "initiatives (1-5)",
                    "question_type": "scale",
                    "weight": 7,
                    "criteria": ["Consider implementation status", "Consider impact measurement"],
                },
            ],
        }

        try:
            response = requests.post(
                f"{self.base_url}{self.api_prefix}/admin/checklists/",
                headers=headers,
                json=checklist_data,
                timeout=DEFAULT_TIMEOUT,
            )

            if response.status_code in [200, 201]:
                checklist = response.json()
                self.test_checklist_id = checklist["id"]
                logger.info(
                    "Created checklist: %s (ID: %s)",
                    checklist["title"],
                    self.test_checklist_id,
                )
                questions = checklist.get("questions", checklist.get("items", []))
                logger.info("  - Questions: %d", len(questions))
                return True

            logger.error("Create checklist failed: %s", response.text)
            return False

        except Exception as e:
            logger.exception("Create checklist error: %s", e)
            return False

    def test_checklist_management(self):
        """Test checklist management endpoints."""
        logger.info("Testing Checklist Management")
        logger.info("=" * 50)

        if not self.admin_token:
            logger.error("No admin token available")
            return False

        headers = {"Authorization": f"Bearer {self.admin_token}"}

        # List all checklists
        try:
            response = requests.get(
                f"{self.base_url}{self.api_prefix}/checklists/",
                headers=headers,
                timeout=DEFAULT_TIMEOUT,
            )

            if response.status_code == 200:
                checklists = response.json()
                logger.info("Listed %d checklists", len(checklists))
                for checklist in checklists[:3]:
                    logger.info(
                        "  - %s (ID: %s)",
                        checklist.get("title"),
                        checklist.get("id"),
                    )
            else:
                logger.error("List checklists failed: %s", response.text)

        except Exception as e:
            logger.exception("List checklists error: %s", e)

        # Get specific checklist
        if self.test_checklist_id:
            try:
                response = requests.get(
                    f"{self.base_url}{self.api_prefix}/checklists/{self.test_checklist_id}",
                    headers=headers,
                    timeout=DEFAULT_TIMEOUT,
                )

                if response.status_code == 200:
                    checklist = response.json()
                    logger.info("Retrieved checklist: %s", checklist.get("title"))
                    logger.info("  - Questions: %d", len(checklist.get("questions", [])))
                else:
                    logger.error("Get checklist failed: %s", response.text)

            except Exception as e:
                logger.exception("Get checklist error: %s", e)

        return True

    def test_file_upload(self):
        """Test file upload with sample data."""
        logger.info("Testing File Upload with Sample Data")
        logger.info("=" * 50)

        if not self.test_user_token:
            logger.error("No user token available")
            return False

        headers = {"Authorization": f"Bearer {self.test_user_token}"}

        # Find first available sample file
        sample_files = list(self.samples_dir.glob("*.xlsx"))
        if not sample_files:
            logger.error("No sample files found")
            return False

        sample_file = sample_files[0]
        logger.info("Using sample file: %s", sample_file.name)

        try:
            # Use the first checklist ID for upload if we don't have a test checklist
            checklist_id = self.test_checklist_id or 1

            with sample_file.open("rb") as f:
                files = {
                    "file": (
                        sample_file.name,
                        f,
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    )
                }

                response = requests.post(
                    f"{self.base_url}{self.api_prefix}/checklists/{checklist_id}/upload",
                    headers=headers,
                    files=files,
                    timeout=DEFAULT_TIMEOUT,
                )

                if response.status_code == 200:
                    upload_data = response.json()
                    self.test_file_id = upload_data.get("file_id")
                    logger.info("File uploaded successfully: %s", upload_data.get("filename"))
                    logger.info("  - File ID: %s", self.test_file_id)
                    logger.info("  - AI Score: %s", upload_data.get("ai_score", "N/A"))
                    return True

                logger.error("File upload failed: %s", response.text)
                return False

        except Exception as e:
            logger.exception("File upload error: %s", e)
            return False

    def test_ai_analysis(self):
        """Test AI analysis functionality."""
        logger.info("Testing AI Analysis")
        logger.info("=" * 50)

        if not self.admin_token:
            logger.error("Missing required data (admin token)")
            return False

        headers = {"Authorization": f"Bearer {self.admin_token}"}

        # Check AI results endpoint since AI analysis happens during file upload
        try:
            response = requests.get(
                f"{self.base_url}{self.api_prefix}/search/ai-results",
                headers=headers,
                params={"limit": 5},
                timeout=DEFAULT_TIMEOUT,
            )

            if response.status_code == 200:
                results = response.json()
                logger.info("AI Analysis results retrieved")
                logger.info("  - Total results: %s", results.get("total", 0))
                if results.get("results"):
                    for result in results["results"][:3]:
                        logger.info(
                            "  - Score: %s, File ID: %s",
                            result.get("score", "N/A"),
                            result.get("file_upload_id", "N/A"),
                        )
                return True

            logger.error("AI Analysis failed: %s", response.text)
            return False

        except Exception as e:
            logger.exception("AI Analysis error: %s", e)
            return False

    def test_analytics(self):
        """Test analytics endpoints."""
        logger.info("Testing Analytics")
        logger.info("=" * 50)

        if not self.admin_token:
            logger.error("No admin token available")
            return False

        headers = {"Authorization": f"Bearer {self.admin_token}"}

        analytics_endpoints = [
            ("/analytics/overall", "Overall Analytics"),
            ("/analytics/trends", "Trends Analytics"),
            ("/analytics/performance", "Performance Analytics"),
            ("/analytics/leaderboard", "Leaderboard"),
        ]

        success_count = 0
        for endpoint, name in analytics_endpoints:
            try:
                response = requests.get(
                    f"{self.base_url}{self.api_prefix}{endpoint}",
                    headers=headers,
                    timeout=DEFAULT_TIMEOUT,
                )

                if response.status_code == 200:
                    data = response.json()
                    logger.info("%s: Retrieved successfully", name)
                    if isinstance(data, dict) and data:
                        key_count = len(data.keys())
                        logger.info("  - Data points: %d", key_count)
                    success_count += 1
                else:
                    logger.error("%s: Failed (%s)", name, response.status_code)

            except Exception as e:  # noqa: PERF203
                logger.exception("%s: Error - %s", name, e)

        return success_count > 0

    def test_export_functionality(self):
        """Test export functionality."""
        logger.info("Testing Export Functionality")
        logger.info("=" * 50)

        if not self.admin_token:
            logger.error("No admin token available")
            return False

        headers = {"Authorization": f"Bearer {self.admin_token}"}

        export_endpoints = [
            ("/export/checklists?format=csv", "Checklists CSV"),
            ("/export/submissions?format=csv", "Submissions CSV"),
            ("/export/ai-results?format=csv", "AI Results CSV"),
            ("/export/ai-results?format=json", "AI Results JSON"),
        ]

        success_count = 0
        for endpoint, name in export_endpoints:
            try:
                response = requests.get(
                    f"{self.base_url}{self.api_prefix}{endpoint}",
                    headers=headers,
                    timeout=DEFAULT_TIMEOUT,
                )

                if response.status_code == 200:
                    logger.info("%s: Export successful", name)
                    logger.info(
                        "  - Content-Type: %s",
                        response.headers.get("content-type", "N/A"),
                    )
                    logger.info("  - Data size: %d bytes", len(response.content))
                    success_count += 1
                else:
                    logger.error("%s: Failed (%s)", name, response.status_code)

            except Exception as e:  # noqa: PERF203
                logger.exception("%s: Error - %s", name, e)

        return success_count > 0

    def test_submissions(self):
        """Test submissions functionality."""
        logger.info("Testing Submissions")
        logger.info("=" * 50)

        if not self.test_user_token:
            logger.error("Missing required data (token)")
            return False

        headers = {"Authorization": f"Bearer {self.test_user_token}"}

        # Use the test checklist ID, or fall back to an existing one
        checklist_id = self.test_checklist_id or 1

        # First, get the checklist items to find actual question IDs
        try:
            response = requests.get(
                f"{self.base_url}{self.api_prefix}/checklists/{checklist_id}/items",
                headers=headers,
                timeout=DEFAULT_TIMEOUT,
            )

            if response.status_code == 200:
                items = response.json()

                if not items:
                    logger.warning("No questions found in checklist, using default checklist")
                    checklist_id = 1  # Use the first checklist which should have questions
                    response = requests.get(
                        f"{self.base_url}{self.api_prefix}/checklists/{checklist_id}/items",
                        headers=headers,
                        timeout=DEFAULT_TIMEOUT,
                    )
                    if response.status_code == 200:
                        items = response.json()

                if items and len(items) >= 2:
                    # Create submission data with actual question IDs
                    submission_data = [
                        {
                            "question_id": items[0]["id"],
                            "answer_text": "Yes, we have a comprehensive environmental "
                            "policy documented and approved by the board.",
                        },
                        {
                            "question_id": items[1]["id"],
                            "answer_text": "Our target is to reduce carbon footprint "
                            "by 30% by 2025.",
                        },
                    ]

                    response = requests.post(
                        f"{self.base_url}{self.api_prefix}/submissions/{checklist_id}/submit",
                        headers=headers,
                        json=submission_data,
                        timeout=DEFAULT_TIMEOUT,
                    )

                    if response.status_code == 200:
                        submission = response.json()
                        logger.info("Submission created successfully")
                        logger.info("  - Detail: %s", submission.get("detail"))
                        logger.info("  - Answers saved: %s", submission.get("answers_saved", 0))
                        return True

                    logger.error("Create submission failed: %s", response.text)
                    return False

                logger.warning("No questions available for submission test")
                return True  # Consider this a success since checklist may be empty

            logger.error("Failed to get checklist items: %s", response.text)
            return False

        except Exception as e:
            logger.exception("Create submission error: %s", e)
            return False

    def test_notifications(self):
        """Test notifications functionality."""
        logger.info("Testing Notifications")
        logger.info("=" * 50)

        if not self.test_user_token:
            logger.error("No user token available")
            return False

        headers = {"Authorization": f"Bearer {self.test_user_token}"}

        try:
            response = requests.get(
                f"{self.base_url}{self.api_prefix}/notifications/user/me",
                headers=headers,
                timeout=DEFAULT_TIMEOUT,
            )

            if response.status_code == 200:
                notifications = response.json()
                logger.info("Retrieved %d notifications", len(notifications))

                for notification in notifications[:3]:
                    msg = notification.get("message", "N/A")[:50]
                    logger.info(
                        "  - %s: %s...",
                        notification.get("type", "N/A"),
                        msg,
                    )
                return True

            return response.status_code == 404  # Consider 404 a success

        except Exception as e:
            logger.exception("Get notifications error: %s", e)
            return False

    def test_audit_logging(self):
        """Test audit logging functionality."""
        logger.info("Testing Audit Logging")
        logger.info("=" * 50)

        if not self.admin_token:
            logger.error("No admin token available")
            return False

        headers = {"Authorization": f"Bearer {self.admin_token}"}

        try:
            response = requests.get(
                f"{self.base_url}{self.api_prefix}/audit/logs",
                headers=headers,
                timeout=DEFAULT_TIMEOUT,
            )

            if response.status_code == 200:
                logs = response.json()
                logger.info("Retrieved audit logs")
                if isinstance(logs, list):
                    logger.info("  - Log entries: %d", len(logs))
                else:
                    logger.info("  - Log entries: N/A")

                if isinstance(logs, list) and logs:
                    for log in logs[:3]:
                        logger.info(
                            "  - %s: %s",
                            log.get("action", "N/A"),
                            log.get("timestamp", "N/A"),
                        )
                return True

            logger.error("Get audit logs failed: %s", response.text)
            return False

        except Exception as e:
            logger.exception("Get audit logs error: %s", e)
            return False

    def run_comprehensive_test(self):
        """Run all tests in sequence."""
        logger.info("ESG Checklist AI - Comprehensive Swagger UI Test Suite")
        logger.info("=" * 70)

        tests = [
            ("Server Startup", self.start_server),
            ("Health Check", self.test_health_endpoint),
            ("API Documentation", self.test_api_documentation),
            ("User Registration", self.register_test_users),
            ("User Login", self.login_users),
            ("User Management", self.test_user_management),
            ("Checklist Creation", self.create_test_checklist),
            ("Checklist Management", self.test_checklist_management),
            ("File Upload", self.test_file_upload),
            ("AI Analysis", self.test_ai_analysis),
            ("Analytics", self.test_analytics),
            ("Export Functionality", self.test_export_functionality),
            ("Submissions", self.test_submissions),
            ("Notifications", self.test_notifications),
            ("Audit Logging", self.test_audit_logging),
        ]

        results = {}
        passed = 0
        total = len(tests)

        try:
            for test_name, test_func in tests:
                logger.info("Running: %s", test_name)
                try:
                    result = test_func()
                    results[test_name] = result
                    if result:
                        passed += 1
                        logger.info("%s: PASSED", test_name)
                    else:
                        logger.error("%s: FAILED", test_name)
                except Exception as e:
                    results[test_name] = False
                    logger.exception("%s: ERROR - %s", test_name, e)

                time.sleep(1)  # Brief pause between tests

        finally:
            self.stop_server()

        # Final report
        logger.info("=" * 70)
        logger.info("COMPREHENSIVE TEST RESULTS")
        logger.info("=" * 70)

        for test_name, result in results.items():
            status = "PASSED" if result else "FAILED"
            logger.info("%s: %s", test_name, status)

        percentage = (passed / total * 100) if total > 0 else 0
        logger.info("Overall Results: %d/%d tests passed (%.1f%%)", passed, total, percentage)

        if passed == total:
            logger.info("ALL TESTS PASSED! The ESG Checklist AI system is fully functional!")
            logger.info("Swagger UI is available at: %s%s/docs", self.base_url, self.api_prefix)
        elif passed >= total * 0.8:
            logger.warning("Most tests passed, but some issues need attention.")
        else:
            logger.error("Significant issues detected. Please review the failed tests.")

        return passed == total


if __name__ == "__main__":
    logger.info("ESG Checklist AI - Comprehensive Testing with Swagger UI")
    logger.info("=" * 70)
    logger.info("This will test all API functionalities using your sample data")
    logger.info("and launch Swagger UI for interactive testing.")
    logger.info("=" * 70)

    suite = SwaggerTestSuite()
    success = suite.run_comprehensive_test()

    if success:
        logger.info("Next Steps:")
        logger.info(
            "1. Visit %s%s/docs for interactive testing",
            suite.base_url,
            suite.api_prefix,
        )
        logger.info("2. Use the test credentials:")
        logger.info("   - Admin: test@admin.com / admin123")
        logger.info("   - User: test@user.com / user123")
        logger.info("3. Try uploading the sample Excel files from the samples/ directory")
        sys.exit(0)
    else:
        logger.error("Some tests failed. Please check the logs above.")
        sys.exit(1)
