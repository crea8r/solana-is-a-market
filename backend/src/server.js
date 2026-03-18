import "dotenv/config";
import express from "express";
import cors from "cors";
import marketRouter from "./routes/market.js";

const app = express();
const PORT = Number(process.env.PORT || 8787);

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

app.use("/api/market", marketRouter);

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
