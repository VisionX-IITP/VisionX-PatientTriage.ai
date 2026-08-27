export interface Vitals {
  heart_rate: number; systolic_bp: number; diastolic_bp: number;
  spo2: number; respiratory_rate: number; temperature: number;
}
export interface RuleInput {
  age: number; vitals: Vitals; pain_score: number; consciousness?: string;
  chief_complaint?: string; waiting_minutes: number;
}
export interface RuleOutput {
  criticalFlags: string[];
  vitalInstability: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  waitingRisk: "LOW" | "MEDIUM" | "HIGH";
  contextRisk: "LOW" | "MEDIUM" | "HIGH";
  suggestedPriority: number;
  suggestedPathway: string;
  reassessmentMinutes: number;
}

export function runRules(i: RuleInput): RuleOutput {
  const v = i.vitals;
  const critical: string[] = [];

  if (v.spo2 < 88) critical.push("Critical hypoxia (SpO2<88%)");
  if (v.systolic_bp < 85) critical.push("Severe hypotension");
  if (v.heart_rate > 140 || v.heart_rate < 40) critical.push("Extreme HR");
  if (v.respiratory_rate > 30 || v.respiratory_rate < 8) critical.push("Severe respiratory distress");
  if (v.temperature >= 40 || v.temperature <= 34) critical.push("Extreme temperature");
  if (i.consciousness && i.consciousness !== "Alert") critical.push("Altered consciousness: " + i.consciousness);
  const cc = (i.chief_complaint || "").toLowerCase();
  if (/chest pain|stroke|unresponsive|cardiac arrest|seizure|anaphylaxis/.test(cc)) critical.push("Red-flag complaint");

  let vScore = 0;
  if (v.spo2 < 94) vScore += 2;
  if (v.spo2 < 90) vScore += 2;
  if (v.respiratory_rate > 22) vScore += 1;
  if (v.respiratory_rate > 28) vScore += 2;
  if (v.heart_rate > 110) vScore += 1;
  if (v.heart_rate > 130) vScore += 2;
  if (v.systolic_bp < 100) vScore += 1;
  if (v.systolic_bp < 90) vScore += 2;
  if (v.temperature >= 39) vScore += 1;
  if (v.temperature <= 35.5) vScore += 2;

  const vitalInstability = vScore >= 6 ? "CRITICAL" : vScore >= 4 ? "HIGH" : vScore >= 2 ? "MEDIUM" : "LOW";
  const waitingRisk = i.waiting_minutes > 120 ? "HIGH" : i.waiting_minutes > 45 ? "MEDIUM" : "LOW";
  const ageRisk = i.age >= 75 || i.age <= 2;
  const contextRisk = ageRisk || i.pain_score >= 8 ? "HIGH" : i.pain_score >= 5 ? "MEDIUM" : "LOW";

  let priority = 4;
  if (critical.length > 0) priority = 1;
  else if (vitalInstability === "CRITICAL") priority = 1;
  else if (vitalInstability === "HIGH") priority = 2;
  else if (vitalInstability === "MEDIUM") priority = 3;
  else if (i.pain_score >= 7 || contextRisk === "HIGH") priority = 3;
  else priority = 4;
  if (waitingRisk === "HIGH" && priority > 2) priority -= 1;

  let pathway = "General";
  if (v.spo2 < 94 || v.respiratory_rate > 22 || /breath|dyspn|asthma|cough/.test(cc)) pathway = "Respiratory";
  else if (/chest|cardiac|palpitation/.test(cc)) pathway = "Cardiac";
  else if (/stroke|weakness|numbness|seizure/.test(cc)) pathway = "Neurological";
  else if (/trauma|fracture|injury|bleed/.test(cc)) pathway = "Trauma";
  else if (/fever|infection|sepsis/.test(cc) || v.temperature >= 39) pathway = "Infectious";
  else if (/abdominal|nausea|vomit/.test(cc)) pathway = "Abdominal";

  const reassessMap: Record<number, number> = {1:5, 2:10, 3:30, 4:60, 5:120};
  return {
    criticalFlags: critical,
    vitalInstability,
    waitingRisk,
    contextRisk,
    suggestedPriority: priority,
    suggestedPathway: pathway,
    reassessmentMinutes: reassessMap[priority]
  };
}

export const priorityLabel = (p: number) =>
  ({1:"RESUSCITATION",2:"EMERGENT",3:"URGENT",4:"LESS URGENT",5:"NON-URGENT"} as any)[p] || "UNKNOWN";
