import { Router } from "express";
import { auth, requireRole } from "../middleware/auth";
import { login, me } from "../controllers/authController";
import { listPatients, getPatient, createPatient, reassess, decision } from "../controllers/patientController";
import { alerts, resolveAlert, auditLogs, analytics, systemHealth } from "../controllers/otherControllers";
import { startSim, stopSim, simStatus } from "../simulation/engine";

const r = Router();

r.post("/auth/login", login);
r.get("/auth/me", auth, me);

r.get("/patients", auth, listPatients);
r.get("/patients/:id", auth, getPatient);
r.post("/patients", auth, createPatient);
r.post("/patients/:id/reassess", auth, reassess);
r.post("/patients/:id/decision", auth, requireRole("doctor","admin"), decision);

r.get("/alerts", auth, alerts);
r.post("/alerts/:id/resolve", auth, resolveAlert);

r.get("/audit-logs", auth, auditLogs);
r.get("/analytics", auth, analytics);
r.get("/system-health", auth, systemHealth);

r.post("/simulation/start", auth, requireRole("admin","doctor"), async (req, res) => {
  const { mode="normal", speed=1 } = req.body;
  const s = await startSim(mode, speed);
  res.json(s);
});
r.post("/simulation/stop", auth, requireRole("admin","doctor"), (_req, res) => res.json(stopSim()));
r.get("/simulation/status", auth, (_req, res) => res.json(simStatus()));

export default r;
