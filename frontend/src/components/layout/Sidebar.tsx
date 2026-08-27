import { NavLink } from "react-router-dom";
import { Activity, Users, UserPlus, Bell, BarChart3, FileText, Zap, Settings, HeartPulse, LogOut } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const items = [
  { to: "/", label: "Command Center", icon: Activity },
  { to: "/queue", label: "Patient Queue", icon: Users },
  { to: "/add", label: "Add Patient", icon: UserPlus },
  { to: "/alerts", label: "Alerts", icon: Bell },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/audit", label: "Audit Logs", icon: FileText },
  { to: "/simulation", label: "Simulation", icon: Zap },
  { to: "/settings", label: "Settings", icon: Settings },
  { to: "/health", label: "System Health", icon: HeartPulse }
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-screen">
      <div className="p-5 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-600 to-blue-500 flex items-center justify-center text-white font-bold">P</div>
          <div>
            <div className="font-bold text-slate-900">PatientTriage</div>
            <div className="text-xs text-slate-500">.ai Command Center</div>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={to==="/"} className={({isActive}) =>
            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition " + (isActive ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50")
          }>
            <Icon size={18} /> {label}
          </NavLink>
        ))}
      </nav>
      <div className="p-3 border-t border-slate-200 space-y-2">
        <div className="px-3 py-2 rounded-lg bg-slate-50">
          <div className="text-xs text-slate-500">Signed in as</div>
          <div className="text-sm font-semibold text-slate-800">{user?.full_name}</div>
          <div className="text-xs text-indigo-600 uppercase">{user?.role}</div>
        </div>
        <button onClick={logout} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100">
          <LogOut size={16} /> Logout
        </button>
      </div>
    </aside>
  );
}
