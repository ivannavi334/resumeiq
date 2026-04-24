from sqlalchemy import Column, String, Text, Float, DateTime, ForeignKey, JSON, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
import enum
from app.database import Base


class ResumeStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class Resume(Base):
    __tablename__ = "resumes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    file_url = Column(String(512), nullable=True)
    file_size = Column(Float, nullable=True)
    extracted_text = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    owner = relationship("User", back_populates="resumes")
    analyses = relationship("ResumeAnalysis", back_populates="resume", cascade="all, delete-orphan")


class ResumeAnalysis(Base):
    __tablename__ = "resume_analyses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    resume_id = Column(UUID(as_uuid=True), ForeignKey("resumes.id"), nullable=False)
    job_description = Column(Text, nullable=True)
    status = Column(SAEnum(ResumeStatus), default=ResumeStatus.PENDING, nullable=False)
    overall_score = Column(Float, nullable=True)
    ats_score = Column(Float, nullable=True)
    skills_match_score = Column(Float, nullable=True)
    experience_score = Column(Float, nullable=True)
    format_score = Column(Float, nullable=True)
    strengths = Column(JSON, nullable=True)
    weaknesses = Column(JSON, nullable=True)
    suggestions = Column(JSON, nullable=True)
    keywords_found = Column(JSON, nullable=True)
    keywords_missing = Column(JSON, nullable=True)
    ai_summary = Column(Text, nullable=True)
    raw_ai_response = Column(JSON, nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    resume = relationship("Resume", back_populates="analyses")
