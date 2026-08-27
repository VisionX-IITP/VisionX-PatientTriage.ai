import axios from "axios";
const ML_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";

export async function predictRisk(features: any) {
  try {
    const r = await axios.post(ML_URL + "/predict-risk", features, { timeout: 4000 });
    return { ok: true, data: r.data };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

export async function mlHealth() {
  try {
    const r = await axios.get(ML_URL + "/health", { timeout: 2000 });
    return r.data;
  } catch {
    return { status: "unavailable" };
  }
}
