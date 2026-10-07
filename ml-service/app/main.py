from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .schemas import PredictRequest, PredictResponse

import os
import joblib
import numpy as np


app = FastAPI(
    title="PatientTriage ML Service",
    version="1.0.0"
)

# Keep permissive CORS for local hackathon development.
# Restrict this in production.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


MODEL_PATH = os.path.join(
    os.path.dirname(__file__),
    "models",
    "triage_xgb_v1.joblib"
)

MODEL_VERSION = "xgb-v1-prototype"

model = None


def load_model():
    global model

    if not os.path.exists(MODEL_PATH):
        print(
            f"[WARN] Model not found at {MODEL_PATH}. "
            "Using deterministic rule fallback."
        )
        model = None
        return

    try:
        loaded = joblib.load(MODEL_PATH)

        if not hasattr(loaded, "predict_proba"):
            raise TypeError(
                "Loaded model does not implement predict_proba()"
            )

        model = loaded

        print(f"Loaded model from {MODEL_PATH}")

    except Exception as exc:
        print(f"[WARN] Model load failed: {exc}")
        model = None


load_model()


def build_features(r: PredictRequest):
    shock_index = r.heart_rate / max(r.systolic_bp, 1)

    age_risk = int(
        r.age >= 65 or r.age <= 5
    )

    resp_stress = int(
        r.respiratory_rate > 22 or r.spo2 < 94
    )

    vital_instab = int(
        r.heart_rate > 110
        or r.systolic_bp < 100
        or r.spo2 < 92
    )

    return np.array(
        [[
            r.age,
            r.heart_rate,
            r.systolic_bp,
            r.diastolic_bp,
            r.spo2,
            r.respiratory_rate,
            r.temperature,
            r.pain_score,
            r.waiting_minutes,
            shock_index,
            age_risk,
            resp_stress,
            vital_instab,
        ]],
        dtype=float,
    )


def rule_based_risk(r: PredictRequest) -> float:
    score = 0.0

    if r.spo2 < 90:
        score += 0.35
    elif r.spo2 < 94:
        score += 0.15

    if r.respiratory_rate > 24:
        score += 0.20
    elif r.respiratory_rate > 20:
        score += 0.08

    if r.heart_rate > 120 or r.heart_rate < 50:
        score += 0.20
    elif r.heart_rate > 100:
        score += 0.08

    if r.systolic_bp < 90:
        score += 0.25
    elif r.systolic_bp < 100:
        score += 0.10

    if r.temperature >= 39.5 or r.temperature <= 35.0:
        score += 0.15

    if r.age >= 75 or r.age <= 2:
        score += 0.10

    if r.pain_score >= 8:
        score += 0.05

    return min(score, 0.99)


def key_factors(r: PredictRequest):
    factors = []

    if r.spo2 < 94:
        factors.append(f"SpO2 low ({r.spo2}%)")

    if r.respiratory_rate > 20:
        factors.append(
            f"Elevated respiratory rate ({r.respiratory_rate})"
        )

    if r.heart_rate > 100:
        factors.append(
            f"Elevated heart rate ({r.heart_rate})"
        )

    if r.heart_rate < 50:
        factors.append(
            f"Bradycardia ({r.heart_rate})"
        )

    if r.systolic_bp < 100:
        factors.append(
            f"Low systolic BP ({r.systolic_bp})"
        )

    if r.temperature >= 39:
        factors.append(
            f"Fever ({r.temperature}C)"
        )

    if r.temperature <= 35.5:
        factors.append(
            f"Hypothermia ({r.temperature}C)"
        )

    if r.age >= 75:
        factors.append(
            f"Geriatric ({r.age}y)"
        )

    if r.pain_score >= 8:
        factors.append(
            f"Severe pain ({r.pain_score}/10)"
        )

    if r.waiting_minutes > 60:
        factors.append(
            f"Long wait ({r.waiting_minutes}min)"
        )

    return (
        factors[:5]
        if factors
        else ["Vitals within reference ranges"]
    )


def classify(probability: float):
    probability = max(
        0.0,
        min(1.0, float(probability))
    )

    if probability >= 0.60:
        return "HIGH"

    if probability >= 0.30:
        return "MEDIUM"

    return "LOW"


@app.get("/")
def root():
    return {
        "service": "PatientTriage ML",
        "version": MODEL_VERSION,
        "model_loaded": model is not None,
    }


@app.get("/health")
def health():
    return {
        "status": "operational",
        "model_loaded": model is not None,
        "version": MODEL_VERSION,
    }


@app.post(
    "/predict-risk",
    response_model=PredictResponse
)
def predict(req: PredictRequest):
    model_version = "rule-fallback-v1"

    try:
        if model is not None:
            features = build_features(req)

            probabilities = model.predict_proba(features)

            if probabilities.shape[1] < 2:
                raise ValueError(
                    "Model must provide probabilities for both classes"
                )

            probability = float(
                probabilities[0][1]
            )

            model_version = MODEL_VERSION

        else:
            probability = rule_based_risk(req)

    except Exception as exc:
        print(f"[WARN] Prediction failed: {exc}")

        probability = rule_based_risk(req)
        model_version = "rule-fallback-v1"

    probability = round(
        max(0.0, min(1.0, probability)),
        3
    )

    return PredictResponse(
        risk_probability=probability,
        risk_level=classify(probability),
        model_version=model_version,
        key_factors=key_factors(req),
    )
