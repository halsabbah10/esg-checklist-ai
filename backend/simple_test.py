#!/usr/bin/env python3
"""
Simple test to verify server startup and basic functionality
"""
import subprocess
import time
import requests
import sys
import os

def test_server():
    print("🧪 Simple Server Test")
    print("=" * 50)
    
    # Kill any existing server
    os.system("pkill -f 'uvicorn.*8000' 2>/dev/null || true")
    time.sleep(2)
    
    # Start server
    print("🚀 Starting server...")
    process = subprocess.Popen(
        ["python", "run_server.py"],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        universal_newlines=True
    )
    
    # Wait for startup
    print("⏳ Waiting for server...")
    time.sleep(10)
    
    success = False
    try:
        # Test health endpoint
        print("🏥 Testing health endpoint...")
        response = requests.get("http://localhost:8000/health", timeout=5)
        if response.status_code == 200:
            print("✅ Health check passed")
            data = response.json()
            print(f"✅ Status: {data['status']}")
            print(f"✅ Version: {data['version']}")
            success = True
        else:
            print(f"❌ Health check failed: {response.status_code}")
            
        # Test root endpoint
        print("🏠 Testing root endpoint...")
        response = requests.get("http://localhost:8000/", timeout=5)
        if response.status_code == 200:
            print("✅ Root endpoint works")
            data = response.json()
            print(f"✅ API Prefix: {data['api_prefix']}")
        else:
            print(f"❌ Root endpoint failed: {response.status_code}")
            
        # Test API docs
        print("📋 Testing API docs...")
        response = requests.get("http://localhost:8000/v1/docs", timeout=5)
        if response.status_code == 200:
            print("✅ Swagger UI accessible")
        else:
            print(f"❌ Swagger UI failed: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Test failed: {e}")
        
    finally:
        # Clean up
        print("🛑 Stopping server...")
        try:
            process.terminate()
            process.wait(timeout=10)
        except:
            process.kill()
        
        os.system("pkill -f 'uvicorn.*8000' 2>/dev/null || true")
        
    return success

if __name__ == "__main__":
    success = test_server()
    sys.exit(0 if success else 1)
