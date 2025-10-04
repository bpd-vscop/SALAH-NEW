// filepath: apps/admin/components/dashboard/SalesGauge.tsx
"use client";

import { ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

export default function SalesGauge({ percent, loading }: { percent: number; loading?: boolean }) {
  const p = loading ? 0 : Math.max(0, Math.min(100, percent));
  // Build 18 segments like the reference arc; filled proportional to p
  const segments = Array.from({ length: 18 }).map((_, i) => ({
    key: i,
    value: 1,
    active: i < Math.round((p / 100) * 18),
  }));
  return (
    <div className="h-[220px] w-full">
      <div className="mb-2 text-center text-2xl font-bold">{p.toFixed(1)}%</div>
      <div className="text-center text-xs text-muted-foreground -mt-1">Sales Growth</div>
      <ResponsiveContainer width="100%" height="80%">
        <PieChart>
          <Pie
            data={segments}
            innerRadius={60}
            outerRadius={80}
            startAngle={210}
            endAngle={-30}
            dataKey="value"
          >
            {segments.map((s) => (
              <Cell
                key={s.key}
                fill={s.active ? "#2563eb" : "#e5e7eb"}
                stroke="transparent"
              />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
