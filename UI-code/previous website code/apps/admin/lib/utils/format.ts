// filepath: apps/admin/lib/utils/format.ts
export function formatCurrency(value: number, currency: string = "USD") {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value ?? 0);
  } catch {
    return `$${Number(value ?? 0).toFixed(2)}`;
  }
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value ?? 0);
}
