import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthReq extends Request {
  user?: { id: string; email: string; role: string; full_name: string };
}

export function auth(req: AuthReq, res: Response, next: NextFunction) {
  const h = req.headers.authorization;
  if (!h || !h.startsWith("Bearer ")) return res.status(401).json({ error: "Unauthorized" });
  try {
    const payload = jwt.verify(h.slice(7), process.env.JWT_SECRET || "dev-secret") as any;
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

export function requireRole(...roles: string[]) {
  return (req: AuthReq, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) return res.status(403).json({ error: "Forbidden" });
    next();
  };
}
