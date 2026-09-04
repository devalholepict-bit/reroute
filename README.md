# ReRoute — Payment-Failure Recovery Agent

A three-service architecture for intelligent payment failure recovery.

## Architecture

| Service | Tech | Port | Purpose |
|---------|------|------|---------|
| **client** | React + Vite + Tailwind | 5173 | Dashboard UI |
| **server** | Node.js + Express + Mongoose | 3001 | API gateway |
| **ml-service** | Python + Flask | 5001 | ML predictions |

## Prerequisites

- Node.js ≥ 18
- Python ≥ 3.9
- MongoDB (local or Atlas connection string)

## Quick Start

### 1. Clone & set up environment files

```bash
# Copy all .env.example files to .env and fill in values
cp server/.env.example server/.env
cp client/.env.example client/.env
cp ml-service/.env.example ml-service/.env
```

### 2. Start the server

```bash
cd server
npm install
npm run dev
```

### 3. Start the ML service

```bash
cd ml-service
python -m venv venv
# Windows: venv\Scripts\activate
# macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
python app.py
```

### 4. Start the client

```bash
cd client
npm install
npm run dev
```

### 5. Verify

Open [http://localhost:5173](http://localhost:5173) — all three status pills (Server, ML Service, Database) should turn **green**.

## API Endpoints

### Express Server

| Method | Endpoint | Response |
|--------|----------|----------|
| GET | `/api/health` | `{ status: "ok", db: "connected" \| "disconnected", timestamp }` |

### ML Service

| Method | Endpoint | Response |
|--------|----------|----------|
| GET | `/health` | `{ status: "ok" }` |
