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

          parsed.push({
            symbol,
            name: tds[0],
            last: tds.find((x) => x.includes("$")) || null,
            changePct: tds.find((x) => x.includes("%")) || null,
            volume: tds.find((x) => /vol|volume|\$[\d,.]+/i.test(x)) || null,
            liquidity: tds.find((x) => /liq|liquidity|\$[\d,.]+/i.test(x)) || null,
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

function fallbackSolanaRows() {
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
      rows: rows.length ? rows : fallbackSolanaRows(),
    };
  } catch {
    return {
      market: "solana",
      asOf: new Date().toISOString(),
      rows: fallbackSolanaRows(),
      warning: "tokens.xyz crawl failed; using fallback rows",
    };
  }
}
