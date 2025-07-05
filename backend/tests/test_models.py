"""
Unit tests for core application models.
Tests the SQLModel definitions and basic model functionality.
"""

from datetime import datetime

from app.models import Checklist, ChecklistItem, Comment, FileUpload, User


class TestUserModel:
    """Test User model functionality."""

    def test_user_creation(self):
        """Test creating a user with required fields."""
        user = User(
            username="testuser",
            email="test@example.com",
            password_hash="hashed_password",
            role="auditor",
            is_active=True,
        )

        assert user.username == "testuser"
        assert user.email == "test@example.com"
        assert user.role == "auditor"
        assert user.is_active is True
        assert isinstance(user.created_at, datetime)

    def test_user_defaults(self):
        """Test user model default values."""
        user = User(
            username="testuser2",
            email="test2@example.com",
            password_hash="hashed_password",
            role="admin",
        )

        assert user.is_active is True  # Default value
        assert user.last_login is None  # Default value
        assert user.created_at is not None


class TestChecklistModel:
    """Test Checklist model functionality."""

    def test_checklist_creation(self):
        """Test creating a checklist with required fields."""
        checklist = Checklist(
            title="ESG Compliance Checklist",
            description="Annual ESG compliance review",
            created_by=1,
            is_active=True,
            version=1,
        )

        assert checklist.title == "ESG Compliance Checklist"
        assert checklist.description == "Annual ESG compliance review"
        assert checklist.created_by == 1
        assert checklist.is_active is True
        assert checklist.version == 1

    def test_checklist_defaults(self):
        """Test checklist model default values."""
        checklist = Checklist(title="Test Checklist", created_by=1)

        assert checklist.is_active is True  # Default value
        assert checklist.version == 1  # Default value
        assert checklist.description is None  # Default value


class TestChecklistItemModel:
    """Test ChecklistItem model functionality."""

    def test_checklist_item_creation(self):
        """Test creating a checklist item."""
        item = ChecklistItem(
            checklist_id=1,
            question_text="Do you have an environmental policy?",
            weight=2.0,
            category="Environmental",
            is_required=True,
            order_index=1,
        )

        assert item.checklist_id == 1
        assert item.question_text == "Do you have an environmental policy?"
        assert item.weight == 2.0
        assert item.category == "Environmental"
        assert item.is_required is True
        assert item.order_index == 1

    def test_checklist_item_defaults(self):
        """Test checklist item default values."""
        item = ChecklistItem(checklist_id=1, question_text="Test question")

        assert item.weight == 1.0  # Default value
        assert item.is_required is True  # Default value
        assert item.order_index == 0  # Default value
        assert item.category is None  # Default value


class TestFileUploadModel:
    """Test FileUpload model functionality."""

    def test_file_upload_creation(self):
        """Test creating a file upload record."""
        upload = FileUpload(
            checklist_id=1,
            user_id=1,
            filename="sustainability_report.pdf",
            filepath="/uploads/sustainability_report.pdf",
            file_size=1024000,
            file_type="application/pdf",
            processing_status="completed",
            status="approved",
        )

        assert upload.checklist_id == 1
        assert upload.user_id == 1
        assert upload.filename == "sustainability_report.pdf"
        assert upload.filepath == "/uploads/sustainability_report.pdf"
        assert upload.file_size == 1024000
        assert upload.file_type == "application/pdf"
        assert upload.processing_status == "completed"
        assert upload.status == "approved"

    def test_file_upload_defaults(self):
        """Test file upload default values."""
        upload = FileUpload(
            checklist_id=1, user_id=1, filename="test.pdf", filepath="/uploads/test.pdf"
        )

        assert upload.processing_status == "pending"  # Default value
        assert upload.status == "pending"  # Default value
        assert upload.file_size is None  # Default value
        assert upload.file_type is None  # Default value
        assert isinstance(upload.uploaded_at, datetime)


class TestCommentModel:
    """Test Comment model functionality."""

    def test_comment_creation(self):
        """Test creating a comment."""
        comment = Comment(user_id=1, file_upload_id=1, text="This document looks good, approved.")

        assert comment.user_id == 1
        assert comment.file_upload_id == 1
        assert comment.text == "This document looks good, approved."
        assert isinstance(comment.created_at, datetime)
