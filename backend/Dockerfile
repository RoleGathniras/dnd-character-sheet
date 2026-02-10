FROM python:3.12-slim

WORKDIR /app

RUN pip install --no-cache-dir \
    fastapi \
    uvicorn[standard] \
    sqlmodel \
    psycopg[binary] \
    python-jose[cryptography] \
    passlib[argon2] \
    python-multipart





COPY app /app/app

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host=0.0.0.0", "--port=8000"]
