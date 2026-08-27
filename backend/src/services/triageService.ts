import { supabase } from "../config/supabase";
import { runRules, priorityLabel } from "../triage/ruleEngine";
import { predictRisk } from "./mlClient";
import { generateExplanation } from "../ai/explanation";

export async function assessPatient(patientId: string) {
  const { data: patient } = await supabase.from("patients").select("*").eq("id", patientId).single();
  if (!patient) throw new Error("Patient not found");
  const { data: vitalsList } = await supabase.from("patient_vitals").select("*").eq("patient_id", patientId).order("recorded_at",{ascending:false}).limit(1);
  const vitals = vitalsList?.[0];
  if (!vitals) throw new Error("No vitals recorded");

  const waiting_minutes = Math.floor((Date.now() - new Date(patient.arrival_time).getTime())/60000);

  const rules = runRules({
    age: patient.age,
    vitals: {
      heart_rate: vitals.heart_rate, systolic_bp: vitals.systolic_bp, diastolic_bp: vitals.diastolic_bp,
      spo2: vitals.spo2, respiratory_rate: vitals.respiratory_rate, temperature: Number(vitals.temperature)
    },
    pain_score: patient.pain_score || 0,
    consciousness: patient.consciousness,
    chief_complaint: patient.chief_complaint,
    waiting_minutes
  });

  const mlRes = await predictRisk({
    age: patient.age,
    heart_rate: vitals.heart_rate,
    systolic_bp: vitals.systolic_bp,
    diastolic_bp: vitals.diastolic_bp,
    spo2: vitals.spo2,
    respiratory_rate: vitals.respiratory_rate,
    temperature: Number(vitals.temperature),
    pain_score: patient.pain_score || 0,
    waiting_minutes
  });

  let risk_probability = 0.3;
  let risk_level = "LOW";
  let model_version = "rule-fallback";
  let mlFactors: string[] = [];
  let mlAvailable = false;

  if (mlRes.ok) {
    risk_probability = mlRes.data.risk_probability;
    risk_level = mlRes.data.risk_level;
    model_version = mlRes.data.model_version;
    mlFactors = mlRes.data.key_factors || [];
    mlAvailable = true;
  } else {
    const rs = (rules.vitalInstability === "CRITICAL" ? 0.9 : rules.vitalInstability === "HIGH" ? 0.7 : rules.vitalInstability === "MEDIUM" ? 0.45 : 0.2);
    risk_probability = rs;
    risk_level = rs >= 0.6 ? "HIGH" : rs >= 0.3 ? "MEDIUM" : "LOW";
  }

  let confidence = 0.9;
  if (!mlAvailable) confidence -= 0.25;
  if (!vitals.spo2 || !vitals.heart_rate) confidence -= 0.2;
  if (!patient.chief_complaint) confidence -= 0.1;
  if (rules.criticalFlags.length > 0) confidence = Math.min(0.98, confidence + 0.05);
  confidence = Math.max(0.35, Math.min(0.98, confidence));

  let priority = rules.suggestedPriority;
  if (risk_level === "HIGH" && priority > 2) priority = 2;
  if (risk_probability > 0.85 && priority > 1 && rules.criticalFlags.length > 0) priority = 1;

  const key_factors = [...new Set([...rules.criticalFlags, ...mlFactors])].slice(0, 6);

  const ctx = {
    priority, priority_label: priorityLabel(priority), risk_level, risk_probability,
    confidence, care_pathway: rules.suggestedPathway,
    reassessment_minutes: rules.reassessmentMinutes, key_factors, model_version
  };
  const explanation = await generateExplanation(ctx);

  const recommendation = confidence < 0.6
    ? "Low confidence - request additional information or reassess promptly."
    : "Follow " + rules.suggestedPathway + " pathway. Reassess in " + rules.reassessmentMinutes + " minutes.";

  const { data: inserted } = await supabase.from("triage_assessments").insert({
    patient_id: patientId,
    priority, priority_label: priorityLabel(priority),
    deterioration_risk: risk_level,
    risk_probability, confidence,
    care_pathway: rules.suggestedPathway,
    reassessment_minutes: rules.reassessmentMinutes,
    key_factors, explanation, recommendation, model_version
  }).select().single();

  if (risk_level === "HIGH") {
    await supabase.from("alerts").insert({
      patient_id: patientId, type: "Deterioration", severity: "high",
      message: "High deterioration risk (" + (risk_probability*100).toFixed(0) + "%) for " + patient.patient_code
    });
  }
  if (confidence < 0.6) {
    await supabase.from("alerts").insert({
      patient_id: patientId, type: "Low Confidence", severity: "medium",
      message: "Low-confidence assessment for " + patient.patient_code
    });
  }

  return inserted;
}
