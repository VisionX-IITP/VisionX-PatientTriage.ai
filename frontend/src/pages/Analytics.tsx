import { useQuery } from "@tanstack/react-query";
import api from "../services/api";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from "recharts";
const COLORS = ["#ef4444","#f97316","#eab308","#22c55e","#3b82f6"];
const RISK: any = { HIGH:"#ef4444", MEDIUM:"#f97316", LOW:"#22c55e" };

export default function Analytics() {
  const { data: a } = useQuery({ queryKey:["analytics"], queryFn: async()=>(await api.get("/analytics")).data });
  if (!a) return <div className="p-8 text-slate-500 text-center">Loading...</div>;
  const Kpi = ({label,value}:any)=><div className="card p-4"><div className="text-xs uppercase text-slate-500">{label}</div><div className="text-2xl font-bold">{value}</div></div>;
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Analytics</h1>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Kpi label="Total" value={a.kpi.total_patients} />
        <Kpi label="Avg Wait" value={a.kpi.avg_wait + "m"} />
        <Kpi label="Longest Wait" value={a.kpi.longest_wait + "m"} />
        <Kpi label="P1+P2" value={a.kpi.p1_p2_count} />
        <Kpi label="Reassessments" value={a.kpi.reassessments} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-4">
          <div className="font-semibold mb-2">Priority Distribution</div>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart><Pie data={a.priority_distribution} dataKey="count" nameKey="priority" outerRadius={100} label>
              {a.priority_distribution.map((_:any,i:number)=><Cell key={i} fill={COLORS[i]}/>)}
            </Pie><Tooltip/><Legend/></PieChart>
          </ResponsiveContainer>
        </div>
        <div className="card p-4">
          <div className="font-semibold mb-2">Risk Distribution</div>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart><Pie data={a.risk_distribution} dataKey="count" nameKey="risk" outerRadius={100} label>
              {a.risk_distribution.map((r:any,i:number)=><Cell key={i} fill={RISK[r.risk]}/>)}
            </Pie><Tooltip/><Legend/></PieChart>
          </ResponsiveContainer>
        </div>
        <div className="card p-4 lg:col-span-2">
          <div className="font-semibold mb-2">Waiting Time by Priority</div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={a.waiting_by_priority}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="priority"/><YAxis/><Tooltip/>
              <Bar dataKey="avg" fill="#6366f1"/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
