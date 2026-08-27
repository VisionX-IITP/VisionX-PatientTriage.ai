import { supabase } from "../config/supabase";
import { assessPatient } from "../services/triageService";

let state = {
  running: false,
  mode: "normal" as "normal"|"surge"|"extreme",
  speed: 1,
  interval: null as any,
  sessionId: null as string | null
};

const complaints = ["Chest pain","Breathing difficulty","Abdominal pain","Fever","Headache","Trauma - fall","Nausea and vomiting","Dizziness","Weakness"];
const names = () => "SIM-" + Math.floor(1000+Math.random()*9000);

function randomVitals(deteriorate=false) {
  if (deteriorate) return {
    heart_rate: 110+Math.floor(Math.random()*40),
    systolic_bp: 80+Math.floor(Math.random()*20),
    diastolic_bp: 50+Math.floor(Math.random()*15),
    spo2: 84+Math.floor(Math.random()*8),
    respiratory_rate: 24+Math.floor(Math.random()*10),
    temperature: 38.5+Math.random()*1.8
  };
  return {
    heart_rate: 65+Math.floor(Math.random()*40),
    systolic_bp: 110+Math.floor(Math.random()*30),
    diastolic_bp: 65+Math.floor(Math.random()*20),
    spo2: 95+Math.floor(Math.random()*5),
    respiratory_rate: 12+Math.floor(Math.random()*8),
    temperature: 36.3+Math.random()*1.2
  };
}

async function tick() {
  try {
    const rate = state.mode === "extreme" ? 6 : state.mode === "surge" ? 3 : 1;
    const spawn = Math.random() < (rate * 0.35);
    if (spawn) {
      const dete = Math.random() < 0.3;
      const v = randomVitals(dete);
      const { data: pt } = await supabase.from("patients").insert({
        patient_code: names(),
        age: 20+Math.floor(Math.random()*70),
        sex: Math.random()<0.5?"M":"F",
        chief_complaint: complaints[Math.floor(Math.random()*complaints.length)],
        pain_score: Math.floor(Math.random()*10),
        consciousness: "Alert",
        is_simulated: true,
        status: "Waiting"
      }).select().single();
      if (pt) {
        await supabase.from("patient_vitals").insert({ patient_id: pt.id, ...v });
        await assessPatient(pt.id);
      }
    }

    if (Math.random() < 0.25) {
      const { data: waiting } = await supabase.from("patients").select("id").eq("status","Waiting").limit(20);
      if (waiting && waiting.length) {
        const target = waiting[Math.floor(Math.random()*waiting.length)];
        const v = randomVitals(true);
        await supabase.from("patient_vitals").insert({ patient_id: target.id, ...v });
        const { data: prevList } = await supabase.from("triage_assessments").select("*").eq("patient_id", target.id).order("created_at",{ascending:false}).limit(1);
        const prev = prevList?.[0];
        const newT = await assessPatient(target.id);
        if (prev && newT && (prev.priority > newT.priority || Number(newT.risk_probability) - Number(prev.risk_probability) > 0.2)) {
          await supabase.from("reassessments").insert({
            patient_id: target.id,
            previous_priority: prev.priority, new_priority: newT.priority,
            previous_risk: prev.risk_probability, new_risk: newT.risk_probability,
            reason: "Simulated deterioration"
          });
          await supabase.from("alerts").insert({
            patient_id: target.id, type: "Deterioration", severity: "high",
            message: "Deterioration detected: P" + prev.priority + "->P" + newT.priority
          });
        }
      }
    }
  } catch (e) {
    console.error("Simulation tick error:", e);
  }
}

export async function startSim(mode: "normal"|"surge"|"extreme", speed=1) {
  if (state.running) stopSim();
  state.mode = mode; state.speed = speed; state.running = true;
  const { data: s } = await supabase.from("simulation_sessions").insert({ mode, status: "running" }).select().single();
  state.sessionId = s?.id || null;
  const intervalMs = Math.max(500, 3000 / speed);
  state.interval = setInterval(tick, intervalMs);
  return { ok: true, mode, speed };
}

export function stopSim() {
  if (state.interval) clearInterval(state.interval);
  state.running = false; state.interval = null;
  if (state.sessionId) supabase.from("simulation_sessions").update({ status: "stopped", ended_at: new Date().toISOString() }).eq("id", state.sessionId).then();
  return { ok: true };
}

export function simStatus() {
  return { running: state.running, mode: state.mode, speed: state.speed };
}
