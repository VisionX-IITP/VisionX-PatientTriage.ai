import axios from "axios";

export async function generateExplanation(ctx: any): Promise<string> {
  const key = process.env.LLM_API_KEY;
  const deterministic = buildTemplate(ctx);

  if (!key) return deterministic;

  try {
    const model = process.env.LLM_MODEL || "gpt-4o-mini";
    const prompt = "You are a clinical decision-support assistant. Explain in 2-3 sentences the triage recommendation. Do NOT diagnose or prescribe. Data: " + JSON.stringify(ctx);
    const r = await axios.post("https://api.openai.com/v1/chat/completions", {
      model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 180,
      temperature: 0.3
    }, {
      headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
      timeout: 8000
    });
    return r.data.choices[0].message.content.trim();
  } catch {
    return deterministic;
  }
}

function buildTemplate(c: any): string {
  const factors = (c.key_factors || []).join(", ");
  return "Priority P" + c.priority + " (" + c.priority_label + ") assigned with " + c.risk_level + " deterioration risk (probability " + (c.risk_probability*100).toFixed(0) + "%). Primary drivers: " + (factors || "vital sign pattern") + ". Recommended pathway: " + c.care_pathway + ". Reassess in " + c.reassessment_minutes + " minutes. Clinical review is recommended before final disposition.";
}
