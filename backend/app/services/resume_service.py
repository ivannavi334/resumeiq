import json
import uuid
from datetime import datetime, timezone, timedelta
from pathlib import Path
from sqlalchemy.orm import Session
from fastapi import HTTPException, UploadFile, status
import pdfplumber
from openai import OpenAI
from app.config import settings
from app.models.resume import Resume, ResumeAnalysis, ResumeStatus
from app.models.user import User, UserPlan

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

PLAN_LIMITS = {
    UserPlan.FREE: settings.FREE_PLAN_ANALYSES_PER_MONTH,
    UserPlan.PRO: settings.PRO_PLAN_ANALYSES_PER_MONTH,
    UserPlan.ENTERPRISE: settings.ENTERPRISE_PLAN_ANALYSES_PER_MONTH,
}

ALLOWED_EXTENSIONS = {".pdf", ".doc", ".docx", ".txt"}
MAX_FILE_SIZE_MB = 10


def check_analysis_quota(user: User, db: Session) -> None:
    now = datetime.now(timezone.utc)
    reset_at = user.analyses_reset_at
    if reset_at is not None and reset_at.tzinfo is None:
        reset_at = reset_at.replace(tzinfo=timezone.utc)
    if reset_at is None or now - reset_at >= timedelta(days=30):
        user.analyses_used_this_month = 0
        user.analyses_reset_at = now
        db.commit()
    limit = PLAN_LIMITS.get(user.plan, 3)
    if user.analyses_used_this_month >= limit:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=f"Monthly analysis limit reached ({limit}). Please upgrade your plan.",
        )


async def save_resume_file(file: UploadFile, user_id: str) -> tuple[str, str, float]:
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"File type {ext} not supported")
    unique_name = f"{uuid.uuid4()}{ext}"
    file_path = UPLOAD_DIR / user_id / unique_name
    file_path.parent.mkdir(parents=True, exist_ok=True)
    content = await file.read()
    size_mb = len(content) / (1024 * 1024)
    if size_mb > MAX_FILE_SIZE_MB:
        raise HTTPException(status_code=400, detail=f"File too large. Max size: {MAX_FILE_SIZE_MB}MB")
    file_path.write_bytes(content)
    return unique_name, str(file_path), size_mb


def extract_text_from_pdf(file_path: str) -> str:
    try:
        with pdfplumber.open(file_path) as pdf:
            return "\n".join(page.extract_text() or "" for page in pdf.pages)
    except Exception:
        return ""


def extract_text_from_docx(file_path: str) -> str:
    try:
        from docx import Document
        doc = Document(file_path)
        return "\n".join(p.text for p in doc.paragraphs if p.text.strip())
    except Exception:
        return ""


def extract_resume_text(file_path: str, filename: str) -> str:
    ext = Path(filename).suffix.lower()
    if ext == ".pdf":
        return extract_text_from_pdf(file_path)
    elif ext in (".docx", ".doc"):
        return extract_text_from_docx(file_path)
    elif ext == ".txt":
        return Path(file_path).read_text(encoding="utf-8", errors="ignore")
    return ""


def analyze_resume_with_ai(resume_text: str, job_description: str | None) -> dict:
    if not settings.OPENAI_API_KEY:
        return _mock_analysis()
    client = OpenAI(api_key=settings.OPENAI_API_KEY)
    prompt = _build_analysis_prompt(resume_text, job_description)
    response = client.chat.completions.create(
        model=settings.OPENAI_MODEL,
        messages=[
            {"role": "system", "content": "You are an expert resume reviewer and ATS specialist. Respond only with valid JSON."},
            {"role": "user", "content": prompt},
        ],
        max_tokens=settings.OPENAI_MAX_TOKENS,
        response_format={"type": "json_object"},
    )
    return json.loads(response.choices[0].message.content)


def _build_analysis_prompt(resume_text: str, job_description: str | None) -> str:
    jd_section = f"\n\nJob Description:\n{job_description}" if job_description else ""
    return f"""Analyze the following resume{' against the provided job description' if job_description else ''} and return a JSON with this exact structure:
{{
  "overall_score": <0-100>,
  "ats_score": <0-100>,
  "skills_match_score": <0-100>,
  "experience_score": <0-100>,
  "format_score": <0-100>,
  "strengths": ["strength1", "strength2", ...],
  "weaknesses": ["weakness1", "weakness2", ...],
  "suggestions": [{{"category": "...", "suggestion": "...", "priority": "high|medium|low"}}],
  "keywords_found": ["keyword1", ...],
  "keywords_missing": ["keyword1", ...],
  "ai_summary": "2-3 sentence overall assessment"
}}

Resume:
{resume_text[:6000]}{jd_section}"""


def _mock_analysis() -> dict:
    return {
        "overall_score": 72.0,
        "ats_score": 68.0,
        "skills_match_score": 75.0,
        "experience_score": 80.0,
        "format_score": 65.0,
        "strengths": ["Clear work history", "Relevant skills listed", "Good use of action verbs"],
        "weaknesses": ["Missing quantifiable achievements", "No summary section", "Inconsistent formatting"],
        "suggestions": [
            {"category": "Content", "suggestion": "Add measurable achievements (e.g. 'increased sales by 30%')", "priority": "high"},
            {"category": "Format", "suggestion": "Add a professional summary at the top", "priority": "high"},
            {"category": "Keywords", "suggestion": "Include more industry-specific keywords", "priority": "medium"},
        ],
        "keywords_found": ["Python", "FastAPI", "SQL", "REST API"],
        "keywords_missing": ["Docker", "Kubernetes", "CI/CD", "Agile"],
        "ai_summary": "This resume demonstrates solid technical experience but lacks quantifiable achievements. Adding metrics and a professional summary would significantly improve its impact.",
    }


def create_resume(db: Session, user: User, filename: str, original_filename: str, file_path: str, file_size: float) -> Resume:
    text = extract_resume_text(file_path, original_filename)
    resume = Resume(
        owner_id=user.id,
        filename=filename,
        original_filename=original_filename,
        file_url=file_path,
        file_size=file_size,
        extracted_text=text,
    )
    db.add(resume)
    db.commit()
    db.refresh(resume)
    return resume


def create_analysis(db: Session, user: User, resume: Resume, job_description: str | None) -> ResumeAnalysis:
    check_analysis_quota(user, db)
    analysis = ResumeAnalysis(resume_id=resume.id, job_description=job_description, status=ResumeStatus.PROCESSING)
    db.add(analysis)
    db.commit()
    try:
        result = analyze_resume_with_ai(resume.extracted_text or "", job_description)
        analysis.overall_score = result.get("overall_score")
        analysis.ats_score = result.get("ats_score")
        analysis.skills_match_score = result.get("skills_match_score")
        analysis.experience_score = result.get("experience_score")
        analysis.format_score = result.get("format_score")
        analysis.strengths = result.get("strengths", [])
        analysis.weaknesses = result.get("weaknesses", [])
        analysis.suggestions = result.get("suggestions", [])
        analysis.keywords_found = result.get("keywords_found", [])
        analysis.keywords_missing = result.get("keywords_missing", [])
        analysis.ai_summary = result.get("ai_summary")
        analysis.raw_ai_response = result
        analysis.status = ResumeStatus.COMPLETED
        user.analyses_used_this_month += 1
    except Exception as e:
        analysis.status = ResumeStatus.FAILED
        analysis.error_message = str(e)
    db.commit()
    db.refresh(analysis)
    return analysis
