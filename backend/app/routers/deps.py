from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.services.auth_service import get_user_by_id, get_user_by_email
from app.utils.security import decode_token, decode_supabase_token
import uuid

bearer_scheme = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    token = credentials.credentials

    # Try legacy FastAPI JWT first
    payload = decode_token(token)
    if payload and payload.get("type") == "access":
        user = get_user_by_id(db, payload["sub"])
        if not user or not user.is_active:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
        return user

    # Try Supabase JWT
    payload = decode_supabase_token(token)
    if payload:
        supabase_uid = payload.get("sub")
        email = payload.get("email")
        if not supabase_uid or not email:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token claims")

        # Look up by Supabase UUID
        user = get_user_by_id(db, supabase_uid)
        if user:
            if not user.is_active:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User inactive")
            return user

        # Auto-create user record for Supabase user
        user = get_user_by_email(db, email)
        if not user:
            user = User(
                id=uuid.UUID(supabase_uid),
                email=email,
                full_name=payload.get("user_metadata", {}).get("full_name"),
                is_active=True,
                is_verified=True,
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        return user

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
        headers={"WWW-Authenticate": "Bearer"},
    )
