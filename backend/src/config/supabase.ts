import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config();

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.warn("[WARN] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set. Backend will fail on DB calls.");
}

export const supabase = createClient(url || "http://localhost", key || "placeholder", {
  auth: { persistSession: false }
});
