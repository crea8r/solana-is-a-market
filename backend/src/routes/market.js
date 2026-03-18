import { Router } from "express";
import { fetchSolanaMarket } from "../adapters/tokensCrawler.js";
import { fetchTradFiMarket } from "../adapters/tradfiYahoo.js";
import { getCache, isFresh, setCache } from "../services/cache.js";

const router = Router();
const TTL_MS = Number(process.env.SCRAPE_INTERVAL_MS || 30000);
const MAX_POINTS = 120;
const history = [];

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

function pushHistory(point) {
  history.push(point);
  if (history.length > MAX_POINTS) history.shift();
}

function pearson(xs, ys) {
  const n = Math.min(xs.length, ys.length);
  if (n < 3) return null;
  const x = xs.slice(-n);
  const y = ys.slice(-n);

  const mx = x.reduce((a, b) => a + b, 0) / n;
  const my = y.reduce((a, b) => a + b, 0) / n;

  let num = 0;
  let dx2 = 0;
  let dy2 = 0;

  for (let i = 0; i < n; i++) {
    const dx = x[i] - mx;
    const dy = y[i] - my;
    num += dx * dy;
    dx2 += dx * dx;
    dy2 += dy * dy;
  }

  const den = Math.sqrt(dx2 * dy2);
  if (!den) return null;
  return num / den;
}

async function load() {
  if (isFresh("canvas", TTL_MS)) return getCache("canvas").value;

  const [solana, tradfi] = await Promise.all([fetchSolanaMarket(), fetchTradFiMarket()]);
  const solanaAvg = averageChange(solana.rows);
  const tradfiAvg = averageChange(tradfi.rows);

  const point = {
    ts: new Date().toISOString(),
    solanaAvgChangePct: solanaAvg,
    tradfiAvgChangePct: tradfiAvg,
  };
  pushHistory(point);

  const paired = history.filter(
    (h) => Number.isFinite(h.solanaAvgChangePct) && Number.isFinite(h.tradfiAvgChangePct)
  );

  const payload = {
    asOf: new Date().toISOString(),
    regime: regime(solanaAvg, tradfiAvg),
    relative: {
      solanaAvgChangePct: solanaAvg,
      tradfiAvgChangePct: tradfiAvg,
      spreadPct: solanaAvg != null && tradfiAvg != null ? solanaAvg - tradfiAvg : null,
      rollingCorrelation: pearson(
        paired.map((h) => h.solanaAvgChangePct),
        paired.map((h) => h.tradfiAvgChangePct)
      ),
    },
    history: {
      points: history,
      sampleSize: paired.length,
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
