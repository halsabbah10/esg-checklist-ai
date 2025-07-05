#!/usr/bin/env python3
"""
Simple test to verify server startup and basic functionality
"""

import logging
import subprocess
import sys
import time

import requests

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def test_server():
    """Simple server test."""
    logger.info("Simple Server Test")
    logger.info("=" * 50)

    # Kill any existing server using subprocess
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
    logger.info("Starting server...")
    # S603: subprocess call is safe - controlled test environment
    process = subprocess.Popen(
        [sys.executable, "run_server.py"],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        universal_newlines=True,
    )

    # Wait for startup
    logger.info("Waiting for server...")
    time.sleep(10)

    success = False
    try:
        # Test health endpoint
        logger.info("Testing health endpoint...")
        response = requests.get("http://localhost:8000/health", timeout=5)
        if response.status_code == 200:
            logger.info("Health check passed")
            data = response.json()
            logger.info("Status: %s", data["status"])
            logger.info("Version: %s", data["version"])
            success = True
        else:
            logger.error("Health check failed: %s", response.status_code)

        # Test root endpoint
        logger.info("Testing root endpoint...")
        response = requests.get("http://localhost:8000/", timeout=5)
        if response.status_code == 200:
            logger.info("Root endpoint works")
            data = response.json()
            logger.info("API Prefix: %s", data["api_prefix"])
        else:
            logger.error("Root endpoint failed: %s", response.status_code)

        # Test API docs
        logger.info("Testing API docs...")
        response = requests.get("http://localhost:8000/v1/docs", timeout=5)
        if response.status_code == 200:
            logger.info("Swagger UI accessible")
        else:
            logger.error("Swagger UI failed: %s", response.status_code)

    except Exception as e:
        logger.exception("Test failed: %s", e)

    finally:
        # Clean up
        logger.info("Stopping server...")
        try:
            process.terminate()
            process.wait(timeout=10)
        except (subprocess.TimeoutExpired, OSError):
            process.kill()

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

    return success


if __name__ == "__main__":
    if test_server():
        logger.info("✅ Simple test passed!")
        sys.exit(0)
    else:
        logger.error("❌ Simple test failed!")
        sys.exit(1)
