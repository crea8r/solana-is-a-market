function pathFromSeries(series, width = 320, height = 72, pad = 6) {
  const vals = series.filter((v) => Number.isFinite(v));
  if (!vals.length) return '';
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;

  return vals
    .map((v, i) => {
      const x = pad + (i / Math.max(vals.length - 1, 1)) * (width - pad * 2);
      const y = height - pad - ((v - min) / range) * (height - pad * 2);
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
}

export default function Sparkline({ title, series = [], color = '#60a5fa' }) {
  const d = pathFromSeries(series);
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
      <p className="mb-2 text-xs text-zinc-400">{title}</p>
      <svg viewBox="0 0 320 72" className="w-full">
        <path d={d} fill="none" stroke={color} strokeWidth="2.2" />
      </svg>
    </div>
  );
}
