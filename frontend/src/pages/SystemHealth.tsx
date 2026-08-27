import { useQuery } from "@tanstack/react-query";
import api from "../services/api";

export default function SystemHealth() {
  const { data } = useQuery({ queryKey:["health"], queryFn: async()=>(await api.get("/system-health")).data });
  if (!data) return <div className="p-8 text-center text-slate-500">Loading...</div>;
  const Row = ({name, status, extra}:any) => (
    <div className="flex items-center justify-between p-4 border-b border-slate-100">
      <div>
        <div className="font-semibold">{name}</div>
        {extra && <div className="text-xs text-slate-500">{extra}</div>}
      </div>
      <span className={"badge " + (status==="operational"?"bg-green-100 text-green-700":status==="degraded"?"bg-yellow-100 text-yellow-700":"bg-red-100 text-red-700")}>{status}</span>
    </div>
  );
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">System Health</h1>
      <div className="card">
        <Row name="Backend API" status={data.backend.status} extra={"Latency ~" + data.backend.latency_ms + "ms"}/>
        <Row name="Database (Supabase)" status={data.database.status}/>
        <Row name="ML Service" status={data.ml_service.status} extra={"Model: " + data.ml_service.version + " - Loaded: " + data.ml_service.model_loaded}/>
        <Row name="AI Explanation" status={data.ai_service.status} extra={data.ai_service.note}/>
        <Row name="Simulation Engine" status={data.simulation_engine.status}/>
      </div>
    </div>
  );
}
