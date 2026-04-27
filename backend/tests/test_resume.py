"""
Tests for /api/v1/resumes/* endpoints (resume upload, listing, analysis, quota).

OpenAI is not called because OPENAI_API_KEY is empty in the test environment —
resume_service falls through to _mock_analysis() automatically.
File I/O is kept minimal: we pass a tiny byte payload and let pdfplumber fail
gracefully (it returns "" on any exception, which is fine for analysis tests).
"""
import io
import uuid
import pytest
from unittest.mock import patch, AsyncMock, MagicMock

from app.models.resume import Resume, ResumeAnalysis, ResumeStatus
from app.models.user import UserPlan


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

TINY_PDF = b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\nxref\n0 0\ntrailer\n<< >>\n%%EOF"
TINY_DOCX = b"PK\x03\x04"  # just a valid-looking DOCX header (zip magic bytes)


def pdf_file(name="resume.pdf"):
    return ("file", (name, io.BytesIO(TINY_PDF), "application/pdf"))


def txt_file(content=b"John Doe\nSoftware Engineer\nPython FastAPI", name="resume.txt"):
    return ("file", (name, io.BytesIO(content), "text/plain"))


# ---------------------------------------------------------------------------
# POST /api/v1/resumes/upload
# ---------------------------------------------------------------------------

def test_upload_resume_txt_success(client, auth_headers):
    with patch("app.services.resume_service.UPLOAD_DIR") as mock_dir:
        mock_path = MagicMock()
        mock_path.__truediv__ = lambda self, other: mock_path
        mock_path.parent.mkdir = MagicMock()
        mock_path.write_bytes = MagicMock()
        mock_dir.__truediv__ = lambda self, other: mock_path
        mock_dir.mkdir = MagicMock()

        with patch("app.services.resume_service.extract_resume_text", return_value="John Doe Python"):
            response = client.post(
                "/api/v1/resumes/upload",
                files=[txt_file()],
                headers=auth_headers,
            )

    assert response.status_code == 201
    data = response.json()
    assert data["original_filename"] == "resume.txt"
    assert "id" in data


def test_upload_resume_pdf_success(client, auth_headers):
    with patch("app.services.resume_service.extract_resume_text", return_value=""):
        with patch("app.services.resume_service.UPLOAD_DIR") as mock_dir:
            mock_path = MagicMock()
            mock_path.__truediv__ = lambda self, other: mock_path
            mock_path.parent.mkdir = MagicMock()
            mock_path.write_bytes = MagicMock()
            mock_dir.__truediv__ = lambda self, other: mock_path

            response = client.post(
                "/api/v1/resumes/upload",
                files=[pdf_file()],
                headers=auth_headers,
            )

    assert response.status_code == 201
    assert response.json()["original_filename"] == "resume.pdf"


def test_upload_resume_unsupported_type(client, auth_headers):
    bad_file = ("file", ("resume.exe", io.BytesIO(b"MZ"), "application/octet-stream"))
    response = client.post(
        "/api/v1/resumes/upload",
        files=[bad_file],
        headers=auth_headers,
    )
    assert response.status_code == 400
    assert "not supported" in response.json()["detail"]


def test_upload_resume_too_large(client, auth_headers):
    big_content = b"x" * (11 * 1024 * 1024)  # 11 MB
    big_file = ("file", ("big.txt", io.BytesIO(big_content), "text/plain"))
    response = client.post(
        "/api/v1/resumes/upload",
        files=[big_file],
        headers=auth_headers,
    )
    assert response.status_code == 400
    assert "too large" in response.json()["detail"].lower()


def test_upload_resume_unauthenticated(client):
    response = client.post("/api/v1/resumes/upload", files=[txt_file()])
    assert response.status_code == 403


# ---------------------------------------------------------------------------
# GET /api/v1/resumes/
# ---------------------------------------------------------------------------

def test_list_resumes_empty(client, auth_headers):
    response = client.get("/api/v1/resumes/", headers=auth_headers)
    assert response.status_code == 200
    assert response.json() == []


