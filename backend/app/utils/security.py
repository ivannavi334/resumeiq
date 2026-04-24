from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from app.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_refresh_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        return None


_jwks_cache: dict = {}


def _get_supabase_jwks() -> list:
    import httpx, time
    cache = _jwks_cache
    if cache.get("expires_at", 0) > time.time():
        return cache["keys"]
    url = f"{settings.SUPABASE_URL}/auth/v1/.well-known/jwks.json"
    resp = httpx.get(url, timeout=10)
    resp.raise_for_status()
    keys = resp.json().get("keys", [])
    cache["keys"] = keys
    cache["expires_at"] = time.time() + 3600
    return keys


def decode_supabase_token(token: str) -> Optional[dict]:
    import logging, base64
    try:
        header = jwt.get_unverified_header(token)
    except JWTError as e:
        logging.warning(f"Could not parse JWT header: {e}")
        return None

    alg = header.get("alg", "RS256")
    kid = header.get("kid")

    # HS256 legacy path
    if alg == "HS256" and settings.SUPABASE_JWT_SECRET:
        secret = settings.SUPABASE_JWT_SECRET
        for key in [base64.b64decode(secret), secret.encode()]:
            try:
                payload = jwt.decode(token, key, algorithms=["HS256"], options={"verify_aud": False})
                aud = payload.get("aud")
                if aud in ("authenticated", ["authenticated"]):
                    return payload
            except JWTError:
                continue
        logging.warning("Supabase HS256 token verification failed")
        return None

    # RS256 / ES256 — use JWKS
    if not settings.SUPABASE_URL:
        logging.warning("SUPABASE_URL not set, cannot fetch JWKS")
        return None
    try:
        keys = _get_supabase_jwks()
    except Exception as e:
        logging.warning(f"Failed to fetch Supabase JWKS: {e}")
        return None

    matching_keys = [k for k in keys if not kid or k.get("kid") == kid]
    if not matching_keys:
        matching_keys = keys

    for jwk_key in matching_keys:
        try:
            payload = jwt.decode(token, jwk_key, algorithms=[alg], options={"verify_aud": False})
            aud = payload.get("aud")
            if aud in ("authenticated", ["authenticated"]):
                return payload
        except JWTError as e:
            logging.warning(f"JWKS key verification failed: {e}")
            continue

    return None
