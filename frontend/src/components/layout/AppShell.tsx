import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function AppShell({ children }: any) {
  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto">
          <div className="p-6">
            <div className="mb-4 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              WARNING: PatientTriage.ai is a clinical decision-support prototype using simulated data. It does not diagnose, prescribe treatment, or replace qualified clinical judgment.
            </div>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
