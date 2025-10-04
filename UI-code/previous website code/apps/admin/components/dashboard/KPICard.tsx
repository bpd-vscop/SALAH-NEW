// filepath: apps/admin/components/dashboard/KPICard.tsx
"use client";

import { cn } from "@automotive/ui/lib/utils";
import { ShoppingCart, Users, DollarSign } from "lucide-react";
import DeltaBadge from "./DeltaBadge";

type IconName = "cart" | "users" | "dollar";
const IconMap: Record<IconName, any> = {
  cart: ShoppingCart,
  users: Users,
  dollar: DollarSign,
};

export default function KPICard({
  title,
  value,
  delta,
  caption,
  icon = "cart",
  tone = "neutral",
  loading = false,
}: {
  title: string;
  value: string | number;
  delta?: number; // +/- percentage
  caption?: string;
  icon?: IconName;
  tone?: "primary" | "neutral";
  loading?: boolean;
}) {
  const Icon = IconMap[icon];
  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-5 shadow-sm",
        tone === "primary" && "bg-gradient-to-br from-blue-600 to-indigo-500 text-white"
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className={cn("text-xs", tone === "primary" ? "text-blue-100" : "text-muted-foreground")}>
            {title}
          </div>
          <div className="mt-2 text-3xl font-bold leading-none">{loading ? "—" : value}</div>
        </div>
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-full",
            tone === "primary" ? "bg-white/20" : "bg-blue-50 text-blue-600"
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <DeltaBadge value={delta ?? 0} onPrimary={tone === "primary"} />
        <div className={cn("text-xs", tone === "primary" ? "text-blue-100" : "text-muted-foreground")}>
          {caption}
        </div>
      </div>
    </div>
  );
}
