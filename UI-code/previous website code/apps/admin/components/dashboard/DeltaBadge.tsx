// filepath: apps/admin/components/dashboard/DeltaBadge.tsx
"use client";

export default function DeltaBadge({ value, onPrimary = false }: { value: number; onPrimary?: boolean }) {
  const up = value >= 0;
  const color = onPrimary
    ? up ? "bg-emerald-400/20 text-emerald-100" : "bg-rose-400/20 text-rose-100"
    : up ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700";
  const sign = up ? "▲" : "▼";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs ${color}`}>
      {sign} {Math.abs(value).toFixed(1)}%
    </span>
  );
}
