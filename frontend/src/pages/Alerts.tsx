import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../services/api";

export default function Alerts() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey:["alerts"], queryFn: async()=>(await api.get("/alerts")).data });
  const resolve = async (id: string) => { await api.post("/alerts/"+id+"/resolve"); qc.invalidateQueries({queryKey:["alerts"]}); };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-900">Alerts</h1>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b"><tr className="text-left text-xs uppercase text-slate-500">
            <th className="px-4 py-3">Type</th><th className="px-4 py-3">Severity</th><th className="px-4 py-3">Patient</th>
            <th className="px-4 py-3">Message</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Time</th><th></th>
          </tr></thead>
          <tbody>
            {(data || []).length === 0 && <tr><td colSpan={7} className="text-center py-10 text-slate-400">No alerts</td></tr>}
            {(data || []).map((a: any) => (
              <tr key={a.id} className="border-b hover:bg-slate-50">
                <td className="px-4 py-3 font-semibold">{a.type}</td>
                <td className="px-4 py-3">
                  <span className={"badge " + (a.severity==="high"?"bg-red-100 text-red-700":a.severity==="medium"?"bg-orange-100 text-orange-700":"bg-slate-100")}>{a.severity}</span>
                </td>
                <td className="px-4 py-3">{a.patients?.patient_code || "-"}</td>
                <td className="px-4 py-3 text-slate-600">{a.message}</td>
                <td className="px-4 py-3"><span className={"badge " + (a.status==="active"?"bg-yellow-100 text-yellow-700":"bg-green-100 text-green-700")}>{a.status}</span></td>
                <td className="px-4 py-3 text-xs text-slate-500">{new Date(a.created_at).toLocaleString()}</td>
                <td className="px-4 py-3">{a.status==="active" && <button onClick={()=>resolve(a.id)} className="text-indigo-600 text-xs">Resolve</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
