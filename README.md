# PatientTriage.AI

AI-Powered Emergency Department Command Center (Hackathon Prototype).

> WARNING: PatientTriage.ai is a clinical decision-support prototype using **simulated data**. It does not diagnose, prescribe treatment, or replace qualified clinical judgment.

## Architecture

- **Frontend**: React + Vite + TypeScript + Tailwind + Recharts + TanStack Query
- **Backend**: Node.js + Express + TypeScript + Supabase JS
- **Database**: PostgreSQL (Supabase)
- **ML Service**: Python + FastAPI + XGBoost
- **AI Explanation**: OpenAI (optional) with deterministic fallback

## Setup

### 1. Supabase
1. Create a new Supabase project at https://supabase.com
2. In SQL Editor, paste and run `database/migrations/001_schema.sql`
3. Copy your Project URL, anon key, and service role key

### 2. Environment
Copy `.env.example` to `.env` in project root and fill in Supabase values.

Frontend uses `frontend/.env` with `VITE_API_URL=http://localhost:4000/api`

### 3. Install & Run

**ML Service:**
cd ml-service
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python training\train.py
uvicorn app.main:app --reload --port 8000

**Backend:**
cd backend
npm install
npm run seed
npm run dev

**Frontend:**
cd frontend
npm install
npm run dev

Open http://localhost:5173

## Demo Accounts (password: `demo1234`)
- nurse@demo.com
- doctor@demo.com
- admin@demo.com

## Tests
- Backend: `cd backend && npm test`
- ML: `cd ml-service && pytest`

## Demo Flow
1. Login as nurse - see 20 seeded patients
2. Open Command Center, review KPIs and charts
3. Open a patient - see AI risk, confidence, explanation, key factors
4. Click Reassess or wait for simulation to trigger deterioration
5. Login as doctor - Accept / Modify / Override recommendations
6. Open Audit Logs to see full history
7. Open Simulation Center - click SIMULATE 3x SURGE
8. Watch queue growth, alerts, and analytics update live

## Known Limitations
- ML model trained on synthetic data (labeled prototype)
- Not clinically validated
- Simulated patients only
- LLM optional; falls back to deterministic template
