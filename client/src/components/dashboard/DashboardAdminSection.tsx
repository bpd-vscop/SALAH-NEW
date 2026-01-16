import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, MessageSquare, ShoppingCart, Timer, TrendingUp, Users, Globe } from 'lucide-react';
import type { Order, OrderStatus, Product } from '../../types/api';
import { formatCurrency, formatTimestamp } from '../../utils/format';
import { analyticsApi, type AnalyticsSummary } from '../../api/analytics';

const DAY_MS = 24 * 60 * 60 * 1000;
const THIRTY_DAYS_MS = 30 * DAY_MS;

const formatCount = (value: number) => new Intl.NumberFormat('en-US').format(value);
const formatShortDate = (value: Date) =>
  new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(value);
const formatMonthLabel = (value: Date, includeYear: boolean) =>
  new Intl.DateTimeFormat('en-US', includeYear ? { month: 'short', year: 'numeric' } : { month: 'short' }).format(
    value
  );

const visitorTrendStyle = { color: '#2563eb', gradient: { from: '#3b82f6', to: '#dbeafe' } };

const deviceTrendPalette: Record<string, { color: string; gradient: { from: string; to: string } }> = {
  mobile: { color: '#0ea5e9', gradient: { from: '#38bdf8', to: '#bae6fd' } },
  desktop: { color: '#f97316', gradient: { from: '#fb923c', to: '#fed7aa' } },
  tablet: { color: '#22c55e', gradient: { from: '#4ade80', to: '#dcfce7' } },
  other: { color: '#64748b', gradient: { from: '#94a3b8', to: '#e2e8f0' } },
};

