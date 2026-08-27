from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "operational"

def test_predict_high_risk():
    r = client.post("/predict-risk", json={
        "age":78,"heart_rate":130,"systolic_bp":85,"diastolic_bp":55,
        "spo2":86,"respiratory_rate":28,"temperature":39.5,"pain_score":9,"waiting_minutes":30
    })
    assert r.status_code == 200
    assert r.json()["risk_level"] in ["HIGH","MEDIUM"]

def test_predict_low_risk():
    r = client.post("/predict-risk", json={
        "age":30,"heart_rate":72,"systolic_bp":120,"diastolic_bp":80,
        "spo2":98,"respiratory_rate":16,"temperature":37.0,"pain_score":2,"waiting_minutes":5
    })
    assert r.status_code == 200

def test_invalid_input():
    r = client.post("/predict-risk", json={"age":-1})
    assert r.status_code == 422
