export function PriorityBadge({ p }: { p?: number }) {
  if (!p) return <span className="badge bg-slate-100 text-slate-600">-</span>;
  const map: any = {
    1: "bg-red-100 text-red-700",
    2: "bg-orange-100 text-orange-700",
    3: "bg-yellow-100 text-yellow-800",
    4: "bg-green-100 text-green-700",
    5: "bg-blue-100 text-blue-700"
  };
  return <span className={"badge " + map[p]}>P{p}</span>;
}
export function RiskBadge({ r }: { r?: string }) {
  if (!r) return <span className="badge bg-slate-100 text-slate-600">-</span>;
  const map: any = { HIGH:"bg-red-100 text-red-700", MEDIUM:"bg-orange-100 text-orange-700", LOW:"bg-green-100 text-green-700" };
  return <span className={"badge " + map[r]}>{r}</span>;
}
export function ConfidenceBar({ c }: { c?: number }) {
  const v = c ? Math.round(c*100) : 0;
  const color = v >= 80 ? "bg-green-500" : v >= 60 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
        <div className={"h-full " + color} style={{ width: v + "%" }} />
      </div>
      <span className="text-xs text-slate-600">{v}%</span>
    </div>
  );
}
