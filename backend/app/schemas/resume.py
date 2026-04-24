from pydantic import BaseModel, UUID4
from typing import Optional, List, Dict, Any
from datetime import datetime
from app.models.resume import ResumeStatus


class ResumeRead(BaseModel):
    id: UUID4
    filename: str
    original_filename: str
    file_url: Optional[str]
    file_size: Optional[float]
    created_at: datetime

    class Config:
        from_attributes = True


class AnalysisRequest(BaseModel):
    job_description: Optional[str] = None


class ResumeAnalysisRead(BaseModel):
    id: UUID4
    resume_id: UUID4
    job_description: Optional[str]
    status: ResumeStatus
    overall_score: Optional[float]
    ats_score: Optional[float]
    skills_match_score: Optional[float]
    experience_score: Optional[float]
    format_score: Optional[float]
    strengths: Optional[List[str]]
    weaknesses: Optional[List[str]]
    suggestions: Optional[List[Dict[str, Any]]]
    keywords_found: Optional[List[str]]
    keywords_missing: Optional[List[str]]
    ai_summary: Optional[str]
    error_message: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True
