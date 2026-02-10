from fastapi import FastAPI
from app.db import init_db

app = FastAPI(title="DnD Character Sheet API")


@app.on_event("startup")
def on_startup():
    init_db()


@app.get("/health")
def health():
    return {"status": "ok"}
