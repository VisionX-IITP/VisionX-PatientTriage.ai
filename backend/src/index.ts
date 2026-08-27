import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config();
import routes from "./routes";

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/", (_req, res) => res.json({ service: "PatientTriage API", version: "1.0.0" }));
app.use("/api", routes);

app.use((err: any, _req: any, res: any, _next: any) => {
  console.error(err);
  res.status(500).json({ error: err.message || "Internal error" });
});

const PORT = Number(process.env.PORT) || 4000;
app.listen(PORT, () => console.log("Backend running http://localhost:" + PORT));
