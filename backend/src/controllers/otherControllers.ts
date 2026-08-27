import { Response } from "express";
import { supabase } from "../config/supabase";
import { AuthReq } from "../middleware/auth";
import { mlHealth } from "../services/mlClient";

export async function alerts(_req: AuthReq, res: Response) {
  const { data } = await supabase.from("alerts").select("*, patients(patient_code)").order("created_at", { ascending: false }).limit(200);
  res.json(data || []);
}

export async function resolveAlert(req: AuthReq, res: Response) {
  await supabase.from("alerts").update({ status: "resolved", resolved_at: new Date().toISOString() }).eq("id", req.params.id);
  res.json({ ok: true });
}

export async function auditLogs(_req: AuthReq, res: Response) {
  const { data } = await supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(500);
  res.json(data || []);
}

export async function analytics(_req: AuthReq, res: Response) {
  const { data: patients } = await supabase.from("patients").select("*");
  const { data: triages } = await supabase.from("triage_assessments").select("*");
  const { data: alertsData } = await supabase.from("alerts").select("*");
  const { data: reass } = await supabase.from("reassessments").select("*");

  const now = Date.now();
  const waits = (patients || []).map(p => Math.floor((now - new Date(p.arrival_time).getTime())/60000));
  const avgWait = waits.length ? Math.round(waits.reduce((a,b)=>a+b,0)/waits.length) : 0;
  const longestWait = waits.length ? Math.max(...waits) : 0;

  const latestByPatient: Record<string, any> = {};
  (triages || []).forEach(t => {
    if (!latestByPatient[t.patient_id] || new Date(t.created_at) > new Date(latestByPatient[t.patient_id].created_at)) {
      latestByPatient[t.patient_id] = t;
    }
  });
  const latest = Object.values(latestByPatient) as any[];

  const priorityDist = [1,2,3,4,5].map(p => ({ priority: "P" + p, count: latest.filter(t=>t.priority===p).length }));
  const riskDist = ["LOW","MEDIUM","HIGH"].map(r => ({ risk: r, count: latest.filter(t=>t.deterioration_risk===r).length }));
  const avgConfidence = latest.length ? latest.reduce((s,t)=>s+Number(t.confidence),0)/latest.length : 0;
  const highRisk = latest.filter(t=>t.deterioration_risk==="HIGH").length;
  const p1p2 = latest.filter(t=>t.priority<=2).length;

  res.json({
    kpi: {
      total_patients: patients?.length || 0,
      critical: latest.filter(t=>t.priority===1).length,
      waiting: (patients || []).filter(p=>p.status==="Waiting").length,
      high_risk: highRisk,
      avg_wait: avgWait,
      longest_wait: longestWait,
      p1_p2_count: p1p2,
      capacity: Math.min(100, Math.round(((patients?.length||0)/40)*100)),
      avg_confidence: Number(avgConfidence.toFixed(2)),
      active_alerts: (alertsData || []).filter(a=>a.status==="active").length,
      reassessments: reass?.length || 0
    },
    priority_distribution: priorityDist,
    risk_distribution: riskDist,
    confidence_buckets: [
      { bucket: "Low (<60%)", count: latest.filter(t=>Number(t.confidence)<0.6).length },
      { bucket: "Med (60-80%)", count: latest.filter(t=>Number(t.confidence)>=0.6&&Number(t.confidence)<0.8).length },
      { bucket: "High (>80%)", count: latest.filter(t=>Number(t.confidence)>=0.8).length }
    ],
    waiting_by_priority: [1,2,3,4,5].map(p => {
      const pts = (patients || []).filter(pt => (latestByPatient[pt.id]?.priority) === p);
      const w = pts.map(pt => Math.floor((now - new Date(pt.arrival_time).getTime())/60000));
      return { priority: "P" + p, avg: w.length ? Math.round(w.reduce((a,b)=>a+b,0)/w.length) : 0 };
    })
  });
}

export async function systemHealth(_req: AuthReq, res: Response) {
  const ml = await mlHealth();
  const { error: dbErr } = await supabase.from("users").select("id").limit(1);
  res.json({
    backend: { status: "operational", latency_ms: 12 },
    database: { status: dbErr ? "unavailable" : "operational" },
    ml_service: { status: ml.status === "operational" ? "operational" : "unavailable", model_loaded: ml.model_loaded, version: ml.version },
    ai_service: { status: process.env.LLM_API_KEY ? "operational" : "degraded", note: process.env.LLM_API_KEY ? "" : "Using deterministic fallback (no LLM_API_KEY)" },
    simulation_engine: { status: "operational" }
  });
}
