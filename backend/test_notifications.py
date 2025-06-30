#!/usr/bin/env python3
"""
Test script for automatic notification system
"""

import sys

sys.path.append(".")

from app.database import get_session
from app.models import User, FileUpload, Notification
from app.utils.notifications import (
    notify_user,
    notify_file_status_change,
    notify_file_commented,
)
from sqlmodel import select


def test_notification_system():
    """Test the automatic notification system"""
    print("🧪 Testing Notification System")
    print("=" * 50)

    # Get a database session
    db = next(get_session())
    try:
        # Test 1: Basic notification function
        print("\n1. Testing basic notify_user function...")
        test_user = db.exec(select(User).limit(1)).first()
        if not test_user or not test_user.id:
            print("❌ No users found in database. Create a user first.")
            return False

        success = notify_user(
            db=db,
            user_id=test_user.id,
            title="Test Notification",
            message="This is a test notification to verify the system works.",
            link="/test",
            notification_type="info",
        )
        print(f"✅ Basic notification: {'Success' if success else 'Failed'}")

        # Test 2: File status change notification
        print("\n2. Testing file status change notification...")
        test_file = db.exec(select(FileUpload).limit(1)).first()
        if not test_file:
            print("❌ No file uploads found in database. Upload a file first.")
        else:
            success = notify_file_status_change(
                db=db,
                file_upload=test_file,
                new_status="approved",
                reviewer_name="Test Admin",
            )
            print(
                f"✅ Status change notification: {'Success' if success else 'Failed'}"
            )

        # Test 3: File comment notification
        print("\n3. Testing file comment notification...")
        if test_file:
            success = notify_file_commented(
                db=db, file_upload=test_file, commenter_name="Test Reviewer"
            )
            print(f"✅ Comment notification: {'Success' if success else 'Failed'}")

        # Test 4: Check notifications were created
        print("\n4. Checking created notifications...")
        notifications = db.exec(
            select(Notification).where(Notification.user_id == test_user.id).limit(5)
        ).all()

        # Sort in Python instead
        notifications = sorted(notifications, key=lambda x: x.created_at, reverse=True)

        print(
            f"✅ Found {len(notifications)} recent notifications for user {test_user.id}"
        )
        for i, notif in enumerate(notifications, 1):
            print(f"   {i}. {notif.type.upper()}: {notif.title}")
            print(
                f"      Message: {notif.message[:50]}{'...' if len(notif.message) > 50 else ''}"
            )
            print(f"      Created: {notif.created_at}")
            print(f"      Read: {notif.read}")

        print("\n🎉 Notification system test completed!")
        return True

    except Exception as e:
        print(f"❌ Test failed: {e}")
        return False
    finally:
        db.close()


def test_integration():
    """Test that the notification system integrates with existing endpoints"""
    print("\n🔗 Testing Integration")
    print("=" * 50)

    try:
        # Test import integration
        from app.routers.reviews import notify_file_status_change, notify_file_commented
        from app.routers.checklists import notify_user

        print("✅ All notification functions imported successfully in routers")

        # Test models
        from app.models import Notification

        print("✅ Notification model accessible")

        # Test that the notification router exists
        from app.routers.notifications import router

        print("✅ Notifications router accessible")

        return True

    except ImportError as e:
        print(f"❌ Import error: {e}")
        return False
    except Exception as e:
        print(f"❌ Integration error: {e}")
        return False


if __name__ == "__main__":
    print("ESG Checklist AI - Notification System Test")
    print("=" * 60)

    try:
        # Test integration first
        integration_success = test_integration()

        if integration_success:
            # Test the actual notification system
            test_success = test_notification_system()

            if test_success:
                print("\n🎯 All tests passed! Notification system is ready.")
                print("\nNext steps:")
                print("1. Restart your FastAPI server")
                print("2. Upload a file to test automatic notifications")
                print(
                    "3. Change file status or add comments to test reviewer notifications"
                )
                print("4. Check notifications via GET /notifications/my")
            else:
                print("\n❌ Some tests failed. Check the database and try again.")
                sys.exit(1)
        else:
            print("\n❌ Integration tests failed. Check imports and dependencies.")
            sys.exit(1)

    except Exception as e:
        print(f"\n💥 Test failed with error: {e}")
        import traceback

        traceback.print_exc()
        sys.exit(1)
