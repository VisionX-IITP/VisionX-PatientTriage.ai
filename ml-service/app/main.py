from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .schemas import PredictRequest, PredictResponse
import os, joblib, numpy as np

app = FastAPI(title="PatientTriage ML Service", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

MODEL_PATH = os.path.join(os.path.dirname(__file__), "models", "triage_xgb_v1.joblib")
MODEL_VERSION = "xgb-v1-prototype"
model = None

def load_model():
    global model
    if os.path.exists(MODEL_PATH):
        try:
            model = joblib.load(MODEL_PATH)
            print(f"Loaded model from {MODEL_PATH}")
        except Exception as e:
            print(f"Model load failed: {e}")
            model = None
    else:
        print(f"No model at {MODEL_PATH}, using rule fallback")

load_model()

def build_features(r: PredictRequest):
    shock_index = r.heart_rate / max(r.systolic_bp, 1)
    age_risk = 1 if r.age >= 65 or r.age <= 5 else 0
    resp_stress = 1 if r.respiratory_rate > 22 or r.spo2 < 94 else 0
    vital_instab = int(r.heart_rate > 110 or r.systolic_bp < 100 or r.spo2 < 92)
    return np.array([[r.age, r.heart_rate, r.systolic_bp, r.diastolic_bp, r.spo2,
                      r.respiratory_rate, r.temperature, r.pain_score, r.waiting_minutes,
                      shock_index, age_risk, resp_stress, vital_instab]])

def rule_based_risk(r: PredictRequest):
    score = 0.0
    if r.spo2 < 90: score += 0.35
    elif r.spo2 < 94: score += 0.15
    if r.respiratory_rate > 24: score += 0.20
    elif r.respiratory_rate > 20: score += 0.08
    if r.heart_rate > 120 or r.heart_rate < 50: score += 0.20
    elif r.heart_rate > 100: score += 0.08
    if r.systolic_bp < 90: score += 0.25
    elif r.systolic_bp < 100: score += 0.10
    if r.temperature >= 39.5 or r.temperature <= 35.0: score += 0.15
    if r.age >= 75 or r.age <= 2: score += 0.10
    if r.pain_score >= 8: score += 0.05
    return min(score, 0.99)

def key_factors(r: PredictRequest):
    f = []
    if r.spo2 < 94: f.append(f"SpO2 low ({r.spo2}%)")
    if r.respiratory_rate > 20: f.append(f"Elevated respiratory rate ({r.respiratory_rate})")
    if r.heart_rate > 100: f.append(f"Elevated heart rate ({r.heart_rate})")
    if r.heart_rate < 50: f.append(f"Bradycardia ({r.heart_rate})")
    if r.systolic_bp < 100: f.append(f"Low systolic BP ({r.systolic_bp})")
    if r.temperature >= 39.0: f.append(f"Fever ({r.temperature}C)")
    if r.temperature <= 35.5: f.append(f"Hypothermia ({r.temperature}C)")
    if r.age >= 75: f.append(f"Geriatric ({r.age}y)")
    if r.pain_score >= 8: f.append(f"Severe pain ({r.pain_score}/10)")
    if r.waiting_minutes > 60: f.append(f"Long wait ({r.waiting_minutes}min)")
    return f[:5] if f else ["Vitals within reference ranges"]

@app.get("/")
def root():
    return {"service": "PatientTriage ML", "version": MODEL_VERSION, "model_loaded": model is not None}

@app.get("/health")
def health():
    return {"status": "operational", "model_loaded": model is not None, "version": MODEL_VERSION}

@app.post("/predict-risk", response_model=PredictResponse)
def predict(req: PredictRequest):
    try:
        if model is not None:
            X = build_features(req)
            prob = float(model.predict_proba(X)[0][1])
            version = MODEL_VERSION
        else:
            prob = rule_based_risk(req)
            version = "rule-fallback-v1"
    except Exception as e:
        print(f"Prediction error: {e}")
        prob = rule_based_risk(req)
        version = "rule-fallback-v1"

    level = "HIGH" if prob >= 0.6 else ("MEDIUM" if prob >= 0.3 else "LOW")
    return PredictResponse(
        risk_probability=round(prob, 3),
        risk_level=level,
        model_version=version,
        key_factors=key_factors(req)
    )
