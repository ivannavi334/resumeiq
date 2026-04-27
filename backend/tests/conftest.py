import os
import uuid as _uuid

# Must be set before any app imports so that pydantic-settings reads correct values.
# We point DATABASE_URL to a fake PostgreSQL URL — create_engine() is lazy and never
# actually connects; all tests use the SQLite in-memory engine via overridden get_db.
os.environ.setdefault("DATABASE_URL", "postgresql://test:test@localhost:5432/testdb")
os.environ.setdefault("SECRET_KEY", "test-secret-key-for-testing-purposes-only-32ch")
os.environ.setdefault("STRIPE_SECRET_KEY", "sk_test_fake_key_for_testing")
os.environ.setdefault("STRIPE_WEBHOOK_SECRET", "whsec_test_fake_webhook_secret")
os.environ.setdefault("STRIPE_PRICE_ID_PRO", "price_pro_test")
os.environ.setdefault("STRIPE_PRICE_ID_ENTERPRISE", "price_enterprise_test")
os.environ.setdefault("FRONTEND_URL", "http://localhost:5173")

# ---------------------------------------------------------------------------
# Patch postgresql.UUID so it works transparently with SQLite.
# By default, UUID(as_uuid=True) calls .hex on Python uuid.UUID objects which
# fails when the application passes plain strings (e.g. from JWT "sub" claims).
# ---------------------------------------------------------------------------
from sqlalchemy.dialects.postgresql import UUID as _PG_UUID  # noqa: E402

_orig_bind = _PG_UUID.bind_processor
_orig_result = _PG_UUID.result_processor


def _sqlite_bind_processor(self, dialect):
    if dialect.name == "sqlite":
        def process(value):
            if value is None:
                return value
            return str(value)  # store as plain UUID string
        return process
    return _orig_bind(self, dialect)


def _sqlite_result_processor(self, dialect, coltype):
    if dialect.name == "sqlite" and self.as_uuid:
        def process(value):
            if value is None:
                return value
            if isinstance(value, _uuid.UUID):
                return value
            return _uuid.UUID(str(value))
        return process
    return _orig_result(self, dialect, coltype)


_PG_UUID.bind_processor = _sqlite_bind_processor
_PG_UUID.result_processor = _sqlite_result_processor

import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.models.user import User, UserPlan
from app.models.resume import Resume, ResumeAnalysis, ResumeStatus  # noqa: F401 — registers models
from app.utils.security import hash_password, create_access_token

# ---------------------------------------------------------------------------
# Test database — SQLite in-memory, single shared connection via StaticPool
# ---------------------------------------------------------------------------
SQLALCHEMY_TEST_URL = "sqlite://"

test_engine = create_engine(
    SQLALCHEMY_TEST_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(autouse=True)
def setup_db():
    """Create all tables before each test, drop them after."""
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def db():
    database = TestingSessionLocal()
    try:
        yield database
    finally:
        database.close()


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def test_user(db):
    user = User(
        email="testuser@example.com",
        hashed_password=hash_password("testpassword123"),
        full_name="Test User",
        is_active=True,
        is_verified=True,
        plan=UserPlan.FREE,
        analyses_used_this_month=0,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def inactive_user(db):
    user = User(
        email="inactive@example.com",
        hashed_password=hash_password("testpassword123"),
        full_name="Inactive User",
        is_active=False,
        plan=UserPlan.FREE,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def pro_user(db):
    user = User(
        email="prouser@example.com",
        hashed_password=hash_password("testpassword123"),
        full_name="Pro User",
        is_active=True,
        is_verified=True,
        plan=UserPlan.PRO,
        analyses_used_this_month=0,
        stripe_customer_id="cus_test_customer",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def quota_exhausted_user(db):
    """Free user who has used all 3 monthly analyses."""
    user = User(
        email="exhausted@example.com",
        hashed_password=hash_password("testpassword123"),
        is_active=True,
        plan=UserPlan.FREE,
        analyses_used_this_month=3,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def auth_headers(test_user):
    token = create_access_token({"sub": str(test_user.id)})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def pro_auth_headers(pro_user):
    token = create_access_token({"sub": str(pro_user.id)})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def exhausted_auth_headers(quota_exhausted_user):
    token = create_access_token({"sub": str(quota_exhausted_user.id)})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def test_resume(db, test_user):
    resume = Resume(
        owner_id=test_user.id,
        filename="abc123.pdf",
        original_filename="My Resume.pdf",
        file_url="uploads/test/abc123.pdf",
        file_size=0.5,
        extracted_text="John Doe\nSoftware Engineer\nPython, FastAPI, SQL, REST API",
    )
    db.add(resume)
    db.commit()
    db.refresh(resume)
    return resume
