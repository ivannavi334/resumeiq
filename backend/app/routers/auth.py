from fastapi import APIRouter, Depends, Body
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.user import UserCreate, UserRead, Token, PasswordChange
from app.services import auth_service
from app.routers.deps import get_current_user
from app.models.user import User
from app.utils.security import hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserRead, status_code=201)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    return auth_service.create_user(db, user_data)


@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = auth_service.authenticate_user(db, form_data.username, form_data.password)
    return auth_service.generate_tokens(user)


@router.post("/refresh", response_model=Token)
def refresh(refresh_token: str = Body(..., embed=True), db: Session = Depends(get_db)):
    return auth_service.refresh_access_token(db, refresh_token)


@router.get("/me", response_model=UserRead)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/change-password", status_code=204)
def change_password(
    data: PasswordChange,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(data.current_password, current_user.hashed_password):
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Incorrect current password")
    current_user.hashed_password = hash_password(data.new_password)
    db.commit()
