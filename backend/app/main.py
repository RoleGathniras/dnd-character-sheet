from fastapi import FastAPI

app = FastAPI(title="DnD Character Sheet API")


@app.get("/health")
def health():
    return {"status": "ok"}
