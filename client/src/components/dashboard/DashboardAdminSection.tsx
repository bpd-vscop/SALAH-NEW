import { useMemo, useState } from 'react';
import { AlertTriangle, MessageSquare, Package, ShoppingCart, Timer, TrendingUp } from 'lucide-react';
import type { Order, OrderStatus, Product } from '../../types/api';
import { formatCurrency, formatTimestamp } from '../../utils/format';

const DAY_MS = 24 * 60 * 60 * 1000;
const THIRTY_DAYS_MS = 30 * DAY_MS;

const formatCount = (value: number) => new Intl.NumberFormat('en-US').format(value);
const formatShortDate = (value: Date) =>
  new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(value);
const formatMonthLabel = (value: Date, includeYear: boolean) =>
  new Intl.DateTimeFormat('en-US', includeYear ? { month: 'short', year: 'numeric' } : { month: 'short' }).format(
    value
  );

const getOrderSubtotal = (order: Order) =>
  order.products.reduce((sum, item) => sum + item.price * item.quantity, 0);

const getOrderTotal = (order: Order) => {
  const subtotal = getOrderSubtotal(order);
  const discount = order.coupon?.discountAmount ?? 0;
  const taxAmount = order.taxAmount ?? 0;
  return Math.max(0, subtotal - discount) + taxAmount;
};

