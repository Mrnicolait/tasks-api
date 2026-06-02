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

class User(BaseModel):
    username: str
    email: str | None = None
    full_name: str | None = None
    disabled: bool = False


class UserInDB(User):
    hashed_password: str

    model_config = {"from_attributes": True}
