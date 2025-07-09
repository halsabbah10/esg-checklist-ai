import logging
import traceback

from fastapi import HTTPException
from sqlmodel import Session, SQLModel, create_engine, text, select

from . import models  # noqa: F401 - Import needed to register models with SQLModel
from .config import get_database_config, get_settings

logger = logging.getLogger(__name__)

# Get settings instance
settings = get_settings()
db_config = get_database_config()

# Enhanced engine configuration with centralized settings
engine = create_engine(
    db_config["url"],
    echo=db_config["echo"],
    pool_size=db_config["pool_size"],
    max_overflow=db_config["max_overflow"],
    pool_pre_ping=db_config["pool_pre_ping"],
    pool_recycle=db_config["pool_recycle"],
)

logger.info(f"Database engine configured with URL: {db_config['url']}")


def get_session():
    """Database session dependency with proper error handling"""
    try:
        with Session(engine) as session:
            yield session
    except HTTPException:
        # Re-raise FastAPI HTTPExceptions (like authentication errors)
        raise
    except Exception as e:
        logger.exception(f"Database session error: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Database error: {e!s}")


def get_db_health():
    """Check database connectivity for health checks"""
    try:
        with Session(engine) as session:
            session.execute(text("SELECT 1"))
            return True
    except Exception as e:
        logger.exception(f"Database health check failed: {e}")
        return False


def init_database():
    """Initialize database with proper error handling"""
    try:
        logger.info("Creating database tables...")
        SQLModel.metadata.create_all(engine)
        logger.info("Database tables created successfully")
        
        # Create default data
        create_default_data()
        
        return True
    except Exception as e:
        logger.exception(f"Failed to initialize database: {e}")
        raise


def create_default_data():
    """Create default data for the application"""
    try:
        from .models import User, Checklist, ChecklistItem
        
        with Session(engine) as session:
            # Check if we already have data
            existing_checklists = session.exec(select(Checklist)).first()
            if existing_checklists:
                logger.info("Default data already exists, skipping creation")
                return
            
            # Create default admin user if it doesn't exist
            admin_user = session.exec(select(User).where(User.email == "admin@esg-checklist.ai")).first()
            if not admin_user:
                from .auth import get_password_hash
                admin_user = User(
                    username="admin",
                    email="admin@esg-checklist.ai",
                    password_hash=get_password_hash("admin123"),
                    role="admin",
                    is_active=True
                )
                session.add(admin_user)
                session.commit()
                session.refresh(admin_user)
                logger.info("Default admin user created")
            
            # Create default checklist
            default_checklist = Checklist(
                title="Default ESG Checklist",
                description="A comprehensive ESG checklist for general compliance assessment",
                created_by=admin_user.id,
                is_active=True,
                version=1
            )
            session.add(default_checklist)
            session.commit()
            session.refresh(default_checklist)
            
            # Create default checklist items
            default_items = [
                {"question_text": "Does the organization have a documented environmental policy?", "category": "Environmental", "weight": 1.0},
                {"question_text": "Are carbon emissions monitored and reported?", "category": "Environmental", "weight": 1.0},
                {"question_text": "Is there a waste reduction program in place?", "category": "Environmental", "weight": 1.0},
                {"question_text": "Does the organization promote diversity and inclusion?", "category": "Social", "weight": 1.0},
                {"question_text": "Are health and safety protocols documented and followed?", "category": "Social", "weight": 1.0},
                {"question_text": "Is there a code of conduct for employees?", "category": "Social", "weight": 1.0},
                {"question_text": "Is there an independent board of directors?", "category": "Governance", "weight": 1.0},
                {"question_text": "Are financial statements audited by external auditors?", "category": "Governance", "weight": 1.0},
                {"question_text": "Is there a risk management framework in place?", "category": "Governance", "weight": 1.0},
            ]
            
            for i, item_data in enumerate(default_items):
                item = ChecklistItem(
                    checklist_id=default_checklist.id,
                    question_text=item_data["question_text"],
                    category=item_data["category"],
                    weight=item_data["weight"],
                    is_required=True,
                    order_index=i
                )
                session.add(item)
            
            session.commit()
            logger.info(f"Default checklist created with ID: {default_checklist.id}")
            
    except Exception as e:
        logger.exception(f"Failed to create default data: {e}")
        # Don't raise here, as this is optional setup
