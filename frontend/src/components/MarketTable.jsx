function fmt(n, digits = 2) {
  if (n == null || Number.isNaN(n)) return '-';
  return Number(n).toLocaleString(undefined, { maximumFractionDigits: digits });
}

function pct(n) {
  if (n == null || Number.isNaN(n)) return '-';
  const val = Number(n);
  return `${val > 0 ? '+' : ''}${val.toFixed(2)}%`;
}

export default function MarketTable({ title, rows = [] }) {
  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>
      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead className="text-zinc-400">
            <tr>
              <th className="py-2 text-left">Symbol</th>
              <th className="py-2 text-left">Last</th>
              <th className="py-2 text-left">24h %</th>
              <th className="py-2 text-left">Volume</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr key={`${r.symbol}-${idx}`} className="border-t border-zinc-800">
                <td className="py-2 font-medium">{r.symbol}</td>
                <td className="py-2">{fmt(r.last)}</td>
                <td className={`py-2 ${r.changePct > 0 ? 'text-emerald-400' : r.changePct < 0 ? 'text-rose-400' : 'text-zinc-300'}`}>
                  {pct(r.changePct)}
                </td>
                <td className="py-2">{fmt(r.volume, 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
