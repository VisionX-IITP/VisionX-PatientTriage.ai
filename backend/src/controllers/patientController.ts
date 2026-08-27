import { Response } from "express";
import { supabase } from "../config/supabase";
import { AuthReq } from "../middleware/auth";
import { assessPatient } from "../services/triageService";

export async function listPatients(req: AuthReq, res: Response) {
  const { data: patients } = await supabase.from("patients").select("*").order("arrival_time", { ascending: true });
  if (!patients) return res.json([]);
  const ids = patients.map(p => p.id);
  const { data: triages } = await supabase.from("triage_assessments").select("*").in("patient_id", ids).order("created_at", { ascending: false });
  const { data: vitals } = await supabase.from("patient_vitals").select("*").in("patient_id", ids).order("recorded_at", { ascending: false });

  const enriched = patients.map(p => {
    const t = triages?.find(x => x.patient_id === p.id);
    const v = vitals?.find(x => x.patient_id === p.id);
    const waiting = Math.floor((Date.now() - new Date(p.arrival_time).getTime())/60000);
    return { ...p, triage: t, vitals: v, waiting_minutes: waiting };
  });

  enriched.sort((a, b) => {
    const pa = a.triage?.priority ?? 5, pb = b.triage?.priority ?? 5;
    if (pa !== pb) return pa - pb;
    const ra = a.triage?.risk_probability ?? 0, rb = b.triage?.risk_probability ?? 0;
    if (rb !== ra) return rb - ra;
    return b.waiting_minutes - a.waiting_minutes;
  });

  res.json(enriched);
}

export async function getPatient(req: AuthReq, res: Response) {
  const { id } = req.params;
  const { data: patient } = await supabase.from("patients").select("*").eq("id", id).single();
  if (!patient) return res.status(404).json({ error: "Not found" });
  const { data: vitals } = await supabase.from("patient_vitals").select("*").eq("patient_id", id).order("recorded_at", { ascending: true });
  const { data: triages } = await supabase.from("triage_assessments").select("*").eq("patient_id", id).order("created_at", { ascending: false });
  const { data: alerts } = await supabase.from("alerts").select("*").eq("patient_id", id).order("created_at", { ascending: false });
  const { data: decisions } = await supabase.from("clinician_decisions").select("*").eq("patient_id", id).order("created_at", { ascending: false });
  const { data: reassessments } = await supabase.from("reassessments").select("*").eq("patient_id", id).order("created_at", { ascending: false });
  const waiting = Math.floor((Date.now() - new Date(patient.arrival_time).getTime())/60000);
  res.json({ ...patient, vitals, triages, alerts, decisions, reassessments, waiting_minutes: waiting, latest_triage: triages?.[0], latest_vitals: vitals?.[vitals.length-1] });
}

export async function createPatient(req: AuthReq, res: Response) {
  const b = req.body;
  const code = b.patient_code || "P" + Math.floor(1000 + Math.random()*9000);
  const { data: patient, error } = await supabase.from("patients").insert({
    patient_code: code, age: b.age, sex: b.sex, medical_history: b.medical_history,
    medications: b.medications, allergies: b.allergies, chief_complaint: b.chief_complaint,
    symptoms: b.symptoms, pain_score: b.pain_score, duration: b.duration,
    consciousness: b.consciousness || "Alert", distress: b.distress || "None",
    mobility: b.mobility || "Ambulatory", is_simulated: true, status: "Waiting"
  }).select().single();
  if (error) return res.status(400).json({ error: error.message });

  await supabase.from("patient_vitals").insert({
    patient_id: patient.id, heart_rate: b.heart_rate, systolic_bp: b.systolic_bp,
    diastolic_bp: b.diastolic_bp, spo2: b.spo2, respiratory_rate: b.respiratory_rate,
    temperature: b.temperature
  });

  const triage = await assessPatient(patient.id);
  await supabase.from("audit_logs").insert({
    user_id: req.user!.id, user_email: req.user!.email, user_role: req.user!.role,
    patient_id: patient.id, action: "PATIENT_CREATED",
    details: { patient_code: code, triage_id: triage?.id }
  });
  res.json({ patient, triage });
}

export async function reassess(req: AuthReq, res: Response) {
  const { id } = req.params;
  const t = await assessPatient(id);
  await supabase.from("audit_logs").insert({
    user_id: req.user!.id, user_email: req.user!.email, user_role: req.user!.role,
    patient_id: id, action: "REASSESS", details: { triage_id: t?.id }
  });
  res.json(t);
}

export async function decision(req: AuthReq, res: Response) {
  const { id } = req.params;
  const { action, new_priority, new_pathway, reason } = req.body;
  const { data: last } = await supabase.from("triage_assessments").select("*").eq("patient_id", id).order("created_at",{ascending:false}).limit(1).single();

  if (action === "OVERRIDE" && (!reason || reason.length < 3)) return res.status(400).json({ error: "Reason required" });

  await supabase.from("clinician_decisions").insert({
    patient_id: id, user_id: req.user!.id, action,
    previous_priority: last?.priority, new_priority: new_priority ?? last?.priority,
    previous_pathway: last?.care_pathway, new_pathway: new_pathway ?? last?.care_pathway,
    reason
  });

  if (action !== "ACCEPT" && new_priority) {
    await supabase.from("triage_assessments").insert({
      patient_id: id, priority: new_priority, priority_label: last?.priority_label,
      deterioration_risk: last?.deterioration_risk, risk_probability: last?.risk_probability,
      confidence: 1.0, care_pathway: new_pathway || last?.care_pathway,
      reassessment_minutes: last?.reassessment_minutes,
      key_factors: ["Clinician " + action, reason || ""],
      explanation: "Clinician " + action + ": " + (reason || "N/A"),
      recommendation: "Clinician-directed disposition",
      model_version: "clinician-override"
    });
  }

  await supabase.from("audit_logs").insert({
    user_id: req.user!.id, user_email: req.user!.email, user_role: req.user!.role,
    patient_id: id, action: "DECISION_" + action,
    details: { new_priority, new_pathway, reason, previous_priority: last?.priority }
  });

  res.json({ ok: true });
}
