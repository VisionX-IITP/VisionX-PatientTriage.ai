export default function Settings() {
  const sections = [
    { title: "Department", fields: [["Name","ED-Main"],["Capacity","40"],["Normal Arrival Rate","6/hr"],["Surge Threshold","18/hr"]] },
    { title: "AI Settings", fields: [["Confidence Threshold","0.60"],["Explanation Mode","Concise"],["Model","xgb-v1-prototype"]] },
    { title: "Triage", fields: [["Reassess P1","5 min"],["Reassess P2","10 min"],["Reassess P3","30 min"]] },
    { title: "Notifications", fields: [["Critical Alerts","On"],["Low Confidence","On"],["Surge","On"]] }
  ];
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Settings</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sections.map(s => (
          <div key={s.title} className="card p-6">
            <div className="font-semibold mb-3">{s.title}</div>
            <div className="space-y-2">
              {s.fields.map(([k,v]) => (
                <div key={k} className="flex justify-between text-sm border-b border-slate-100 py-1">
                  <span className="text-slate-500">{k}</span><span className="font-semibold">{v}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