const getOrderTimestamp = (order: Order) => {
  const value = order.createdAt ?? order.updatedAt;
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const statusTone: Record<OrderStatus, string> = {
  pending: 'bg-amber-100 text-amber-700',
  processing: 'bg-blue-100 text-blue-700',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-rose-100 text-rose-700',
};

const statusDot: Record<OrderStatus, string> = {
  pending: 'bg-amber-500',
  processing: 'bg-blue-500',
  completed: 'bg-emerald-500',
  cancelled: 'bg-rose-500',
};

const glassStrong = 'bg-gradient-to-br from-white/90 via-white/80 to-white/70 backdrop-blur';
const glassMedium = 'bg-gradient-to-br from-white/85 via-white/75 to-white/60 backdrop-blur';
const glassLight = 'bg-gradient-to-br from-white/80 via-white/70 to-white/55 backdrop-blur';
const glassXLight = 'bg-gradient-to-br from-white/75 via-white/65 to-white/50 backdrop-blur';
const glassCardBgs = [glassMedium, glassLight, glassXLight, glassLight];

interface DashboardAdminSectionProps {
  orders: Order[];
  products: Product[];
  categoriesCount: number;
  manufacturersCount: number;
  unreadMessages: number;
  lowStockIds: string[];
  clientTypeCounts: { b2b: number; c2b: number; total: number };
  clientsLoading?: boolean;
  onNavigate?: (tabId: string, dropdownId?: string) => void;
}

export const DashboardAdminSection: React.FC<DashboardAdminSectionProps> = ({
  orders,
  products,
  categoriesCount,
  manufacturersCount,
  unreadMessages,
  lowStockIds,
  clientTypeCounts,
  clientsLoading = false,
  onNavigate,
}) => {
  const {
    totalOrders,
    pendingOrders,
    processingOrders,
    completedOrders,
    cancelledOrders,
    ordersLast30Days,
    revenueLast30Days,
    recentOrders,
    avgOrderValue,
  } = useMemo(() => {
    const now = Date.now();
    const since = now - THIRTY_DAYS_MS;

    let pending = 0;
    let processing = 0;
    let completed = 0;
    let cancelled = 0;
    let last30Count = 0;
    let last30Revenue = 0;
    let last30RevenueCount = 0;
    const recent: Array<{ order: Order; timestamp: number }> = [];

    orders.forEach((order) => {
      switch (order.status) {
        case 'pending':
          pending += 1;
          break;
        case 'processing':
          processing += 1;
          break;
        case 'completed':
          completed += 1;
          break;
        case 'cancelled':
          cancelled += 1;
          break;
        default:
          break;
      }

      const timestamp = getOrderTimestamp(order);
      if (timestamp) {
        recent.push({ order, timestamp });
      }
      if (timestamp >= since) {
        last30Count += 1;
        if (order.status !== 'cancelled') {
          last30Revenue += getOrderTotal(order);
          last30RevenueCount += 1;
        }
      }
    });

    recent.sort((a, b) => b.timestamp - a.timestamp);

    return {
      totalOrders: orders.length,
      pendingOrders: pending,
      processingOrders: processing,
      completedOrders: completed,
      cancelledOrders: cancelled,
      ordersLast30Days: last30Count,
      revenueLast30Days: last30Revenue,
      recentOrders: recent.slice(0, 4).map((entry) => entry.order),
      avgOrderValue: last30RevenueCount ? last30Revenue / last30RevenueCount : 0,
    };
  }, [orders]);

  const [chartRange, setChartRange] = useState<'all' | '1m' | '1y'>('1m');

  const salesTrend = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let start = new Date(today);
    let totalDays = 1;

    if (chartRange === '1m') {
      totalDays = 30;
      start = new Date(today.getTime() - DAY_MS * (totalDays - 1));
    } else if (chartRange === '1y') {
      totalDays = 365;
      start = new Date(today.getTime() - DAY_MS * (totalDays - 1));
    } else {
      let earliest = Number.POSITIVE_INFINITY;
      orders.forEach((order) => {
        const timestamp = getOrderTimestamp(order);
        if (timestamp && timestamp < earliest) {
          earliest = timestamp;
        }
      });
      if (Number.isFinite(earliest)) {
        const earliestDate = new Date(earliest);
        earliestDate.setHours(0, 0, 0, 0);
        start = earliestDate;
        totalDays = Math.max(1, Math.floor((today.getTime() - start.getTime()) / DAY_MS) + 1);
      }
    }

    const totals = Array.from({ length: totalDays }, () => 0);
    const orderCounts = Array.from({ length: totalDays }, () => 0);

    orders.forEach((order) => {
      if (order.status === 'cancelled') return;
      const timestamp = getOrderTimestamp(order);
      if (!timestamp) return;
      const orderDay = new Date(timestamp);
      orderDay.setHours(0, 0, 0, 0);
      const index = Math.floor((orderDay.getTime() - start.getTime()) / DAY_MS);
      if (index >= 0 && index < totals.length) {
        totals[index] += getOrderTotal(order);
        orderCounts[index] += 1;
      }
    });

    const total = totals.reduce((sum, value) => sum + value, 0);
    const peakValue = Math.max(...totals);
    const peakIndex = totals.findIndex((value) => value === peakValue);
    const peakDate = new Date(start.getTime() + Math.max(0, peakIndex) * DAY_MS);
    const max = Math.max(peakValue, 1);

    return {
      start,
      end: today,
      totals,
      orderCounts,
      total,
      max,
      peakValue,
      peakIndex,
      peakDate,
    };
  }, [chartRange, orders]);

  const averageDailySales = salesTrend.total / salesTrend.totals.length;
  const rangeSummary =
    chartRange === '1m' ? 'last 30 days' : chartRange === '1y' ? 'last 12 months' : 'all time';
  const avgLabel =
    chartRange === '1m' ? '1M avg' : chartRange === '1y' ? '1Y avg' : 'All-time avg';

  const salesChart = useMemo(() => {
    const width = 560;
    const height = 200;
    const padding = 18;
    const yBase = height - padding;
    const xRange = Math.max(1, salesTrend.totals.length - 1);
    const points = salesTrend.totals.map((value, index) => {
      const x = padding + (index / xRange) * (width - padding * 2);
      const y = padding + (1 - value / salesTrend.max) * (height - padding * 2);
      return { x, y };
    });

    // Create smooth curve path using bezier curves
    const createSmoothPath = (pts: Array<{ x: number; y: number }>) => {
      if (pts.length === 0) return '';
      if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;

      let path = `M ${pts[0].x} ${pts[0].y}`;

      for (let i = 0; i < pts.length - 1; i++) {
        const current = pts[i];
        const next = pts[i + 1];
        const controlPointDistance = (next.x - current.x) * 0.5;

        const cp1x = current.x + controlPointDistance;
        const cp1y = current.y;
        const cp2x = next.x - controlPointDistance;
        const cp2y = next.y;

        path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${next.x} ${next.y}`;
      }

      return path;
    };

    const smoothLine = createSmoothPath(points);
    const avgY =
      padding + (1 - Math.min(averageDailySales, salesTrend.max) / salesTrend.max) * (height - padding * 2);

    // Create smooth area path
    const areaPath = points.length
      ? `${createSmoothPath(points)} L ${points[points.length - 1].x} ${yBase} L ${points[0].x} ${yBase} Z`
      : '';

    return {
      width,
      height,
      padding,
      yBase,
      points,
      smoothLine,
      areaPath,
      avgY,
    };
  }, [averageDailySales, salesTrend]);

  const xAxisTicks = useMemo(() => {
    const totalDays = salesTrend.totals.length;
    if (totalDays <= 1) {
      return [{ index: 0, label: formatShortDate(salesTrend.start) }];
    }

    if (totalDays <= 45) {
      const ticks: Array<{ index: number; label: string }> = [];
      const step = Math.max(1, Math.floor(totalDays / 6));
      for (let i = 0; i < totalDays; i += step) {
        const date = new Date(salesTrend.start.getTime() + i * DAY_MS);
        ticks.push({ index: i, label: formatShortDate(date) });
      }
      if (ticks[ticks.length - 1]?.index !== totalDays - 1) {
        ticks.push({ index: totalDays - 1, label: formatShortDate(salesTrend.end) });
      }
      return ticks;
    }

    const spanYears = salesTrend.start.getFullYear() !== salesTrend.end.getFullYear();
    const monthTicks: Array<{ index: number; label: string }> = [];
    for (let i = 0; i < totalDays; i += 1) {
      const date = new Date(salesTrend.start.getTime() + i * DAY_MS);
      if (date.getDate() === 1 || i === 0) {
        const includeYear = spanYears && (date.getMonth() === 0 || i === 0);
        monthTicks.push({ index: i, label: formatMonthLabel(date, includeYear) });
      }
    }
    const maxTicks = 8;
    const step = Math.max(1, Math.ceil(monthTicks.length / maxTicks));
    const filtered = monthTicks.filter((_, idx) => idx % step === 0);
    if (filtered[filtered.length - 1]?.index !== totalDays - 1) {
      const endDate = salesTrend.end;
      filtered.push({ index: totalDays - 1, label: formatMonthLabel(endDate, spanYears) });
    }
    return filtered;
  }, [salesTrend.end, salesTrend.start, salesTrend.totals.length]);

  const [chartHover, setChartHover] = useState<{
    index: number;
    left: number;
    top: number;
  } | null>(null);

  const chartHoverPoint = chartHover ? salesChart.points[chartHover.index] : null;

  const chartTooltip = useMemo(() => {
    if (!chartHover || chartHoverPoint == null) return null;
    const date = new Date(salesTrend.start.getTime() + chartHover.index * DAY_MS);
    const revenueValue = salesTrend.totals[chartHover.index] ?? 0;
    const orderCount = salesTrend.orderCounts[chartHover.index] ?? 0;

    // Smart positioning to prevent overflow
    let left = chartHover.left;
    let top = chartHover.top;
    let tooltipAlign: 'top' | 'bottom' = 'top';

    // If point is in the top 30% of chart, show tooltip below
    if (top < 30) {
      tooltipAlign = 'bottom';
    }

    // Clamp left position to prevent horizontal overflow
    left = Math.max(15, Math.min(85, left));

    return {
      title: formatShortDate(date),
      items: [
        { label: 'Revenue', value: formatCurrency(revenueValue), color: '#b91c1c' },
        { label: 'Orders', value: orderCount.toString(), color: '#10b981' },
      ],
      left,
      top,
      align: tooltipAlign,
    };
  }, [chartHover, chartHoverPoint, salesTrend.start, salesTrend.totals, salesTrend.orderCounts]);

  const lowStockItems = useMemo(() => {
    if (!lowStockIds.length) return [];
    const idSet = new Set(lowStockIds);
    return products
      .filter((product) => idSet.has(product.id))
      .map((product) => ({
        id: product.id,
        name: product.name,
        sku: product.sku ?? null,
        quantity: typeof product.inventory?.quantity === 'number' ? product.inventory.quantity : 0,
        threshold:
          typeof product.inventory?.lowStockThreshold === 'number' ? product.inventory.lowStockThreshold : 0,
      }))
      .sort((a, b) => a.quantity - b.quantity)
      .slice(0, 6);
  }, [products, lowStockIds]);

  const outOfStockCount = useMemo(
    () =>
      products.filter((product) => {
        if (product.manageStock === false) return false;
        const quantity = typeof product.inventory?.quantity === 'number' ? product.inventory.quantity : 0;
        return quantity <= 0;
      }).length,
    [products]
  );

  const trackedStockCount = useMemo(
    () => products.filter((product) => product.manageStock !== false).length,
    [products]
  );

  const safeB2b = Math.max(0, clientTypeCounts.b2b);
  const safeC2b = Math.max(0, clientTypeCounts.c2b);
  const totalClients = Math.max(clientTypeCounts.total, safeB2b + safeC2b);
  const b2bCount = safeB2b;
  const c2bCount = safeC2b;
  const b2bShare = totalClients ? b2bCount / totalClients : 0;
  const c2bShare = totalClients ? c2bCount / totalClients : 0;
  const b2bPercent = totalClients ? Math.round(b2bShare * 100) : 0;
  const c2bPercent = totalClients ? 100 - b2bPercent : 0;
  const donutRadius = 60;
  const donutStroke = 16;
  const donutCircumference = 2 * Math.PI * donutRadius;
  const b2bLength = donutCircumference * b2bShare;
  const c2bLength = donutCircumference * c2bShare;
  const b2bGradient = { from: '#f6b210', to: '#a00b0b' };
  const c2bGradient = { from: '#0015d1ff', to: '#a7c3ffff' };

  const statCards = [
    {
      label: 'Total orders',
      value: formatCount(totalOrders),
      helper: `${formatCount(ordersLast30Days)} last 30 days`,
      icon: ShoppingCart,
      tone: 'bg-blue-100 text-blue-700',
    },
    {
      label: 'Pending orders',
      value: formatCount(pendingOrders),
      helper: `${formatCount(processingOrders)} processing`,
      icon: Timer,
      tone: 'bg-amber-100 text-amber-700',
    },
    {
      label: 'Sales (30 days)',
      value: formatCurrency(revenueLast30Days),
      helper: `Avg ${formatCurrency(avgOrderValue)}`,
      icon: TrendingUp,
      tone: 'bg-emerald-100 text-emerald-700',
    },
    {
      label: 'Products',
      value: formatCount(products.length),
      helper: `${formatCount(trackedStockCount)} tracked`,
      icon: Package,
      tone: 'bg-slate-100 text-slate-700',
    },
    {
      label: 'Low stock',
      value: formatCount(lowStockIds.length),
      helper: `${formatCount(outOfStockCount)} out of stock`,
      icon: AlertTriangle,
      tone: 'bg-rose-100 text-rose-700',
    },
    {
      label: 'Unread messages',
      value: formatCount(unreadMessages),
      helper: 'Need review',
      icon: MessageSquare,
      tone: 'bg-indigo-100 text-indigo-700',
    },
  ];

  const statusItems: Array<{ id: OrderStatus; label: string; count: number }> = [
    { id: 'pending', label: 'Pending', count: pendingOrders },
    { id: 'processing', label: 'Processing', count: processingOrders },
    { id: 'completed', label: 'Completed', count: completedOrders },
    { id: 'cancelled', label: 'Cancelled', count: cancelledOrders },
  ];

  const catalogStats = [
    { label: 'Products', value: formatCount(products.length) },
    { label: 'Categories', value: formatCount(categoriesCount) },
    { label: 'Manufacturers', value: formatCount(manufacturersCount) },
    { label: 'Stock tracked', value: formatCount(trackedStockCount) },
    { label: 'Low stock', value: formatCount(lowStockIds.length) },
    { label: 'Out of stock', value: formatCount(outOfStockCount) },
  ];

  const rangeOptions: Array<{ id: 'all' | '1m' | '1y'; label: string }> = [
    { id: 'all', label: 'All' },
    { id: '1m', label: '1M' },
    { id: '1y', label: '1Y' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,3fr)]">
        <section className={`rounded-3xl border border-slate-200/60 ${glassMedium} shadow-sm`}>
          <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-5">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Performance</h2>
              <p className="text-sm text-slate-500">Revenue trend across {rangeSummary}.</p>
            </div>
            <div className={`flex items-center rounded-full ${glassLight} p-1 shadow-sm ring-1 ring-white/70`}>
              {rangeOptions.map((option) => {
                const isActive = chartRange === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => {
                      setChartRange(option.id);
                      setChartHover(null);
                    }}
                    aria-pressed={isActive}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                      isActive
                        ? 'bg-gradient-to-r from-primary to-primary-dark shadow-md text-white'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="px-6 pb-6">
            <div className="grid grid-cols-3 gap-3">
              <div className={`rounded-xl border border-slate-200/60 ${glassXLight} p-3 shadow-sm`}>
                <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Total</p>
                <p className="mt-1.5 text-lg font-bold text-slate-900">{formatCurrency(salesTrend.total)}</p>
              </div>
              <div className={`rounded-xl border border-slate-200/60 ${glassXLight} p-3 shadow-sm`}>
                <div className="flex items-center gap-2">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Avg / day</p>
                  <svg width="18" height="2" viewBox="0 0 18 2" fill="none" className="flex-shrink-0">
                    <line x1="0" y1="1" x2="4" y2="1" stroke="#fbbf24" strokeWidth="1.8" />
                    <line x1="7" y1="1" x2="11" y2="1" stroke="#fbbf24" strokeWidth="1.8" />
                    <line x1="14" y1="1" x2="18" y2="1" stroke="#fbbf24" strokeWidth="1.8" />
                  </svg>
                </div>
                <p className="mt-1.5 text-lg font-bold text-slate-900">{formatCurrency(averageDailySales)}</p>
              </div>
              <div className={`rounded-xl border border-slate-200/60 ${glassXLight} p-3 shadow-sm`}>
                <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Peak day</p>
                {salesTrend.total > 0 ? (
                  <>
                    <p className="mt-1.5 text-lg font-bold text-slate-900">
                      {formatCurrency(salesTrend.peakValue)}
                    </p>
                    <p className="text-[10px] font-medium text-slate-400">{formatShortDate(salesTrend.peakDate)}</p>
                  </>
                ) : (
                  <p className="mt-1.5 text-lg font-bold text-slate-900">$0.00</p>
                )}
              </div>
            </div>

            <div className="mt-4">
              <div
                className="relative h-52 cursor-crosshair"
                onMouseMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const mouseX = e.clientX - rect.left;
                  const relativeX = (mouseX / rect.width) * salesChart.width;

                  // Find the closest point to the mouse X position
                  let closestIndex = 0;
                  let minDistance = Infinity;

                  salesChart.points.forEach((point, index) => {
                    const distance = Math.abs(point.x - relativeX);
                    if (distance < minDistance) {
                      minDistance = distance;
                      closestIndex = index;
                    }
                  });

                  const closestPoint = salesChart.points[closestIndex];
                  if (closestPoint) {
                    const left = (closestPoint.x / salesChart.width) * 100;
                    const top = (closestPoint.y / salesChart.height) * 100;
                    setChartHover({ index: closestIndex, left, top });
                  }
                }}
                onMouseLeave={() => setChartHover(null)}
                onTouchEnd={() => setChartHover(null)}
              >
                {chartTooltip && (
                  <div
                    className="pointer-events-none absolute z-20 animate-in fade-in zoom-in-95 duration-200"
                    style={{
                      left: `${chartTooltip.left}%`,
                      top: `${chartTooltip.top}%`,
                      transform:
                        chartTooltip.align === 'top'
                          ? 'translate(-50%, calc(-100% - 16px))'
                          : 'translate(-50%, 16px)',
                    }}
                  >
                    <div className="rounded-2xl border border-red-200/60 bg-gradient-to-br from-white via-red-50/30 to-white px-4 py-3.5 text-xs shadow-2xl shadow-red-900/20 ring-1 ring-red-100/80 backdrop-blur-xl">
                      <div className="mb-2.5 flex items-center justify-between gap-3 border-b border-red-100/50 pb-2">
                        <span className="text-[11px] font-bold text-slate-900">{chartTooltip.title}</span>
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#b91c1c]" />
                      </div>
                      <div className="space-y-2">
                        {chartTooltip.items.map((item) => (
                          <div key={item.label} className="flex items-center justify-between gap-6">
                            <span className="flex items-center gap-2 text-[11px] font-medium text-slate-600 whitespace-nowrap">
                              <span
                                className="h-2.5 w-2.5 rounded-full ring-2 ring-white flex-shrink-0"
                                style={{ backgroundColor: item.color }}
                              />
                              {item.label}
                            </span>
                            <span className="text-[12px] font-bold text-slate-900 whitespace-nowrap">{item.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <span
                      className="absolute left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border border-red-200/60 bg-gradient-to-br from-white via-red-50/30 to-white ring-1 ring-red-100/80"
                      style={{
                        [chartTooltip.align === 'top' ? 'top' : 'bottom']: 'calc(100% - 6px)',
                        [chartTooltip.align === 'top' ? 'borderBottom' : 'borderTop']: 'none',
                        [chartTooltip.align === 'top' ? 'borderRight' : 'borderLeft']: 'none',
                      }}
                    />
                  </div>
                )}
                <svg
                  viewBox={`0 0 ${salesChart.width} ${salesChart.height}`}
                  className="h-52 w-full"
                  preserveAspectRatio="none"
                >
                <defs>
                  <linearGradient id="sales-chart-gradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#b91c1c" stopOpacity="0.24" />
                    <stop offset="100%" stopColor="#b91c1c" stopOpacity="0.02" />
                  </linearGradient>
                </defs>
                <g>
                  {[0.2, 0.4, 0.6, 0.8].map((row) => (
                    <line
                      key={row}
                      x1={salesChart.padding}
                      x2={salesChart.width - salesChart.padding}
                      y1={salesChart.padding + row * (salesChart.height - salesChart.padding * 2)}
                      y2={salesChart.padding + row * (salesChart.height - salesChart.padding * 2)}
                      stroke="#e5e7eb"
                      strokeWidth="1"
                      strokeDasharray="4 6"
                    />
                  ))}
                </g>
                {chartHoverPoint && (
                  <line
                    x1={chartHoverPoint.x}
                    x2={chartHoverPoint.x}
                    y1={salesChart.padding}
                    y2={salesChart.yBase}
                    stroke="#c7d2fe"
                    strokeWidth="1"
                    strokeDasharray="4 6"
                  />
                )}
                {salesChart.areaPath && (
                  <path d={salesChart.areaPath} fill="url(#sales-chart-gradient)" />
                )}
                <line
                  x1={salesChart.padding}
                  x2={salesChart.width - salesChart.padding}
                  y1={salesChart.avgY}
                  y2={salesChart.avgY}
                  stroke="#fbbf24"
                  strokeWidth="1.8"
                  strokeDasharray="4 6"
                />
                <path
                  d={salesChart.smoothLine}
                  fill="none"
                  stroke="#b91c1c"
                  strokeWidth="2.4"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  className="transition-all duration-300"
                />
                {salesChart.points.map((point, index) => {
                  const isHovered = chartHover?.index === index;
                  return (
                    <g key={`${point.x}-${point.y}-${index}`} className="pointer-events-none transition-all duration-200">
                      {/* Visible point */}
                      <circle
                        cx={point.x}
                        cy={point.y}
                        r={isHovered ? '4' : '2.5'}
                        fill="#b91c1c"
                        fillOpacity={isHovered ? '1' : '0.6'}
                        className="transition-all duration-200"
                      />
                    </g>
                  );
                })}
                {chartHoverPoint && (
                  <g>
                    <circle
                      cx={chartHoverPoint.x}
                      cy={chartHoverPoint.y}
                      r="6"
                      fill="#b91c1c"
                      fillOpacity="0.12"
                      className="animate-pulse"
                    />
                    <circle
                      cx={chartHoverPoint.x}
                      cy={chartHoverPoint.y}
                      r="4"
                      fill="#b91c1c"
                      stroke="#ffffff"
                      strokeWidth="2"
                      className="drop-shadow-lg"
                    />
                  </g>
                )}
                </svg>
              </div>
              <div className="relative mt-3 h-6">
                <span className="absolute left-0 right-0 top-1.5 h-px bg-slate-200/70" />
                {xAxisTicks.map((tick) => {
                  const divisor = Math.max(1, salesTrend.totals.length - 1);
                  const left = (tick.index / divisor) * 100;
                  return (
                    <div
                      key={`${tick.index}-${tick.label}`}
                      className="absolute top-0 -translate-x-1/2 text-[10px] text-slate-500"
                      style={{ left: `${left}%` }}
                    >
                      <span className="mx-auto mb-1 block h-1.5 w-1.5 rounded-full bg-slate-400" />
                      <span>{tick.label}</span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#b91c1c]" />
                  Revenue
                </span>
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#fbbf24]" />
                  {avgLabel}
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className={`rounded-3xl border border-slate-200/60 ${glassStrong} shadow-sm`}>
          <div className="flex items-center px-6 py-5">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Client types</h2>
              <p className="text-sm text-slate-500">C2B vs B2B breakdown.</p>
            </div>
          </div>
          <div className="flex flex-col items-center px-6 pb-6">
            <div className="relative flex h-60 w-60 items-center justify-center">
              <svg viewBox="0 0 140 140" className="h-56 w-56">
                <defs>
                  <linearGradient id="client-b2b-gradient" x1="0" y1="0" x2="140" y2="140" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor={b2bGradient.from} />
                    <stop offset="100%" stopColor={b2bGradient.to} />
                  </linearGradient>
                  <linearGradient id="client-c2b-gradient" x1="0" y1="0" x2="140" y2="140" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor={c2bGradient.from} />
                    <stop offset="100%" stopColor={c2bGradient.to} />
                  </linearGradient>
                </defs>
                <circle
                  cx="70"
                  cy="70"
                  r={donutRadius}
                  fill="none"
                  stroke="#e2e8f0"
                  strokeWidth={donutStroke}
                />
                {totalClients > 0 && b2bLength > 0 && (
                  <circle
                    cx="70"
                    cy="70"
                    r={donutRadius}
                    fill="none"
                    stroke="url(#client-b2b-gradient)"
                    strokeWidth={donutStroke}
                    strokeDasharray={`${b2bLength} ${donutCircumference - b2bLength}`}
                    strokeDashoffset="0"
                    strokeLinecap="round"
                    transform="rotate(-90 70 70)"
                  />
                )}
                {totalClients > 0 && c2bLength > 0 && (
                  <circle
                    cx="70"
                    cy="70"
                    r={donutRadius}
                    fill="none"
                    stroke="url(#client-c2b-gradient)"
                    strokeWidth={donutStroke}
                    strokeDasharray={`${c2bLength} ${donutCircumference - c2bLength}`}
                    strokeDashoffset={-b2bLength}
                    strokeLinecap="round"
                    transform="rotate(-90 70 70)"
                  />
                )}
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-xs text-slate-600">
                  <p className="text-[10px] uppercase tracking-wide text-slate-400">Total clients</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">{formatCount(totalClients)}</p>
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center justify-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-gradient-to-r from-[#1d4ed8] to-[#60a5fa]" />
                      C2B
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-gradient-to-r from-[#f6b210] to-[#a00b0b]" />
                      B2B
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-4 grid w-full grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-slate-500">B2B clients</p>
                <p className="text-lg font-semibold text-slate-900">{formatCount(b2bCount)}</p>
                <p className="text-[11px] text-slate-400">{b2bPercent}% of total</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500">C2B clients</p>
                <p className="text-lg font-semibold text-slate-900">{formatCount(c2bCount)}</p>
                <p className="text-[11px] text-slate-400">{c2bPercent}% of total</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onNavigate?.('users', 'clients')}
              className="mt-4 w-full rounded-full bg-gradient-to-r from-primary to-primary-dark px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:shadow-lg"
            >
              View details
            </button>
            {clientsLoading && (
              <div className="mt-2 text-xs text-slate-400">Updating client counts...</div>
            )}
          </div>
        </section>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className={`rounded-2xl border border-slate-200/60 ${glassCardBgs[index % glassCardBgs.length]} p-5 shadow-sm`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted">{card.label}</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">{card.value}</p>
                  <p className="mt-1 text-xs text-slate-500">{card.helper}</p>
                </div>
                <span className={`flex h-10 w-10 items-center justify-center rounded-full ${card.tone}`}>
                  <Icon className="h-5 w-5" />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className={`rounded-2xl border border-slate-200/60 ${glassMedium} shadow-sm`}>
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Orders overview</h2>
                <p className="text-sm text-slate-500">Summary of the current order pipeline.</p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate?.('orders')}
                className="inline-flex items-center justify-center rounded-xl border border-border bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                View all
              </button>
            </div>
            <div className="grid gap-4 p-5 lg:grid-cols-2">
              <div className="space-y-2">
                {statusItems.map((status) => (
                  <div
                    key={status.id}
                    className={`flex items-center justify-between rounded-xl ${glassXLight} px-4 py-3`}
                  >
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                      <span className={`h-2.5 w-2.5 rounded-full ${statusDot[status.id]}`} />
                      {status.label}
                    </div>
                    <span className="text-sm font-semibold text-slate-900">{formatCount(status.count)}</span>
                  </div>
                ))}
                <div className={`rounded-xl border border-slate-200/60 ${glassLight} p-4`}>
                  <p className="text-xs uppercase tracking-wide text-muted">Last 30 days</p>
                  <p className="mt-2 text-xl font-semibold text-slate-900">
                    {formatCount(ordersLast30Days)} orders
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Sales {formatCurrency(revenueLast30Days)} | Avg {formatCurrency(avgOrderValue)}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-slate-900">Recent orders</h3>
                {recentOrders.length === 0 ? (
                  <div
                    className={`rounded-xl border border-dashed border-slate-200/60 ${glassXLight} px-4 py-6 text-center text-sm text-slate-500`}
                  >
                    No orders yet.
                  </div>
                ) : (
                  recentOrders.map((order) => {
                    const total = getOrderTotal(order);
                    const customerLabel = order.user?.name || order.user?.email || 'Customer';
                    const timestamp = order.createdAt ?? order.updatedAt;
                    return (
                      <div
                        key={order.id}
                        className={`flex items-center justify-between gap-3 rounded-xl border border-slate-200/60 ${glassXLight} px-4 py-3`}
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold text-slate-900">
                              Order #{order.id.slice(-6)}
                            </span>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusTone[order.status]}`}>
                              {order.status}
                            </span>
                          </div>
                          <p className="mt-1 truncate text-xs text-slate-500">{customerLabel}</p>
                          <p className="text-xs text-slate-400">{formatTimestamp(timestamp)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-slate-900">{formatCurrency(total)}</p>
                          <p className="text-xs text-slate-400">{order.products.length} items</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </section>
        </div>
        <aside className="space-y-6">
          <section className={`rounded-2xl border border-slate-200/60 ${glassLight} shadow-sm`}>
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Inventory watch</h2>
                <p className="text-sm text-slate-500">Low stock items to review.</p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate?.('products', 'inventory')}
                className="inline-flex items-center justify-center rounded-xl border border-border bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Open
              </button>
            </div>
            <div className="space-y-3 p-6">
              {lowStockItems.length === 0 ? (
                <div
                  className={`rounded-xl border border-dashed border-slate-200/60 ${glassXLight} px-4 py-6 text-center text-sm text-slate-500`}
                >
                  No low stock alerts right now.
                </div>
              ) : (
                lowStockItems.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-start justify-between rounded-xl ${glassXLight} px-4 py-3`}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                      {item.sku && <p className="text-xs text-slate-500">SKU {item.sku}</p>}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-rose-600">{formatCount(item.quantity)}</p>
                      <p className="text-xs text-slate-500">Threshold {formatCount(item.threshold)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className={`rounded-2xl border border-slate-200/60 ${glassXLight} shadow-sm`}>
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Catalog snapshot</h2>
                <p className="text-sm text-slate-500">Current catalog coverage.</p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate?.('categories')}
                className="inline-flex items-center justify-center rounded-xl border border-border bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Catalog
              </button>
            </div>
            <div className="grid gap-1.5 p-2 sm:grid-cols-2">
              {catalogStats.map((stat) => (
                <div key={stat.label} className={`rounded-xl ${glassXLight} px-3 py-2`}>
                  <p className="text-xs uppercase tracking-wide text-slate-500">{stat.label}</p>
                  <p className="mt-1 text-base font-semibold text-slate-900">{stat.value}</p>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
};

