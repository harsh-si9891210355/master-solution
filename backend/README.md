# FastAPI Backend

Basic FastAPI authentication service with JWT and PostgreSQL.

## Project Structure

```bash
src/
  core/
  crud/
  db/
  middleware/
  models/
  routes/
  schemas/
  services/
  utils/
```

## Local Setup

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload
```

## Docker Setup

```bash
cp backend/.env.example backend/.env
docker compose up --build
```

## API Endpoints

- `POST /api/v1/auth/signup`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/forgot-password`
- `GET /api/v1/auth/me`
- `GET /health`
