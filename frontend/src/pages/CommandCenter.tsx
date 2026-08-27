import { useQuery } from "@tanstack/react-query";
import api from "../services/api";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from "recharts";
import { PriorityBadge, RiskBadge } from "../components/ui/Badges";
import { Link } from "react-router-dom";

const COLORS = ["#ef4444","#f97316","#eab308","#22c55e","#3b82f6"];
const RISK_COLORS: any = { HIGH:"#ef4444", MEDIUM:"#f97316", LOW:"#22c55e" };

function Kpi({ label, value, hint }: any) {
  return (
    <div className="card p-4">
      <div className="text-xs text-slate-500 uppercase tracking-wide">{label}</div>
      <div className="text-2xl font-bold text-slate-900 mt-1">{value}</div>
      {hint && <div className="text-xs text-slate-500 mt-1">{hint}</div>}
    </div>
  );
}

export default function CommandCenter() {
  const { data: a, isLoading } = useQuery({ queryKey:["analytics"], queryFn: async()=>(await api.get("/analytics")).data });
  const { data: patients } = useQuery({ queryKey:["patients"], queryFn: async()=>(await api.get("/patients")).data });

  if (isLoading) return <div className="p-8 text-center text-slate-500">Loading command center...</div>;

  const critical = (patients || []).filter((p: any) => p.triage?.priority === 1).slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Command Center</h1>
        <p className="text-sm text-slate-500">Real-time emergency department overview</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi label="Total Patients" value={a?.kpi.total_patients} />
        <Kpi label="Critical (P1)" value={a?.kpi.critical} hint="Immediate attention" />
        <Kpi label="Waiting" value={a?.kpi.waiting} />
        <Kpi label="High Risk" value={a?.kpi.high_risk} />
        <Kpi label="Avg Wait" value={a?.kpi.avg_wait + " min"} />
        <Kpi label="Capacity" value={a?.kpi.capacity + "%"} />
        <Kpi label="AI Confidence" value={Math.round((a?.kpi.avg_confidence||0)*100) + "%"} />
        <Kpi label="Active Alerts" value={a?.kpi.active_alerts} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card p-4">
          <div className="font-semibold text-slate-800 mb-3">Priority Distribution</div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={a?.priority_distribution} dataKey="count" nameKey="priority" outerRadius={80} label>
                {(a?.priority_distribution || []).map((_: any, i: number) => <Cell key={i} fill={COLORS[i]} />)}
              </Pie>
              <Tooltip /><Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-4">
          <div className="font-semibold text-slate-800 mb-3">Deterioration Risk</div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={a?.risk_distribution} dataKey="count" nameKey="risk" outerRadius={80} label>
                {(a?.risk_distribution || []).map((r: any, i: number) => <Cell key={i} fill={RISK_COLORS[r.risk]} />)}
              </Pie>
              <Tooltip /><Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-4">
          <div className="font-semibold text-slate-800 mb-3">Waiting Time by Priority</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={a?.waiting_by_priority}>
              <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="priority" /><YAxis /><Tooltip />
              <Bar dataKey="avg" fill="#6366f1" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-4 lg:col-span-2">
          <div className="font-semibold text-slate-800 mb-3">AI Confidence Distribution</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={a?.confidence_buckets}>
              <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="bucket" /><YAxis /><Tooltip />
              <Bar dataKey="count" fill="#0ea5e9" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-4">
          <div className="font-semibold text-slate-800 mb-3">Critical Patients</div>
          {critical.length === 0 ? (
            <div className="text-sm text-slate-500 text-center py-8">No P1 patients</div>
          ) : (
            <div className="space-y-2">
              {critical.map((p: any) => (
                <Link to={"/patient/"+p.id} key={p.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50">
                  <div>
                    <div className="text-sm font-semibold text-slate-800">{p.patient_code}</div>
                    <div className="text-xs text-slate-500">{p.chief_complaint}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <PriorityBadge p={p.triage?.priority} />
                    <RiskBadge r={p.triage?.deterioration_risk} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
