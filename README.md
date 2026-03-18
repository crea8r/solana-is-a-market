# Solana is a Market — Single Canvas

One dashboard that shows Solana market pulse shoulder-to-shoulder with major traditional markets.

## Architecture

- `backend/`: Express API + crawler-backed Solana adapter + TradFi adapter
- `frontend/`: React + Vite + Tailwind single-canvas UI

## Features (V1)

- Solana panel (crawler-backed fake API)
- TradFi panel (Yahoo quote endpoint)
- Unified schema for both sides
- Regime badge: `RISK-ON`, `RISK-OFF`, `DIVERGENCE`
- Data age + last updated

## Quick start

```bash
# terminal 1
cd backend
npm install
npm run dev

# terminal 2
cd frontend
npm install
npm run dev
```

Frontend default: http://localhost:5173
Backend default: http://localhost:8787

## Environment

Backend optional `.env`:

```bash
PORT=8787
TOKENS_URL=https://www.tokens.xyz/
SCRAPE_INTERVAL_MS=30000
```

## Endpoints

- `GET /health`
- `GET /api/market/canvas`
- `GET /api/market/solana`
- `GET /api/market/tradfi`

## Notes

- The Solana feed currently uses a crawler bridge because tokens.xyz has no official public API.
- Respect robots.txt / Terms, use conservative crawl intervals.
- If tokens.xyz markup changes, update selectors in `backend/src/adapters/tokensCrawler.js`.