const buildChartTicks = (labels: string[]) => {
  const totalDays = labels.length;
  if (totalDays === 0) return [];

  const formatLabel = (value: string) => {
    const parsed = new Date(`${value}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? value : formatShortDate(parsed);
  };

  if (totalDays === 1) {
    return [{ index: 0, label: formatLabel(labels[0]) }];
  }

  if (totalDays <= 45) {
    const ticks: Array<{ index: number; label: string }> = [];
    const step = Math.max(1, Math.floor(totalDays / 6));
    for (let i = 0; i < totalDays; i += step) {
      ticks.push({ index: i, label: formatLabel(labels[i]) });
    }
    if (ticks[ticks.length - 1]?.index !== totalDays - 1) {
      ticks.push({ index: totalDays - 1, label: formatLabel(labels[totalDays - 1]) });
    }
    return ticks;
  }

  const start = new Date(`${labels[0]}T00:00:00`);
  const end = new Date(`${labels[totalDays - 1]}T00:00:00`);
  const spanYears = start.getFullYear() !== end.getFullYear();
  const monthTicks: Array<{ index: number; label: string }> = [];

  for (let i = 0; i < totalDays; i += 1) {
    const date = new Date(`${labels[i]}T00:00:00`);
    if (date.getDate() === 1 || i === 0) {
      const includeYear = spanYears && (date.getMonth() === 0 || i === 0);
      const label = Number.isNaN(date.getTime()) ? labels[i] : formatMonthLabel(date, includeYear);
      monthTicks.push({ index: i, label });
    }
  }

  const maxTicks = 7;
  const step = Math.max(1, Math.ceil(monthTicks.length / maxTicks));
  const filtered = monthTicks.filter((_, idx) => idx % step === 0);
  if (filtered[filtered.length - 1]?.index !== totalDays - 1) {
    const endDate = new Date(`${labels[totalDays - 1]}T00:00:00`);
    const label = Number.isNaN(endDate.getTime())
      ? labels[totalDays - 1]
      : formatMonthLabel(endDate, spanYears);
    filtered.push({ index: totalDays - 1, label });
  }
  return filtered;
};

const VisitorDeviceChart: React.FC<{
  labels: string[];
  totals: number[];
  devices: Record<string, number[]>;
}> = ({ labels, totals, devices }) => {
  const width = 560;
  const height = 160;
  const padding = 6;

  const deviceEntries = useMemo(() => {
    const order = ['mobile', 'desktop', 'tablet'];
    const merged: Record<string, number[]> = {};

    order.forEach((device) => {
      merged[device] = devices?.[device] ?? Array(labels.length).fill(0);
    });

    Object.entries(devices ?? {}).forEach(([device, values]) => {
      if (!merged[device]) {
        merged[device] = values;
      }
    });

    const entries = Object.entries(merged).map(([device, values]) => {
      const palette = deviceTrendPalette[device] ?? deviceTrendPalette.other;
      const normalized = Array.from({ length: labels.length }, (_, index) => values[index] ?? 0);
      return {
        id: device,
        label: device.charAt(0).toUpperCase() + device.slice(1),
        color: palette.color,
        values: normalized,
        total: normalized.reduce((sum, value) => sum + value, 0),
      };
    });

    const unknownValues = totals.map((total, index) => {
      const knownSum = entries.reduce((sum, entry) => sum + (entry.values[index] ?? 0), 0);
      return Math.max(0, total - knownSum);
    });
    const unknownTotal = unknownValues.reduce((sum, value) => sum + value, 0);
    if (unknownTotal > 0) {
      entries.push({
        id: 'unknown',
        label: 'Unknown',
        color: deviceTrendPalette.other.color,
        values: unknownValues,
        total: unknownTotal,
      });
    }

    return entries.sort((a, b) => {
      const aIsUnknown = a.id === 'unknown';
      const bIsUnknown = b.id === 'unknown';
      if (aIsUnknown && bIsUnknown) return 0;
      if (aIsUnknown) return 1;
      if (bIsUnknown) return -1;
      const aIndex = order.indexOf(a.id);
      const bIndex = order.indexOf(b.id);
      if (aIndex === -1 && bIndex === -1) {
        return b.total - a.total;
      }
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });
  }, [devices, labels.length, totals]);

  const chart = useMemo(() => {
    const xRange = Math.max(1, labels.length - 1);
    const maxValue = Math.max(1, ...totals);
    const points = totals.map((value, index) => {
      const x = padding + (index / xRange) * (width - padding * 2);
      const y = padding + (1 - value / maxValue) * (height - padding * 2);
      return { x, y };
    });

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
    const yBase = height - padding;
    const areaPath = points.length
      ? `${smoothLine} L ${points[points.length - 1].x} ${yBase} L ${points[0].x} ${yBase} Z`
      : '';

    return {
      width,
      height,
      padding,
      yBase,
      points,
      smoothLine,
      areaPath,
    };
  }, [height, labels.length, padding, totals, width]);

  const [hover, setHover] = useState<{
    index: number;
    left: number;
    top: number;
  } | null>(null);

  const hoverPoint = hover ? chart.points[hover.index] : null;

  const tooltip = useMemo(() => {
    if (!hover || !labels[hover.index]) return null;
    const dateValue = labels[hover.index];
    const parsed = new Date(`${dateValue}T00:00:00`);
    const title = Number.isNaN(parsed.getTime()) ? dateValue : formatShortDate(parsed);

    let left = hover.left;
    let top = hover.top;
    let align: 'top' | 'bottom' = 'top';

    if (top < 28) {
      align = 'bottom';
    }

    left = Math.max(2, Math.min(98, left));

    return {
      title,
      total: totals[hover.index] ?? 0,
      devices: deviceEntries.map((entry) => ({
        label: entry.label,
        value: entry.values[hover.index] ?? 0,
        color: entry.color,
      })),
      left,
      top,
      align,
    };
  }, [deviceEntries, hover, labels, totals]);

  const ticks = useMemo(() => buildChartTicks(labels), [labels]);

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div
        className="relative h-40 cursor-crosshair"
        onMouseMove={(e) => {
          if (!chart.points.length) return;
          const rect = e.currentTarget.getBoundingClientRect();
          const mouseX = e.clientX - rect.left;
          const relativeX = (mouseX / rect.width) * chart.width;

          let closestIndex = 0;
          let minDistance = Infinity;

          chart.points.forEach((point, index) => {
            const distance = Math.abs(point.x - relativeX);
            if (distance < minDistance) {
              minDistance = distance;
              closestIndex = index;
            }
          });

          const closestPoint = chart.points[closestIndex];
          if (closestPoint) {
            const left = (closestPoint.x / chart.width) * 100;
            const top = (closestPoint.y / chart.height) * 100;
            setHover({ index: closestIndex, left, top });
          }
        }}
        onMouseLeave={() => setHover(null)}
        onTouchEnd={() => setHover(null)}
      >
        {tooltip && (
          <div
            className="pointer-events-none absolute z-20 animate-in fade-in zoom-in-95 duration-200"
            style={{
              left: `${tooltip.left}%`,
              top: `${tooltip.top}%`,
              transform:
                tooltip.align === 'top'
                  ? 'translate(-50%, calc(-100% - 16px))'
                  : 'translate(-50%, 16px)',
            }}
          >
            <div className="rounded-2xl border border-slate-200/70 bg-white/95 px-4 py-3.5 text-xs shadow-2xl shadow-slate-900/10 ring-1 ring-white/80 backdrop-blur-xl">
              <div className="mb-2.5 flex items-center justify-between gap-3 border-b border-slate-100/70 pb-2">
                <span className="text-[11px] font-bold text-slate-900">{tooltip.title}</span>
                <span className="text-[11px] font-semibold text-blue-600">{formatCount(tooltip.total)} total</span>
              </div>
              {tooltip.devices.length ? (
                <div className="space-y-2">
                  {tooltip.devices.map((device) => (
                    <div key={device.label} className="flex items-center justify-between gap-6">
                      <span className="flex items-center gap-2 text-[11px] font-medium text-slate-600 whitespace-nowrap">
                        <span
                          className="h-2.5 w-2.5 rounded-full ring-2 ring-white flex-shrink-0"
                          style={{ backgroundColor: device.color }}
                        />
                        {device.label}
                      </span>
                      <span className="text-[12px] font-bold text-slate-900 whitespace-nowrap">
                        {formatCount(device.value)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-slate-400">No device data</p>
              )}
            </div>
            <span
              className="absolute left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border border-slate-200/70 bg-white/95 ring-1 ring-white/80"
              style={{
                [tooltip.align === 'top' ? 'top' : 'bottom']: 'calc(100% - 6px)',
                [tooltip.align === 'top' ? 'borderBottom' : 'borderTop']: 'none',
                [tooltip.align === 'top' ? 'borderRight' : 'borderLeft']: 'none',
              }}
            />
          </div>
        )}
        <svg viewBox={`0 0 ${chart.width} ${chart.height}`} className="h-40 w-full" preserveAspectRatio="none">
          <defs>
            <linearGradient id="visitor-trend-gradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={visitorTrendStyle.gradient.from} stopOpacity="0.25" />
              <stop offset="100%" stopColor={visitorTrendStyle.gradient.to} stopOpacity="0.04" />
            </linearGradient>
          </defs>
          <g>
            {[0.2, 0.4, 0.6, 0.8].map((row) => (
              <line
                key={row}
                x1={chart.padding}
                x2={chart.width - chart.padding}
                y1={chart.padding + row * (chart.height - chart.padding * 2)}
                y2={chart.padding + row * (chart.height - chart.padding * 2)}
                stroke="#e5e7eb"
                strokeWidth="1"
                strokeDasharray="4 6"
              />
            ))}
          </g>
          {hoverPoint && (
            <line
              x1={hoverPoint.x}
              x2={hoverPoint.x}
              y1={chart.padding}
              y2={chart.yBase}
              stroke="#cbd5e1"
              strokeWidth="1"
              strokeDasharray="4 6"
            />
          )}
          {chart.areaPath && <path d={chart.areaPath} fill="url(#visitor-trend-gradient)" />}
          <path
            d={chart.smoothLine}
            fill="none"
            stroke={visitorTrendStyle.color}
            strokeWidth="2.4"
            strokeLinejoin="round"
            strokeLinecap="round"
            className="transition-all duration-300"
          />
          {chart.points.map((point, index) => {
            const isHovered = hover?.index === index;
            return (
              <circle
                key={`${point.x}-${point.y}-${index}`}
                cx={point.x}
                cy={point.y}
                r={isHovered ? '4' : '2.5'}
                fill={visitorTrendStyle.color}
                fillOpacity={isHovered ? '1' : '0.6'}
                className="transition-all duration-200"
              />
            );
          })}
          {hoverPoint && (
            <g>
              <circle
                cx={hoverPoint.x}
                cy={hoverPoint.y}
                r="6"
                fill={visitorTrendStyle.color}
                fillOpacity="0.12"
                className="animate-pulse"
              />
              <circle
                cx={hoverPoint.x}
                cy={hoverPoint.y}
                r="4"
                fill={visitorTrendStyle.color}
                stroke="#ffffff"
                strokeWidth="2"
                className="drop-shadow-lg"
              />
            </g>
          )}
        </svg>
      </div>
      {ticks.length > 0 && (
        <div className="relative mt-3 h-6">
          <span className="absolute left-0 right-0 top-1.5 h-px bg-slate-200/70" />
          {ticks.map((tick) => {
            const divisor = Math.max(1, labels.length - 1);
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
      )}
    </div>
  );
};

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
const UNKNOWN_LOCATION = 'Unknown';
const US_COUNTRY_LABEL = 'United States';
const normalizeCountry = (value?: string | null) => {
  const cleaned = value?.trim();
  if (!cleaned) return '';
  const lowered = cleaned.toLowerCase();
  if (['us', 'u.s.', 'usa', 'united states', 'united states of america'].includes(lowered)) {
    return US_COUNTRY_LABEL;
  }
  return cleaned;
};

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
  const [showUsStates, setShowUsStates] = useState(true);
  const [locationRange, setLocationRange] = useState<'all' | '1m' | '1y'>('all');
  const [analyticsData, setAnalyticsData] = useState<AnalyticsSummary | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsPeriod, setAnalyticsPeriod] = useState<'7d' | '30d' | '90d' | '1y'>('30d');

  // Fetch analytics data
  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setAnalyticsLoading(true);
        const response = await analyticsApi.getSummary({ period: analyticsPeriod });
        setAnalyticsData(response.data);
      } catch (error) {
        console.error('Failed to fetch analytics:', error);
        setAnalyticsData(null);
      } finally {
        setAnalyticsLoading(false);
      }
    };

    fetchAnalytics();
  }, [analyticsPeriod]);

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

  const locationSummary = useMemo(() => {
    const now = Date.now();

    // Calculate period ranges based on locationRange
    let periodMs: number | null = THIRTY_DAYS_MS;
    if (locationRange === '1y') {
      periodMs = 365 * DAY_MS;
    } else if (locationRange === 'all') {
      periodMs = null;
    }

    const currentPeriodStart = periodMs ? now - periodMs : 0;
    const previousPeriodStart = periodMs ? currentPeriodStart - periodMs : 0;
    const previousPeriodEnd = currentPeriodStart;

    // Current period data
    const countryCounts = new Map<string, number>();
    const countryRevenue = new Map<string, number>();
    const usStateCounts = new Map<string, number>();
    const usStateRevenue = new Map<string, number>();

    // Previous period data (for growth calculation)
    const prevCountryRevenue = new Map<string, number>();
    const prevUsStateRevenue = new Map<string, number>();

    let usOrders = 0;
    let totalOrdersInRange = 0;

    orders.forEach((order) => {
      if (order.status === 'cancelled') return;

      const timestamp = getOrderTimestamp(order);
      if (!timestamp) return;

      const countryValue =
        order.taxCountry ??
        order.user?.billingAddress?.country ??
        order.user?.shippingAddresses?.[0]?.country ??
        '';
      const stateValue =
        order.taxState ??
        order.user?.billingAddress?.state ??
        order.user?.shippingAddresses?.[0]?.state ??
        '';

      const normalizedCountry = normalizeCountry(countryValue);
      const countryLabel = normalizedCountry || UNKNOWN_LOCATION;
      const stateLabel = stateValue?.trim() || UNKNOWN_LOCATION;

      const orderTotal = getOrderTotal(order);

      // Current period
      if (!periodMs || timestamp >= currentPeriodStart) {
        totalOrdersInRange += 1;
        countryCounts.set(countryLabel, (countryCounts.get(countryLabel) ?? 0) + 1);
        countryRevenue.set(countryLabel, (countryRevenue.get(countryLabel) ?? 0) + orderTotal);

        if (countryLabel === US_COUNTRY_LABEL) {
          usOrders += 1;
          usStateCounts.set(stateLabel, (usStateCounts.get(stateLabel) ?? 0) + 1);
          usStateRevenue.set(stateLabel, (usStateRevenue.get(stateLabel) ?? 0) + orderTotal);
        }
      }

      // Previous period (for growth calculation)
      if (periodMs && timestamp >= previousPeriodStart && timestamp < previousPeriodEnd) {
        prevCountryRevenue.set(countryLabel, (prevCountryRevenue.get(countryLabel) ?? 0) + orderTotal);

        if (countryLabel === US_COUNTRY_LABEL) {
          prevUsStateRevenue.set(stateLabel, (prevUsStateRevenue.get(stateLabel) ?? 0) + orderTotal);
        }
      }
    });

    const total = totalOrdersInRange;
    const totalRevenue = Array.from(countryRevenue.values()).reduce((sum, val) => sum + val, 0);

    const calculateGrowth = (current: number, previous: number): number => {
      if (!periodMs) return 0;
      if (previous === 0) {
        return current > 0 ? 100 : 0;
      }
      return Math.round(((current - previous) / previous) * 100);
    };

    const toList = (countMap: Map<string, number>, revenueMap: Map<string, number>, baseTotal: number) =>
      Array.from(countMap.entries())
        .map(([label, count]) => {
          const currentRevenue = revenueMap.get(label) ?? 0;
          const previousRevenue = prevCountryRevenue.get(label) ?? 0;
          const growth = calculateGrowth(currentRevenue, previousRevenue);

          return {
            label,
            count,
            revenue: currentRevenue,
            percent: baseTotal ? Math.round((count / baseTotal) * 100) : 0,
            growth,
          };
        })
        .sort((a, b) => b.revenue - a.revenue);

    const countries = toList(countryCounts, countryRevenue, total).slice(0, 5);
    const usStates = Array.from(usStateCounts.entries())
      .map(([label, count]) => {
        const currentRevenue = usStateRevenue.get(label) ?? 0;
        const previousRevenue = prevUsStateRevenue.get(label) ?? 0;
        const growth = calculateGrowth(currentRevenue, previousRevenue);

        return {
          label,
          count,
          revenue: currentRevenue,
          percent: usOrders ? Math.round((count / usOrders) * 100) : 0,
          growth,
        };
      })
      .sort((a, b) => b.revenue - a.revenue);
    const hasCountryData = countries.some((item) => item.label !== UNKNOWN_LOCATION);
    const hasUsStateData = usStates.some((item) => item.label !== UNKNOWN_LOCATION);

    return { total, countries, usStates, usOrders, hasCountryData, hasUsStateData, totalRevenue };
  }, [orders, locationRange]);

  const analyticsTrends = useMemo(() => {
    if (!analyticsData?.trends) return null;
    const { labels, visitors, devices } = analyticsData.trends;
    if (!labels?.length || !visitors?.total?.length) return null;

    const length = Math.min(labels.length, visitors.total.length);
    if (!length) return null;

    const trimmedDevices: Record<string, number[]> = {};
    Object.entries(devices ?? {}).forEach(([device, values]) => {
      const normalized = Array.from({ length }, (_, index) => values[index] ?? 0);
      trimmedDevices[device] = normalized;
    });

    return {
      labels: labels.slice(0, length),
      visitors: {
        total: visitors.total.slice(0, length),
        unique: visitors.unique?.slice(0, length) ?? [],
      },
      devices: trimmedDevices,
    };
  }, [analyticsData]);

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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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


      {/* Visitor Analytics Section */}
      <section className={`rounded-3xl border border-slate-200/60 ${glassMedium} shadow-sm`}>
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-5">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Visitor Analytics</h2>
            <p className="text-sm text-slate-500">Real-time tracking of website visitors and traffic sources.</p>
          </div>
          <div className={`flex items-center rounded-full ${glassLight} p-1 shadow-sm ring-1 ring-white/70`}>
            {(['7d', '30d', '90d', '1y'] as const).map((period) => {
              const isActive = analyticsPeriod === period;
              const label = period === '7d' ? '7D' : period === '30d' ? '30D' : period === '90d' ? '90D' : '1Y';
              return (
                <button
                  key={period}
                  type="button"
                  onClick={() => setAnalyticsPeriod(period)}
                  aria-pressed={isActive}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                    isActive
                      ? 'bg-gradient-to-r from-primary to-primary-dark shadow-md text-white'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {analyticsLoading ? (
          <div className="px-6 pb-6">
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          </div>
        ) : !analyticsData ? (
          <div className="px-6 pb-6">
            <div className={`rounded-xl border border-dashed border-slate-200/60 ${glassXLight} px-4 py-12 text-center text-sm text-slate-500`}>
              No analytics data available yet.
            </div>
          </div>
        ) : (
          <div className="px-6 pb-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className={`rounded-xl border border-slate-200/60 ${glassXLight} p-4 shadow-sm`}>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                    <Users className="h-5 w-5 text-blue-700" />
                  </div>
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Total Visitors</p>
                    <p className="text-xl font-bold text-slate-900">{formatCount(analyticsData.summary.totalVisitors)}</p>
                  </div>
                </div>
              </div>

              <div className={`rounded-xl border border-slate-200/60 ${glassXLight} p-4 shadow-sm`}>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                    <Users className="h-5 w-5 text-emerald-700" />
                  </div>
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Unique Visitors</p>
                    <p className="text-xl font-bold text-slate-900">{formatCount(analyticsData.summary.uniqueVisitors)}</p>
                  </div>
                </div>
              </div>

              <div className={`rounded-xl border border-slate-200/60 ${glassXLight} p-4 shadow-sm`}>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100">
                    <TrendingUp className="h-5 w-5 text-purple-700" />
                  </div>
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Conversion Rate</p>
                    <p className="text-xl font-bold text-slate-900">{analyticsData.summary.conversionRate.toFixed(2)}%</p>
                  </div>
                </div>
              </div>
            </div>

              <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start">
                <div className={`rounded-2xl border border-slate-200/60 ${glassXLight} p-5`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">Visitor count</h3>
                      <p className="text-xs text-slate-500">Daily totals with device mix on hover.</p>
                    </div>
                    <div className="text-xs font-medium text-slate-500">
                      {formatCount(analyticsData.summary.totalVisitors)} visitors
                    </div>
                  </div>
                  <div className="mt-4">
                    {analyticsTrends ? (
                      <VisitorDeviceChart
                        labels={analyticsTrends.labels}
                        totals={analyticsTrends.visitors.total}
                        devices={analyticsTrends.devices}
                      />
                    ) : (
                      <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-slate-200/60 bg-white/60 text-xs text-slate-400">
                        No trend data yet.
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-4 lg:h-full">
                  {/* Top Referrers */}
                  <div className={`flex flex-col rounded-xl border border-slate-200/60 ${glassXLight} p-4 lg:flex-1`}>
                    <div className="mb-3 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-slate-600" />
                      <h3 className="text-sm font-semibold text-slate-900">Traffic Sources</h3>
                    </div>
                    <div className="space-y-2">
                      {analyticsData.topReferrers.length === 0 ? (
                        <p className="text-xs text-slate-400">No data yet</p>
                      ) : (
                        analyticsData.topReferrers.slice(0, 5).map((item, index) => {
                          const percentage = analyticsData.summary.totalVisitors
                            ? ((item.visitors / analyticsData.summary.totalVisitors) * 100).toFixed(1)
                            : '0';
                          return (
                            <div key={item.source} className="flex items-center justify-between">
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <span className="text-xs font-medium text-slate-400">#{index + 1}</span>
                                <span className="text-xs font-medium text-slate-700 truncate">{item.source}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-slate-900">{formatCount(item.visitors)}</span>
                                <span className="text-[10px] text-slate-400">{percentage}%</span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Top Countries */}
                  <div className={`flex flex-col rounded-xl border border-slate-200/60 ${glassXLight} p-4 lg:flex-1`}>
                    <div className="mb-3 flex items-center gap-2">
                      <Globe className="h-4 w-4 text-slate-600" />
                      <h3 className="text-sm font-semibold text-slate-900">Top Countries</h3>
                    </div>
                    <div className="space-y-2">
                      {analyticsData.topCountries.length === 0 ? (
                        <p className="text-xs text-slate-400">No data yet</p>
                      ) : (
                        analyticsData.topCountries.slice(0, 5).map((item, index) => {
                          const percentage = analyticsData.summary.totalVisitors
                            ? ((item.visitors / analyticsData.summary.totalVisitors) * 100).toFixed(1)
                            : '0';
                          return (
                            <div key={item.country} className="flex items-center justify-between">
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <span className="text-xs font-medium text-slate-400">#{index + 1}</span>
                                <span className="text-xs font-medium text-slate-700 truncate">{item.country}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-slate-900">{formatCount(item.visitors)}</span>
                                <span className="text-[10px] text-slate-400">{percentage}%</span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              </div>
          </div>
        )}
      </section>

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
                <h2 className="text-lg font-semibold text-slate-900">Geo Location</h2>
              </div>
              <div className={`flex items-center rounded-full ${glassLight} p-1 shadow-sm ring-1 ring-white/70`}>
                {rangeOptions.map((option) => {
                  const isActive = locationRange === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setLocationRange(option.id)}
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
            <div className="p-6">
              {locationSummary.total === 0 ? (
                <div className={`rounded-xl border border-dashed border-slate-200/60 ${glassXLight} px-4 py-6 text-center text-sm text-slate-500`}>
                  No orders yet.
                </div>
              ) : locationSummary.hasCountryData ? (
                <div className="space-y-3">
                  {locationSummary.countries.map((item) => {
                    const countryCodes: Record<string, string> = {
                      'United Kingdom': 'UK',
                      'Spain': 'ES',
                      'United States': 'US',
                      'Germany': 'DE',
                      'France': 'FR',
                      'Italy': 'IT',
                      'Canada': 'CA',
                      'Australia': 'AU',
                      'Japan': 'JP',
                      'China': 'CN',
                    };
                    const code = countryCodes[item.label] || item.label.slice(0, 2).toUpperCase();
                    const isPositiveGrowth = item.growth >= 0;
                    const isUnitedStates = item.label === US_COUNTRY_LABEL;
                    const hasStates = locationSummary.usStates.length > 0;
  
                    return (
                      <div key={`country-${item.label}`}>
                        {/* Country row */}
                        <div className="flex items-center justify-between group">
                          <button
                            type="button"
                            onClick={() => isUnitedStates && hasStates ? setShowUsStates((prev) => !prev) : undefined}
                            className={`flex items-center gap-3 min-w-0 flex-1 ${isUnitedStates && hasStates ? 'cursor-pointer' : 'cursor-default'}`}
                          >
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm border border-slate-200/60 text-xs font-semibold text-slate-700 flex-shrink-0">
                              {code}
                            </div>
                            <div className="min-w-0 text-left">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold text-slate-900 truncate">{item.label}</p>
                                {isUnitedStates && hasStates && (
                                  <ChevronDown
                                    className={`h-3.5 w-3.5 text-slate-500 transition-transform ${
                                      showUsStates ? 'rotate-180' : ''
                                    }`}
                                  />
                                )}
                              </div>
                              <p className="text-xs text-slate-500">{formatCount(item.count)} Sales</p>
                            </div>
                          </button>
                          <div className="text-right flex-shrink-0 ml-4">
                            <p className="text-sm font-bold text-slate-900">{formatCurrency(item.revenue)}</p>
                            <p className={`text-xs font-semibold ${isPositiveGrowth ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {isPositiveGrowth ? '+' : ''}{item.growth}%
                            </p>
                          </div>
                        </div>
  
                        {/* Expandable US States section */}
                        {isUnitedStates && hasStates && showUsStates && (
                          <div className="mt-3 ml-14 space-y-2 max-h-64 overflow-y-auto pr-2">
                            {locationSummary.usStates.map((state) => {
                              const isPositiveStateGrowth = state.growth >= 0;
                              return (
                                <div
                                  key={`state-${state.label}`}
                                  className={`flex items-center justify-between rounded-lg ${glassXLight} px-3 py-2.5`}
                                >
                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-600 flex-shrink-0">
                                      {state.label.slice(0, 2).toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-xs font-medium text-slate-700 truncate">{state.label}</p>
                                      <p className="text-[10px] text-slate-400">{formatCount(state.count)} Sales</p>
                                    </div>
                                  </div>
                                  <div className="text-right flex-shrink-0 ml-3">
                                    <p className="text-xs font-bold text-slate-900">{formatCurrency(state.revenue)}</p>
                                    <p className={`text-[10px] font-semibold ${isPositiveStateGrowth ? 'text-emerald-600' : 'text-rose-600'}`}>
                                      {isPositiveStateGrowth ? '+' : ''}{state.growth}%
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className={`rounded-xl border border-dashed border-slate-200/60 ${glassXLight} px-4 py-6 text-center text-sm text-slate-500`}>
                  No country data yet.
                </div>
              )}
            </div>
          </section>
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
        </aside>
      </div>
    </div>
  );
};
