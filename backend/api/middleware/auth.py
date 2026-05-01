"""
backend/api/middleware/auth.py — JWT Validation via Clerk JWKS
Memvalidasi JWT dari Clerk yang dikirim frontend di Authorization header.
"""
from fastapi import HTTPException, Security, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import httpx
import jwt
from jwt import PyJWKClient
from config import settings

security = HTTPBearer()

# Cache JWKS client agar tidak fetch setiap request
_jwks_client: PyJWKClient | None = None


def get_jwks_client() -> PyJWKClient:
    global _jwks_client
    if _jwks_client is None:
        _jwks_client = PyJWKClient(settings.CLERK_JWKS_URL)
    return _jwks_client


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(security)
) -> str:
    """
    Dependency: validasi JWT dari Clerk, return user_id (sub claim).

    Pakai di endpoint sebagai:
        user_id: str = Depends(get_current_user)

    Akan raise 401 jika:
    - Token tidak ada
    - Token expired
    - Token invalid signature
    """

    # Development bypass: jika APP_ENV = development dan token = "TEST_TOKEN"
    # Berguna untuk testing endpoint tanpa setup Clerk
    if settings.APP_ENV == "development" and credentials.credentials == "TEST_TOKEN":
        return "user_dev_test"

    try:
        token = credentials.credentials
        jwks_client = get_jwks_client()

        # Ambil signing key dari JWKS
        signing_key = jwks_client.get_signing_key_from_jwt(token)

        # Decode dan validasi JWT
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            options={"verify_aud": False},  # Clerk tidak selalu menyertakan aud
        )

        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token tidak mengandung user ID"
            )

        return user_id

    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token sudah kadaluarsa"
        )
    except jwt.InvalidTokenError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token tidak valid: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Autentikasi gagal: {str(e)}"
        )
