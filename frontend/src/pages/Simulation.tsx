import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../services/api";
import { Play, Pause, Zap } from "lucide-react";

export default function Simulation() {
  const qc = useQueryClient();
  const { data: s } = useQuery({ queryKey:["simstatus"], queryFn: async()=>(await api.get("/simulation/status")).data });
  const start = async (mode: string, speed=1) => { await api.post("/simulation/start", { mode, speed }); qc.invalidateQueries(); };
  const stop = async () => { await api.post("/simulation/stop"); qc.invalidateQueries(); };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Simulation Center</h1>
      <div className="card p-6">
        <div className="mb-4">
          Status: {s?.running ? <span className="badge bg-green-100 text-green-700">Running - {s.mode.toUpperCase()}</span> : <span className="badge bg-slate-100">Stopped</span>}
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={()=>start("normal",1)} className="btn btn-secondary"><Play size={14}/> Normal</button>
          <button onClick={()=>start("surge",2)} className="btn btn-primary"><Zap size={14}/> SIMULATE 3x SURGE</button>
          <button onClick={()=>start("extreme",3)} className="btn btn-danger"><Zap size={14}/> Extreme Surge</button>
          <button onClick={stop} className="btn btn-secondary"><Pause size={14}/> Stop</button>
        </div>
        <div className="mt-4 text-xs text-slate-500">
          Simulation generates synthetic patient arrivals, vital changes, deteriorations, alerts, and queue reordering.
          All records are marked SIMULATED DATA.
        </div>
      </div>
    </div>
  );
}
