"""
Prototype training - synthetic dataset for hackathon demo.
NOT clinically validated.
"""
import os, numpy as np, pandas as pd, joblib
from sklearn.model_selection import train_test_split
from sklearn.metrics import roc_auc_score, precision_score, recall_score, f1_score, confusion_matrix
from xgboost import XGBClassifier

np.random.seed(42)
N = 5000

def gen():
    rows = []
    for _ in range(N):
        deteriorate = np.random.rand() < 0.25
        if deteriorate:
            age = np.random.choice([np.random.randint(60,95), np.random.randint(0,5)], p=[0.85,0.15])
            hr = np.random.randint(105, 145)
            sbp = np.random.randint(70, 105)
            dbp = np.random.randint(45, 70)
            spo2 = np.random.randint(82, 93)
            rr = np.random.randint(22, 36)
            temp = np.random.choice([np.random.uniform(38.8,40.5), np.random.uniform(34.5,36.0)])
            pain = np.random.randint(6, 11)
            wait = np.random.randint(0, 120)
        else:
            age = np.random.randint(18, 70)
            hr = np.random.randint(60, 100)
            sbp = np.random.randint(110, 140)
            dbp = np.random.randint(65, 85)
            spo2 = np.random.randint(95, 100)
            rr = np.random.randint(12, 20)
            temp = np.random.uniform(36.3, 37.6)
            pain = np.random.randint(0, 6)
            wait = np.random.randint(0, 60)
        shock = hr / max(sbp, 1)
        age_risk = 1 if age >= 65 or age <= 5 else 0
        resp_stress = 1 if rr > 22 or spo2 < 94 else 0
        vital_instab = int(hr > 110 or sbp < 100 or spo2 < 92)
        rows.append([age,hr,sbp,dbp,spo2,rr,temp,pain,wait,shock,age_risk,resp_stress,vital_instab,int(deteriorate)])
    cols = ["age","heart_rate","systolic_bp","diastolic_bp","spo2","respiratory_rate",
            "temperature","pain_score","waiting_minutes","shock_index","age_risk","resp_stress","vital_instab","label"]
    return pd.DataFrame(rows, columns=cols)

print("Generating synthetic dataset...")
df = gen()
X = df.drop("label", axis=1)
y = df["label"]
Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
print("Training XGBoost...")
model = XGBClassifier(n_estimators=200, max_depth=5, learning_rate=0.1, eval_metric="logloss")
model.fit(Xtr, ytr)
preds = model.predict(Xte)
probs = model.predict_proba(Xte)[:,1]
print("ROC-AUC:", roc_auc_score(yte, probs))
print("Precision:", precision_score(yte, preds))
print("Recall:", recall_score(yte, preds))
print("F1:", f1_score(yte, preds))
print("CM:\n", confusion_matrix(yte, preds))

out_dir = os.path.join(os.path.dirname(__file__), "..", "app", "models")
os.makedirs(out_dir, exist_ok=True)
joblib.dump(model, os.path.join(out_dir, "triage_xgb_v1.joblib"))
print("Saved model to", out_dir)
