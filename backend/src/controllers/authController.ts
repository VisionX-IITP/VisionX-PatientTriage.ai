import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { supabase } from "../config/supabase";

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;
  const { data: user } = await supabase.from("users").select("*").eq("email", email).single();
  if (!user) return res.status(401).json({ error: "Invalid credentials" });
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });
  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role, full_name: user.full_name },
    process.env.JWT_SECRET || "dev-secret",
    { expiresIn: "12h" }
  );
  res.json({ token, user: { id: user.id, email: user.email, role: user.role, full_name: user.full_name } });
}

export async function me(req: any, res: Response) {
  res.json({ user: req.user });
}
