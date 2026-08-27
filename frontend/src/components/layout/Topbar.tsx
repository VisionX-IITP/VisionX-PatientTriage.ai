import { useState } from "react";
import { Search, Bell, Activity } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "../../services/api";

export default function Topbar() {
  const [q, setQ] = useState("");
  const nav = useNavigate();
  const { data: sim } = useQuery({ queryKey:["simstatus"], queryFn: async()=>(await api.get("/simulation/status")).data });
  const { data: alerts } = useQuery({ queryKey:["alertsCount"], queryFn: async()=>(await api.get("/alerts")).data });
  const active = (alerts||[]).filter((a:any)=>a.status==="active").length;

  return (
    <div className="h-16 bg-white border-b border-slate-200 flex items-center px-6 gap-4">
      <form onSubmit={e=>{e.preventDefault(); if(q.trim()) nav("/queue?q="+encodeURIComponent(q));}} className="flex-1 max-w-xl relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search patients, alerts, clinicians..." className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
      </form>
      <div className="text-xs px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200">
        Dept: <b>ED-Main</b> - Shift: <b>Day</b>
      </div>
      {sim?.running && (
        <div className={"text-xs px-3 py-1.5 rounded-lg font-semibold " + (sim.mode==="extreme"?"bg-red-100 text-red-700":sim.mode==="surge"?"bg-orange-100 text-orange-700":"bg-blue-100 text-blue-700")}>
          <Activity size={12} className="inline mr-1" /> {sim.mode.toUpperCase()} MODE
        </div>
      )}
      <button onClick={()=>nav("/alerts")} className="relative p-2 rounded-lg hover:bg-slate-100">
        <Bell size={18} className="text-slate-600" />
        {active > 0 && <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center">{active}</span>}
      </button>
    </div>
  );
}
