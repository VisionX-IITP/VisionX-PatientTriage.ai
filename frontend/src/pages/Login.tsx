import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("nurse@demo.com");
  const [password, setPassword] = useState("demo1234");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: any) => {
    e.preventDefault(); setErr(""); setLoading(true);
    try { await login(email, password); nav("/"); }
    catch (e: any) { setErr(e.response?.data?.error || "Login failed"); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-indigo-50 p-6">
      <div className="w-full max-w-md card p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-500 flex items-center justify-center text-white font-bold text-lg">P</div>
          <div>
            <div className="font-bold text-slate-900 text-lg">PatientTriage.ai</div>
            <div className="text-xs text-slate-500">ED Command Center</div>
          </div>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-sm text-slate-700 font-medium">Email</label>
            <input value={email} onChange={e=>setEmail(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="text-sm text-slate-700 font-medium">Password</label>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          {err && <div className="text-sm text-red-600 bg-red-50 p-2 rounded">{err}</div>}
          <button disabled={loading} className="btn btn-primary w-full justify-center">{loading?"Signing in...":"Sign In"}</button>
        </form>
        <div className="mt-6 text-xs text-slate-500 border-t pt-4">
          <div className="font-semibold text-slate-600 mb-2">Demo Accounts (password: demo1234)</div>
          <div>nurse@demo.com - doctor@demo.com - admin@demo.com</div>
        </div>
      </div>
    </div>
  );
}
