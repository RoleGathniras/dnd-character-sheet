from fastapi import FastAPI
from app.db import init_db
from app.api.auth import router as auth_router
from app.api.dev import router as dev_router
from app.api.users import router as users_router
from app.api.characters import router as characters_router
app = FastAPI(title="DnD Character Sheet API")


@app.on_event("startup")
def on_startup():
    init_db()


@app.get("/health")
def health():
    return {"status": "ok"}

app.include_router(auth_router)
app.include_router(dev_router)
app.include_router(users_router)
app.include_router(characters_router)