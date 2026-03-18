import axios from "axios";
import { chromium } from "playwright";
import { toNumber } from "../utils/parse.js";

const TOKENS_URL = process.env.TOKENS_URL || "https://www.tokens.xyz/";

function normalizeRow(row) {
  return {
    symbol: row.symbol,
    name: row.name || row.symbol,
    last: row.last,
    changePct: row.changePct,
    volume: row.volume,
    liquidity: row.liquidity,
    marketSession: "CRYPTO_24_7",
    source: "tokens.xyz",
  };
}

async function scrapeWithPlaywright() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });

  try {
    await page.goto(TOKENS_URL, { waitUntil: "domcontentloaded", timeout: 20000 });
    await page.waitForTimeout(2500);

    const rows = await page.evaluate(() => {
      const parsed = [];
      const tables = Array.from(document.querySelectorAll("table"));

      for (const table of tables) {
        const trs = Array.from(table.querySelectorAll("tbody tr"));
        for (const tr of trs.slice(0, 20)) {
          const tds = Array.from(tr.querySelectorAll("td")).map((x) => x.textContent?.trim() || "");
          if (tds.length < 3) continue;

          const symbol = (tds[0].match(/[A-Z0-9]{2,12}/)?.[0] || "").trim();
          if (!symbol) continue;

          const numericCell = tds.find((x, i) => i > 0 && /\d/.test(x) && !x.includes('%')) || null;
          parsed.push({
            symbol,
            name: tds[0],
            last: tds.find((x) => /\$\s*[\d,.]+/.test(x)) || numericCell,
            changePct: tds.find((x) => x.includes("%")) || null,
            volume: tds.find((x) => /vol|volume/i.test(x)) || tds.filter((x) => /\$\s*[\d,.]+/.test(x))[1] || null,
            liquidity: tds.find((x) => /liq|liquidity/i.test(x)) || tds.filter((x) => /\$\s*[\d,.]+/.test(x))[2] || null,
          });
        }
      }

      return parsed;
    });

    const normalized = rows
      .map((r) => ({
        ...r,
        last: toNumber(r.last, null),
        changePct: toNumber(r.changePct, null),
        volume: toNumber(r.volume, null),
        liquidity: toNumber(r.liquidity, null),
      }))
      .filter((r) => r.symbol)
      .map(normalizeRow)
      .slice(0, 30);

    return normalized;
  } finally {
    await page.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}

async function fallbackSolanaRows() {
  try {
    const { data } = await axios.get("https://api.dexscreener.com/latest/dex/search", {
      params: { q: "solana" },
      timeout: 10000,
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    const rows = (data?.pairs || [])
      .filter((p) => p?.chainId === "solana" && p?.baseToken?.symbol)
      .slice(0, 25)
      .map((p) => ({
        symbol: p.baseToken.symbol,
        name: p.baseToken.name || p.baseToken.symbol,
        last: p.priceUsd != null ? Number(p.priceUsd) : null,
        changePct: p.priceChange?.h24 != null ? Number(p.priceChange.h24) : null,
        volume: p.volume?.h24 != null ? Number(p.volume.h24) : null,
        liquidity: p.liquidity?.usd != null ? Number(p.liquidity.usd) : null,
        marketSession: "CRYPTO_24_7",
        source: "dexscreener-fallback",
      }));

    if (rows.length) return rows;
  } catch {}

  return [
    { symbol: "SOL", name: "Solana", last: null, changePct: null, volume: null, liquidity: null, marketSession: "CRYPTO_24_7", source: "fallback" },
    { symbol: "JUP", name: "Jupiter", last: null, changePct: null, volume: null, liquidity: null, marketSession: "CRYPTO_24_7", source: "fallback" },
    { symbol: "WIF", name: "dogwifhat", last: null, changePct: null, volume: null, liquidity: null, marketSession: "CRYPTO_24_7", source: "fallback" }
  ];
}

export async function fetchSolanaMarket() {
  try {
    const rows = await scrapeWithPlaywright();
    return {
      market: "solana",
      asOf: new Date().toISOString(),
      rows: rows.length ? rows : await fallbackSolanaRows(),
    };
  } catch {
    return {
      market: "solana",
      asOf: new Date().toISOString(),
      rows: await fallbackSolanaRows(),
      warning: "tokens.xyz crawl failed; using fallback rows",
    };
  }
}
