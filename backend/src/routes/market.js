import { Router } from "express";
import { fetchSolanaMarket } from "../adapters/tokensCrawler.js";
import { fetchTradFiMarket } from "../adapters/tradfiYahoo.js";
import { getCache, isFresh, setCache } from "../services/cache.js";

const router = Router();
const TTL_MS = Number(process.env.SCRAPE_INTERVAL_MS || 30000);

function averageChange(rows) {
  const vals = rows.map((r) => r.changePct).filter((x) => Number.isFinite(x));
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function regime(solanaAvg, tradfiAvg) {
  if (solanaAvg == null || tradfiAvg == null) return "UNKNOWN";
  if (solanaAvg > 0 && tradfiAvg > 0) return "RISK-ON";
  if (solanaAvg < 0 && tradfiAvg < 0) return "RISK-OFF";
  return "DIVERGENCE";
}

async function load() {
  if (isFresh("canvas", TTL_MS)) return getCache("canvas").value;

  const [solana, tradfi] = await Promise.all([fetchSolanaMarket(), fetchTradFiMarket()]);
  const solanaAvg = averageChange(solana.rows);
  const tradfiAvg = averageChange(tradfi.rows);

  const payload = {
    asOf: new Date().toISOString(),
    regime: regime(solanaAvg, tradfiAvg),
    relative: {
      solanaAvgChangePct: solanaAvg,
      tradfiAvgChangePct: tradfiAvg,
      spreadPct: solanaAvg != null && tradfiAvg != null ? solanaAvg - tradfiAvg : null,
    },
    solana,
    tradfi,
  };

  setCache("canvas", payload);
  return payload;
}

router.get("/solana", async (_req, res) => {
  const payload = await load();
  res.json(payload.solana);
});

router.get("/tradfi", async (_req, res) => {
  const payload = await load();
  res.json(payload.tradfi);
});

router.get("/canvas", async (_req, res) => {
  const payload = await load();
  res.json(payload);
});

export default router;
