import axios from "axios";

const SYMBOLS = ["%5EIXIC", "QQQ", "AAPL", "MSFT", "NVDA", "AMZN", "GOOGL", "META"];

function fallbackRows() {
  return [
    { symbol: "^IXIC", name: "NASDAQ Composite", last: null, changePct: null, volume: null, marketSession: "UNKNOWN", source: "fallback" },
    { symbol: "QQQ", name: "Invesco QQQ", last: null, changePct: null, volume: null, marketSession: "UNKNOWN", source: "fallback" },
    { symbol: "AAPL", name: "Apple", last: null, changePct: null, volume: null, marketSession: "UNKNOWN", source: "fallback" },
    { symbol: "MSFT", name: "Microsoft", last: null, changePct: null, volume: null, marketSession: "UNKNOWN", source: "fallback" }
  ];
}

async function scrapeSymbol(symbolEncoded) {
  const url = `https://finance.yahoo.com/quote/${symbolEncoded}`;
  const { data: html } = await axios.get(url, {
    timeout: 10000,
    headers: {
      "User-Agent": "Mozilla/5.0",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });

  const m = html.match(/"price"\s*:\s*\{"raw"\s*:\s*([\d.\-]+)/i);
  const c = html.match(/"regularMarketChangePercent"\s*:\s*\{"raw"\s*:\s*([\d.\-]+)/i);
  const n = html.match(/<h1[^>]*>(.*?)<\/h1>/i);

  const symbol = decodeURIComponent(symbolEncoded);
  const last = m ? Number(m[1]) : null;
  const changePctRaw = c ? Number(c[1]) : null;
  const changePct = Number.isFinite(changePctRaw) && Math.abs(changePctRaw) <= 30 ? changePctRaw : null;

  return {
    symbol,
    name: n?.[1]?.replace(/<[^>]+>/g, "").trim() || symbol,
    last: Number.isFinite(last) ? last : null,
    changePct,
    volume: null,
    marketSession: "UNKNOWN",
    source: "yahoo-scrape",
  };
}

export async function fetchTradFiMarket() {
  try {
    const rows = [];
    for (const s of SYMBOLS) {
      try {
        rows.push(await scrapeSymbol(s));
      } catch {
        rows.push({ symbol: decodeURIComponent(s), name: decodeURIComponent(s), last: null, changePct: null, volume: null, marketSession: "UNKNOWN", source: "yahoo-scrape" });
      }
    }

    return {
      market: "tradfi",
      asOf: new Date().toISOString(),
      rows,
    };
  } catch {
    return {
      market: "tradfi",
      asOf: new Date().toISOString(),
      rows: fallbackRows(),
      warning: "tradfi fetch failed; using fallback rows",
    };
  }
}
