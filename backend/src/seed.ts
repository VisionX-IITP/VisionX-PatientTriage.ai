import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config();
import bcrypt from "bcryptjs";
import { supabase } from "./config/supabase";
import { assessPatient } from "./services/triageService";

async function main() {
  console.log("Seeding users...");
  const users = [
    { email: "nurse@demo.com",  password: "demo1234", full_name: "Nurse Nia",    role: "nurse" },
    { email: "doctor@demo.com", password: "demo1234", full_name: "Dr. Rivera",   role: "doctor" },
    { email: "admin@demo.com",  password: "demo1234", full_name: "Admin Adama",  role: "admin" }
  ];
  for (const u of users) {
    const hash = await bcrypt.hash(u.password, 10);
    const { data: existing } = await supabase.from("users").select("id").eq("email", u.email).maybeSingle();
    if (!existing) {
      await supabase.from("users").insert({ email: u.email, password_hash: hash, full_name: u.full_name, role: u.role });
    }
  }

  console.log("Clearing existing simulated patients...");
  await supabase.from("patients").delete().eq("is_simulated", true);

  console.log("Seeding 20 simulated patients...");
  const cases = [
    { age:67, sex:"M", chief:"Breathing difficulty",     pain:6, hr:118, sbp:98,  dbp:62, spo2:88, rr:26, temp:38.6, hist:"COPD, HTN" },
    { age:82, sex:"F", chief:"Chest pain",               pain:9, hr:112, sbp:88,  dbp:55, spo2:92, rr:24, temp:37.1, hist:"CAD, DM" },
    { age:45, sex:"M", chief:"Abdominal pain",           pain:7, hr:96,  sbp:128, dbp:82, spo2:98, rr:18, temp:37.4, hist:"None" },
    { age:31, sex:"F", chief:"Migraine",                 pain:8, hr:80,  sbp:118, dbp:76, spo2:99, rr:16, temp:36.9, hist:"Migraine" },
    { age:6,  sex:"M", chief:"High fever",               pain:4, hr:130, sbp:95,  dbp:60, spo2:96, rr:24, temp:39.4, hist:"Asthma" },
    { age:78, sex:"F", chief:"Confusion, weakness",      pain:2, hr:105, sbp:92,  dbp:58, spo2:94, rr:22, temp:38.8, hist:"CKD, HTN" },
    { age:24, sex:"M", chief:"Ankle injury",             pain:5, hr:88,  sbp:125, dbp:80, spo2:99, rr:16, temp:36.7, hist:"None" },
    { age:55, sex:"F", chief:"Palpitations",             pain:3, hr:132, sbp:115, dbp:75, spo2:97, rr:18, temp:36.9, hist:"AFib" },
    { age:70, sex:"M", chief:"Stroke symptoms",          pain:0, hr:98,  sbp:170, dbp:105,spo2:96, rr:20, temp:37.0, hist:"HTN, DM" },
    { age:38, sex:"F", chief:"Nausea and vomiting",      pain:4, hr:92,  sbp:110, dbp:70, spo2:98, rr:16, temp:37.2, hist:"None" },
    { age:2,  sex:"M", chief:"Difficulty breathing",     pain:0, hr:150, sbp:88,  dbp:55, spo2:90, rr:38, temp:38.9, hist:"Bronchiolitis" },
    { age:29, sex:"F", chief:"Sore throat",              pain:3, hr:78,  sbp:118, dbp:76, spo2:99, rr:14, temp:37.8, hist:"None" },
    { age:60, sex:"M", chief:"Back pain",                pain:6, hr:82,  sbp:135, dbp:85, spo2:98, rr:16, temp:36.8, hist:"HTN" },
    { age:19, sex:"F", chief:"Anxiety attack",           pain:0, hr:108, sbp:122, dbp:78, spo2:99, rr:22, temp:36.9, hist:"Anxiety" },
    { age:85, sex:"M", chief:"Fall, head injury",        pain:7, hr:96,  sbp:118, dbp:72, spo2:95, rr:18, temp:36.6, hist:"Warfarin" },
    { age:42, sex:"F", chief:"Allergic reaction",        pain:2, hr:110, sbp:95,  dbp:60, spo2:93, rr:22, temp:37.0, hist:"Nut allergy" },
    { age:50, sex:"M", chief:"Kidney stone",             pain:9, hr:100, sbp:145, dbp:88, spo2:98, rr:18, temp:37.1, hist:"Recurrent stones" },
    { age:8,  sex:"F", chief:"Ear pain",                 pain:5, hr:100, sbp:100, dbp:65, spo2:99, rr:20, temp:38.2, hist:"None" },
    { age:34, sex:"M", chief:"Laceration hand",          pain:5, hr:86,  sbp:126, dbp:80, spo2:99, rr:16, temp:36.8, hist:"None" },
    { age:73, sex:"F", chief:"Severe dehydration",       pain:3, hr:118, sbp:88,  dbp:58, spo2:95, rr:22, temp:38.1, hist:"Diabetes" }
  ];

  for (let i=0;i<cases.length;i++) {
    const c = cases[i];
    const code = "SIM-" + (1000+i);
    const arrivalOffset = Math.floor(Math.random()*90);
    const arrival = new Date(Date.now() - arrivalOffset*60000).toISOString();
    const { data: p } = await supabase.from("patients").insert({
      patient_code: code, age: c.age, sex: c.sex,
      chief_complaint: c.chief, pain_score: c.pain, medical_history: c.hist,
      consciousness: "Alert", is_simulated: true, status: "Waiting",
      arrival_time: arrival
    }).select().single();
    if (!p) continue;
    await supabase.from("patient_vitals").insert({
      patient_id: p.id, heart_rate: c.hr, systolic_bp: c.sbp, diastolic_bp: c.dbp,
      spo2: c.spo2, respiratory_rate: c.rr, temperature: c.temp
    });
    try { await assessPatient(p.id); } catch(e:any) { console.log("assess failed for",code,e.message); }
    process.stdout.write(".");
  }
  console.log("\nDone.");
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
