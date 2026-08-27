import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../services/api";
import { useState } from "react";
import { PriorityBadge, RiskBadge, ConfidenceBar } from "../components/ui/Badges";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { useAuth } from "../context/AuthContext";

export default function PatientDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: p, isLoading } = useQuery({ queryKey:["patient",id], queryFn: async()=>(await api.get("/patients/"+id)).data });
  const [metric, setMetric] = useState("heart_rate");
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [action, setAction] = useState<"ACCEPT"|"MODIFY"|"OVERRIDE">("ACCEPT");
  const [newPriority, setNewPriority] = useState(3);
  const [reason, setReason] = useState("");

  if (isLoading) return <div className="p-8 text-center text-slate-500">Loading patient...</div>;
  if (!p) return <div>Not found</div>;

  const t = p.latest_triage;
  const canDecide = user?.role === "doctor" || user?.role === "admin";

  const reassess = async () => { await api.post("/patients/"+id+"/reassess"); qc.invalidateQueries({queryKey:["patient",id]}); };
  const decide = async () => {
    await api.post("/patients/"+id+"/decision", { action, new_priority: newPriority, reason });
    setOverrideOpen(false); setReason("");
    qc.invalidateQueries({queryKey:["patient",id]});
  };

  const vitalsData = (p.vitals || []).map((v:any) => ({
    time: new Date(v.recorded_at).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}),
    heart_rate: v.heart_rate, spo2: v.spo2, respiratory_rate: v.respiratory_rate,
    temperature: v.temperature, systolic_bp: v.systolic_bp
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{p.patient_code}</h1>
          <div className="text-sm text-slate-500">{p.age} yr {p.sex} - {p.chief_complaint} - Waiting {p.waiting_minutes} min</div>
        </div>
        <div className="flex items-center gap-3">
          <PriorityBadge p={t?.priority} />
          <RiskBadge r={t?.deterioration_risk} />
          <ConfidenceBar c={t?.confidence} />
          <button onClick={reassess} className="btn btn-secondary">Reassess</button>
        </div>
      </div>

      {t && Number(t.confidence) < 0.6 && (
        <div className="card p-4 border-l-4 border-red-500 bg-red-50">
          <div className="font-semibold text-red-700">LOW CONFIDENCE ASSESSMENT</div>
          <div className="text-sm text-red-600">Available information is insufficient for confident prioritization. Request additional information.</div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card p-4 lg:col-span-2">
          <div className="font-semibold text-slate-800 mb-2">AI Triage Recommendation</div>
          {!t ? <div className="text-sm text-slate-500">No triage yet</div> : (
            <>
              <div className="grid grid-cols-3 gap-4 text-sm mb-4">
                <div><div className="text-xs text-slate-500">Priority</div><div className="font-bold">P{t.priority} - {t.priority_label}</div></div>
                <div><div className="text-xs text-slate-500">Risk Probability</div><div className="font-bold">{Math.round(Number(t.risk_probability)*100)}%</div></div>
                <div><div className="text-xs text-slate-500">Confidence</div><div className="font-bold">{Math.round(Number(t.confidence)*100)}%</div></div>
                <div><div className="text-xs text-slate-500">Care Pathway</div><div className="font-bold">{t.care_pathway}</div></div>
                <div><div className="text-xs text-slate-500">Reassess in</div><div className="font-bold">{t.reassessment_minutes} min</div></div>
                <div><div className="text-xs text-slate-500">Model</div><div className="font-bold text-xs">{t.model_version}</div></div>
              </div>
              <div className="text-xs text-slate-500 uppercase mb-1">Key Factors</div>
              <div className="flex flex-wrap gap-1 mb-3">{(t.key_factors || []).map((k:string,i:number)=><span key={i} className="badge bg-slate-100 text-slate-700">{k}</span>)}</div>
              <div className="text-xs text-slate-500 uppercase mb-1">AI Explanation</div>
              <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg">{t.explanation}</p>
              <div className="text-xs text-slate-500 uppercase mt-3 mb-1">Recommendation</div>
              <p className="text-sm text-slate-700">{t.recommendation}</p>

              {canDecide && (
                <div className="flex gap-2 mt-4 pt-4 border-t border-slate-200">
                  <button onClick={()=>{setAction("ACCEPT"); setNewPriority(t.priority); setOverrideOpen(true);}} className="btn btn-primary">Accept</button>
                  <button onClick={()=>{setAction("MODIFY"); setNewPriority(t.priority); setOverrideOpen(true);}} className="btn btn-secondary">Modify</button>
                  <button onClick={()=>{setAction("OVERRIDE"); setNewPriority(t.priority); setOverrideOpen(true);}} className="btn btn-danger">Override</button>
                </div>
              )}
            </>
          )}
        </div>

        <div className="card p-4">
          <div className="font-semibold text-slate-800 mb-2">Current Vitals</div>
          {p.latest_vitals && (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><div className="text-xs text-slate-500">HR</div><div className="font-bold">{p.latest_vitals.heart_rate}</div></div>
              <div><div className="text-xs text-slate-500">BP</div><div className="font-bold">{p.latest_vitals.systolic_bp}/{p.latest_vitals.diastolic_bp}</div></div>
              <div><div className="text-xs text-slate-500">SpO2</div><div className="font-bold">{p.latest_vitals.spo2}%</div></div>
              <div><div className="text-xs text-slate-500">RR</div><div className="font-bold">{p.latest_vitals.respiratory_rate}</div></div>
              <div><div className="text-xs text-slate-500">Temp</div><div className="font-bold">{p.latest_vitals.temperature}C</div></div>
              <div><div className="text-xs text-slate-500">Pain</div><div className="font-bold">{p.pain_score}/10</div></div>
            </div>
          )}
          <div className="mt-4 text-xs">
            <div className="text-slate-500 uppercase mb-1">History</div>
            <div>{p.medical_history || "None"}</div>
            <div className="text-slate-500 uppercase mt-2 mb-1">Allergies</div>
            <div>{p.allergies || "None"}</div>
          </div>
        </div>

        <div className="card p-4 lg:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <div className="font-semibold text-slate-800">Vital Trend</div>
            <select value={metric} onChange={e=>setMetric(e.target.value)} className="text-xs px-2 py-1 rounded border">
              <option value="heart_rate">Heart Rate</option><option value="spo2">SpO2</option>
              <option value="respiratory_rate">Respiratory Rate</option><option value="temperature">Temperature</option>
              <option value="systolic_bp">Systolic BP</option>
            </select>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={vitalsData}>
              <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="time" /><YAxis /><Tooltip />
              <Line type="monotone" dataKey={metric} stroke="#6366f1" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-4">
          <div className="font-semibold text-slate-800 mb-2">Alerts</div>
          {(p.alerts || []).length === 0 && <div className="text-sm text-slate-500">No alerts</div>}
          {(p.alerts || []).slice(0,5).map((a:any) => (
            <div key={a.id} className="text-xs p-2 border-b border-slate-100">
              <div className="font-semibold text-slate-700">{a.type}</div>
              <div className="text-slate-500">{a.message}</div>
            </div>
          ))}
        </div>

        <div className="card p-4 lg:col-span-3">
          <div className="font-semibold text-slate-800 mb-2">Timeline and Reassessments</div>
          <div className="text-sm space-y-1">
            {(p.triages || []).slice(0,10).map((tr:any) => (
              <div key={tr.id} className="flex items-center gap-3 p-2 border-b border-slate-100">
                <div className="text-xs text-slate-500 w-32">{new Date(tr.created_at).toLocaleString()}</div>
                <PriorityBadge p={tr.priority} />
                <RiskBadge r={tr.deterioration_risk} />
                <div className="text-slate-600 text-xs">{tr.model_version}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-4 lg:col-span-3">
          <div className="font-semibold text-slate-800 mb-2">Clinician Decisions</div>
          {(p.decisions || []).length === 0 ? <div className="text-sm text-slate-500">No decisions yet</div> :
            (p.decisions || []).map((d: any) => (
              <div key={d.id} className="text-sm p-2 border-b border-slate-100 flex justify-between">
                <div>
                  <span className="badge bg-indigo-100 text-indigo-700 mr-2">{d.action}</span>
                  P{d.previous_priority} &gt; P{d.new_priority} - {d.reason || ""}
                </div>
                <div className="text-xs text-slate-400">{new Date(d.created_at).toLocaleString()}</div>
              </div>
            ))
          }
        </div>
      </div>

      {overrideOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="font-bold text-lg mb-3">{action} Recommendation</h3>
            {action !== "ACCEPT" && (
              <div className="mb-3">
                <label className="text-xs text-slate-500 uppercase">New Priority</label>
                <select value={newPriority} onChange={e=>setNewPriority(Number(e.target.value))} className="w-full mt-1 px-3 py-2 border rounded">
                  {[1,2,3,4,5].map(n => <option key={n} value={n}>P{n}</option>)}
                </select>
              </div>
            )}
            <div className="mb-3">
              <label className="text-xs text-slate-500 uppercase">Reason {action==="OVERRIDE" && "(required)"}</label>
              <textarea value={reason} onChange={e=>setReason(e.target.value)} className="w-full mt-1 px-3 py-2 border rounded" rows={3} />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={()=>setOverrideOpen(false)} className="btn btn-secondary">Cancel</button>
              <button onClick={decide} className="btn btn-primary">Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