def test_list_resumes_returns_own_only(client, auth_headers, test_resume):
    response = client.get("/api/v1/resumes/", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["id"] == str(test_resume.id)


def test_list_resumes_pagination(client, auth_headers, db, test_user):
    for i in range(5):
        db.add(Resume(
            owner_id=test_user.id,
            filename=f"resume_{i}.txt",
            original_filename=f"Resume {i}.txt",
            file_size=0.1,
        ))
    db.commit()

    response = client.get("/api/v1/resumes/?limit=3", headers=auth_headers)
    assert response.status_code == 200
    assert len(response.json()) == 3


# ---------------------------------------------------------------------------
# GET /api/v1/resumes/{resume_id}
# ---------------------------------------------------------------------------

def test_get_resume_success(client, auth_headers, test_resume):
    response = client.get(f"/api/v1/resumes/{test_resume.id}", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["original_filename"] == "My Resume.pdf"


def test_get_resume_not_found(client, auth_headers):
    fake_id = str(uuid.uuid4())
    response = client.get(f"/api/v1/resumes/{fake_id}", headers=auth_headers)
    assert response.status_code == 404


def test_get_resume_other_user(client, pro_auth_headers, test_resume):
    # pro_user must not see test_user's resume
    response = client.get(f"/api/v1/resumes/{test_resume.id}", headers=pro_auth_headers)
    assert response.status_code == 404


# ---------------------------------------------------------------------------
# DELETE /api/v1/resumes/{resume_id}
# ---------------------------------------------------------------------------

def test_delete_resume_success(client, auth_headers, test_resume, db):
    response = client.delete(f"/api/v1/resumes/{test_resume.id}", headers=auth_headers)
    assert response.status_code == 204
    assert db.query(Resume).filter(Resume.id == test_resume.id).first() is None


def test_delete_resume_not_found(client, auth_headers):
    response = client.delete(f"/api/v1/resumes/{uuid.uuid4()}", headers=auth_headers)
    assert response.status_code == 404


# ---------------------------------------------------------------------------
# POST /api/v1/resumes/{resume_id}/analyze
# ---------------------------------------------------------------------------

def test_analyze_resume_success(client, auth_headers, test_resume, db, test_user):
    # OPENAI_API_KEY is empty — service uses _mock_analysis() which returns
    # a hardcoded score dict without calling any external API.
    response = client.post(
        f"/api/v1/resumes/{test_resume.id}/analyze",
        json={"job_description": None},
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "completed"
    assert data["overall_score"] is not None
    assert data["ats_score"] is not None
    assert isinstance(data["strengths"], list)
    assert isinstance(data["suggestions"], list)


def test_analyze_resume_with_job_description(client, auth_headers, test_resume):
    response = client.post(
        f"/api/v1/resumes/{test_resume.id}/analyze",
        json={"job_description": "We need a Python backend engineer with FastAPI experience."},
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert response.json()["status"] == "completed"


def test_analyze_resume_not_found(client, auth_headers):
    response = client.post(
        f"/api/v1/resumes/{uuid.uuid4()}/analyze",
        json={"job_description": None},
        headers=auth_headers,
    )
    assert response.status_code == 404


def test_analyze_quota_exceeded(client, exhausted_auth_headers, db, quota_exhausted_user):
    # Create a resume for the exhausted user
    resume = Resume(
        owner_id=quota_exhausted_user.id,
        filename="resume.txt",
        original_filename="resume.txt",
        file_size=0.1,
        extracted_text="Some text",
    )
    db.add(resume)
    db.commit()
    db.refresh(resume)

    response = client.post(
        f"/api/v1/resumes/{resume.id}/analyze",
        json={"job_description": None},
        headers=exhausted_auth_headers,
    )
    assert response.status_code == 402
    assert "limit" in response.json()["detail"].lower()


# ---------------------------------------------------------------------------
# GET /api/v1/resumes/{resume_id}/analyses
# ---------------------------------------------------------------------------

def test_list_analyses_empty(client, auth_headers, test_resume):
    response = client.get(f"/api/v1/resumes/{test_resume.id}/analyses", headers=auth_headers)
    assert response.status_code == 200
    assert response.json() == []


def test_list_analyses_returns_results(client, auth_headers, test_resume, db):
    analysis = ResumeAnalysis(
        resume_id=test_resume.id,
        status=ResumeStatus.COMPLETED,
        overall_score=75.0,
        ats_score=70.0,
    )
    db.add(analysis)
    db.commit()

    response = client.get(f"/api/v1/resumes/{test_resume.id}/analyses", headers=auth_headers)
    assert response.status_code == 200
    assert len(response.json()) == 1
    assert response.json()[0]["overall_score"] == 75.0
