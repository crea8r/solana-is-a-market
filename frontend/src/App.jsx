import { useEffect, useMemo, useState } from 'react';
import MarketTable from './components/MarketTable';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8787';

function badgeStyle(regime) {
  if (regime === 'RISK-ON') return 'bg-emerald-500/20 text-emerald-300 border-emerald-700';
  if (regime === 'RISK-OFF') return 'bg-rose-500/20 text-rose-300 border-rose-700';
  if (regime === 'DIVERGENCE') return 'bg-amber-500/20 text-amber-300 border-amber-700';
  return 'bg-zinc-700/20 text-zinc-300 border-zinc-600';
}

export default function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch(`${API_BASE}/api/market/canvas`);
    const json = await res.json();
    setData(json);
    setLoading(false);
  }

  useEffect(() => {
    load().catch(() => setLoading(false));
    const id = setInterval(() => load().catch(() => {}), 30000);
    return () => clearInterval(id);
  }, []);

  const subtitle = useMemo(() => {
    if (!data) return 'Loading unified market view...';
    const spread = data?.relative?.spreadPct;
    const spreadTxt = spread == null ? '-' : `${spread > 0 ? '+' : ''}${spread.toFixed(2)}%`;
    return `Spread (Solana - TradFi): ${spreadTxt}`;
  }, [data]);

  return (
    <main className="min-h-screen bg-zinc-950 p-4 text-zinc-100 md:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold md:text-3xl">Solana vs Earth Market</h1>
            <p className="text-zinc-400">{subtitle}</p>
          </div>
          <div className={`w-fit rounded-full border px-3 py-1 text-sm font-semibold ${badgeStyle(data?.regime)}`}>
            {data?.regime || 'UNKNOWN'}
          </div>
        </header>

        {loading ? (
          <div className="rounded-2xl border border-zinc-800 p-6 text-zinc-400">Loading canvas...</div>
        ) : (
          <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <MarketTable title="Solana Pulse" rows={data?.solana?.rows || []} />
            <MarketTable title="TradFi Pulse" rows={data?.tradfi?.rows || []} />
          </section>
        )}

        <footer className="mt-5 text-xs text-zinc-500">
          Last updated: {data?.asOf ? new Date(data.asOf).toLocaleString() : '-'}
        </footer>
      </div>
    </main>
  );
}
