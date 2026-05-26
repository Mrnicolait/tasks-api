from pydantic import BaseModel

# ── Resposta do login e do refresh: par de tokens ───────────────────
class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

# ── Body do POST /auth/refresh ──────────────────────────────────────
class RefreshRequest(BaseModel):
    refresh_token: str

# ── Payload interno do JWT (não exposto na API) ──────────────────────
class TokenData(BaseModel):
    username: str | None = None
