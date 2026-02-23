from fastapi import FastAPI
from app.db import init_db
from app.api.auth import router as auth_router
from app.api.dev import router as dev_router
from app.api.users import router as users_router
from app.api.characters import router as characters_router
import os
from fastapi.middleware.cors import CORSMiddleware
from app.seed_dev import seed_dev_users

app = FastAPI(title="DnD Character Sheet API")

cors_origins = os.getenv("BACKEND_CORS_ORIGINS", "http://localhost:8080").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in cors_origins if o.strip()],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)



@app.on_event("startup")
def on_startup():
    init_db()
    created = seed_dev_users()
    print(f"[seed] SEED_ENABLED={os.getenv('SEED_ENABLED')} created={created}")



@app.get("/health")
def health():
    return {"status": "ok"}

app.include_router(auth_router)
app.include_router(dev_router)
app.include_router(users_router)
app.include_router(characters_router)