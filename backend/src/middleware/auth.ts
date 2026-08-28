import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthReq extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    full_name: string;
  };
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error(
      "JWT_SECRET must be configured and at least 32 characters long"
    );
  }

  return secret;
}

export function auth(
  req: AuthReq,
  res: Response,
  next: NextFunction
) {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "Unauthorized"
    });
  }

  const token = header.slice(7).trim();

  if (!token) {
    return res.status(401).json({
      error: "Unauthorized"
    });
  }

  try {
    const payload = jwt.verify(token, getJwtSecret());

    if (
      typeof payload !== "object" ||
      !payload ||
      typeof payload.id !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.role !== "string"
    ) {
      return res.status(401).json({
        error: "Invalid token"
      });
    }

    req.user = {
      id: payload.id,
      email: payload.email,
      role: payload.role,
      full_name:
        typeof payload.full_name === "string"
          ? payload.full_name
          : ""
    };

    next();
  } catch {
    return res.status(401).json({
      error: "Invalid or expired token"
    });
  }
}

export function requireRole(...roles: string[]) {
  return (
    req: AuthReq,
    res: Response,
    next: NextFunction
  ) => {
    if (!req.user) {
      return res.status(401).json({
        error: "Unauthorized"
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: "Forbidden"
      });
    }

    next();
  };
}
