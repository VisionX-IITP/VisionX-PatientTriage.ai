import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

const steps = ["Patient Info","Complaint","Vitals","Observations","Review"];

export default function AddPatient() {
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [f, setF] = useState<any>({
    age: 45, sex: "M", medical_history: "", medications: "", allergies: "",
    chief_complaint: "", symptoms: "", pain_score: 3, duration: "1 hour",
    heart_rate: 80, systolic_bp: 120, diastolic_bp: 80, spo2: 98, respiratory_rate: 16, temperature: 36.9,
    consciousness: "Alert", distress: "None", mobility: "Ambulatory"
  });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const submit = async () => {
    setLoading(true); setErr("");
    try {
      const { data } = await api.post("/patients", f);
      nav("/patient/" + data.patient.id);
    } catch (e: any) { setErr(e.response?.data?.error || "Failed"); }
    finally { setLoading(false); }
  };

  const Field = ({ name, label, type }: any) => (
    <div>
      <label className="text-xs uppercase text-slate-500 font-semibold">{label}</label>
      <input type={type || "text"} value={f[name]} onChange={e=>setF({...f, [name]: type==="number"?Number(e.target.value):e.target.value})}
        className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300" />
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold text-slate-900">Add Patient</h1>
      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={s} className={"flex-1 h-2 rounded-full " + (i<=step?"bg-indigo-600":"bg-slate-200")} />
        ))}
      </div>
      <div className="text-sm text-slate-600">Step {step+1} of {steps.length}: <b>{steps[step]}</b></div>

      <div className="card p-6 space-y-4">
        {step === 0 && (
          <div className="grid grid-cols-2 gap-4">
            <Field name="age" label="Age" type="number" />
            <div>
              <label className="text-xs uppercase text-slate-500 font-semibold">Sex</label>
              <select value={f.sex} onChange={e=>setF({...f, sex:e.target.value})} className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300">
                <option>M</option><option>F</option><option>Other</option>
              </select>
            </div>
            <Field name="medical_history" label="Medical History" />
            <Field name="medications" label="Medications" />
            <Field name="allergies" label="Allergies" />
          </div>
        )}
        {step === 1 && (
          <div className="grid grid-cols-2 gap-4">
            <Field name="chief_complaint" label="Chief Complaint" />
            <Field name="symptoms" label="Symptoms" />
            <Field name="pain_score" label="Pain (0-10)" type="number" />
            <Field name="duration" label="Duration" />
          </div>
        )}
        {step === 2 && (
          <div className="grid grid-cols-3 gap-4">
            <Field name="heart_rate" label="Heart Rate" type="number" />
            <Field name="systolic_bp" label="Systolic BP" type="number" />
            <Field name="diastolic_bp" label="Diastolic BP" type="number" />
            <Field name="spo2" label="SpO2 %" type="number" />
            <Field name="respiratory_rate" label="Respiratory Rate" type="number" />
            <Field name="temperature" label="Temperature (C)" type="number" />
          </div>
        )}
        {step === 3 && (
          <div className="grid grid-cols-2 gap-4">
            <Field name="consciousness" label="Consciousness" />
            <Field name="distress" label="Distress" />
            <Field name="mobility" label="Mobility" />
          </div>
        )}
        {step === 4 && (
          <div className="space-y-2 text-sm">
            <div className="text-slate-500">Review patient data before analysis:</div>
            <pre className="bg-slate-50 p-3 rounded-lg text-xs overflow-x-auto">{JSON.stringify(f, null, 2)}</pre>
          </div>
        )}
        {err && <div className="text-sm text-red-600">{err}</div>}
        <div className="flex justify-between pt-2">
          <button disabled={step===0} onClick={()=>setStep(s=>s-1)} className="btn btn-secondary">Back</button>
          {step < steps.length-1 ? (
            <button onClick={()=>setStep(s=>s+1)} className="btn btn-primary">Next</button>
          ) : (
            <button disabled={loading} onClick={submit} className="btn btn-primary">{loading?"Analyzing...":"Analyze Patient"}</button>
          )}
        </div>
      </div>
    </div>
  );
}
