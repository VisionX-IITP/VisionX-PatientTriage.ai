import { useQuery } from "@tanstack/react-query";
import api from "../services/api";
import { PriorityBadge, RiskBadge, ConfidenceBar } from "../components/ui/Badges";
import { Link, useSearchParams } from "react-router-dom";
import { useState } from "react";

export default function Queue() {
  const { data, isLoading } = useQuery({ queryKey:["patients"], queryFn: async()=>(await api.get("/patients")).data });
  const [params] = useSearchParams();
  const q = params.get("q") || "";
  const [filter, setFilter] = useState({ priority: "", risk: "" });

  if (isLoading) return <div className="p-8 text-slate-500 text-center">Loading queue...</div>;

  let rows = data || [];
  if (q) rows = rows.filter((p: any) => (p.patient_code + " " + p.chief_complaint).toLowerCase().includes(q.toLowerCase()));
  if (filter.priority) rows = rows.filter((p: any) => String(p.triage?.priority) === filter.priority);
  if (filter.risk) rows = rows.filter((p: any) => p.triage?.deterioration_risk === filter.risk);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Patient Queue</h1>
          <p className="text-sm text-slate-500">{rows.length} patients - sorted by priority, risk and waiting time</p>
        </div>
        <div className="flex gap-2">
          <select value={filter.priority} onChange={e=>setFilter({...filter, priority:e.target.value})} className="px-3 py-2 rounded-lg border border-slate-200 text-sm">
            <option value="">All Priorities</option><option value="1">P1</option><option value="2">P2</option><option value="3">P3</option><option value="4">P4</option><option value="5">P5</option>
          </select>
          <select value={filter.risk} onChange={e=>setFilter({...filter, risk:e.target.value})} className="px-3 py-2 rounded-lg border border-slate-200 text-sm">
            <option value="">All Risks</option><option value="HIGH">High</option><option value="MEDIUM">Medium</option><option value="LOW">Low</option>
          </select>
          <button onClick={()=>setFilter({priority:"",risk:""})} className="btn btn-secondary">Clear</button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr className="text-left text-xs uppercase text-slate-500">
              <th className="px-4 py-3">Patient</th><th className="px-4 py-3">Age</th><th className="px-4 py-3">Complaint</th>
              <th className="px-4 py-3">Priority</th><th className="px-4 py-3">Risk</th><th className="px-4 py-3">Confidence</th>
              <th className="px-4 py-3">Wait</th><th className="px-4 py-3">Status</th><th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={9} className="py-10 text-center text-slate-400">No patients</td></tr>}
            {rows.map((p: any) => (
              <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3 font-semibold text-slate-800">{p.patient_code}</td>
                <td className="px-4 py-3">{p.age}</td>
                <td className="px-4 py-3 text-slate-600">{p.chief_complaint}</td>
                <td className="px-4 py-3"><PriorityBadge p={p.triage?.priority} /></td>
                <td className="px-4 py-3"><RiskBadge r={p.triage?.deterioration_risk} /></td>
                <td className="px-4 py-3"><ConfidenceBar c={p.triage?.confidence} /></td>
                <td className="px-4 py-3">{p.waiting_minutes} min</td>
                <td className="px-4 py-3"><span className="badge bg-slate-100 text-slate-700">{p.status}</span></td>
                <td className="px-4 py-3"><Link to={"/patient/"+p.id} className="text-indigo-600 hover:underline">View</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
