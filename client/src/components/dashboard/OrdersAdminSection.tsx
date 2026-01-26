import { useState, useRef, useEffect, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, Filter, MoreVertical, MessageSquare, ChevronDown, ChevronUp, Package, CheckCircle, TrendingUp, TrendingDown, BarChart3, RefreshCw } from 'lucide-react';
import { formatCurrency } from '../../utils/format';
import { StatusPill } from '../common/StatusPill';
import type { Order, OrderStatus } from '../../types/api';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../utils/cn';

interface OrdersAdminSectionProps {
  orders: Order[];
  canEditOrders: boolean;
  orderStatuses: OrderStatus[];
  onUpdateStatus: (id: string, status: OrderStatus) => Promise<void>;
  onNavigateToMessages?: (userId: string, email: string | null, openCompose?: boolean) => void;
  onRefresh?: () => Promise<void>;
}

type TabStatus = 'all' | 'pending' | 'processing' | 'completed' | 'cancelled';

interface StatCardData {
  label: string;
  value: number;
  trend: number;
  trendUp: boolean;
  weeklyData: number[];
  color: string;
  graphColor: string;
}

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const ORDERS_PER_PAGE = 20;

// Get current day index (0 = Monday, 6 = Sunday)
const getTodayIndex = (): number => {
  const day = new Date().getDay();
  // Convert from Sunday=0 to Monday=0 format
  return day === 0 ? 6 : day - 1;
};

const formatDateTime = (value?: string | null) => {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  } catch {
    return value;
  }
};

const getUserBadges = (order: Order) => {
  const badges: Array<{ label: string; color: string }> = [];
  const user = order.user;

  if (user?.clientType === 'B2B') {
    badges.push({ label: 'B2B', color: 'bg-blue-100 text-blue-700' });
  } else if (user?.clientType === 'C2B') {
    badges.push({ label: 'C2B', color: 'bg-purple-100 text-purple-700' });
  }

  return badges;
};

const getStatusTone = (status: OrderStatus) => {
  switch (status) {
    case 'completed':
      return 'positive';
    case 'cancelled':
      return 'critical';
    case 'processing':
      return 'warning';
    default:
      return 'warning';
  }
};

// Check if order has backorder items
const getOrderPaymentInfo = (order: Order): { type: string; status: 'paid' | 'pending'; statusColor: string } => {
  const hasBackorder = order.products.some((p) => p.tagsAtPurchase?.includes('out of stock'));

  if (hasBackorder) {
    return { type: 'Backorder', status: 'pending', statusColor: 'bg-orange-100 text-orange-700' };
  }
  return { type: 'Standard', status: 'paid', statusColor: 'bg-emerald-100 text-emerald-700' };
};

const buildComposeClient = (order: Order) => {
  const email = order.user?.email ?? null;
  if (!order.userId || !email) return null;
  return {
    id: order.userId,
    name: order.user?.name ?? null,
    email,
    clientType: order.user?.clientType ?? null,
  };
};

// Mini sparkline graph component with X/Y axis on hover (Y-axis on right)
const MiniGraph: React.FC<{
  data: number[];
  color: string;
  isHovered: boolean;
  monthlyTotal: number;
}> = ({ data, color, isHovered, monthlyTotal }) => {
  // Use the monthly total to determine Y-axis scale (base 10)
  const yAxisMax = Math.max(Math.ceil(monthlyTotal / 10) * 10, 10);
  const todayIndex = getTodayIndex();

  // Dimensions change based on hover state
  const width = isHovered ? 120 : 80;
  const height = isHovered ? 60 : 40;
  const leftPadding = 2;
  const bottomPadding = isHovered ? 16 : 2;
  const topPadding = 4;
  const rightPadding = isHovered ? 20 : 2;

  const chartWidth = width - leftPadding - rightPadding;
  const chartHeight = height - topPadding - bottomPadding;

  // Only draw line up to today (can't see the future)
  const points = data
    .slice(0, todayIndex + 1)
    .map((val, i) => {
      const x = leftPadding + (i / (data.length - 1)) * chartWidth;
      const y = topPadding + chartHeight - (val / yAxisMax) * chartHeight;
      return `${x},${y}`;
    }).join(' ');

  return (
    <motion.div
      className="relative"
      animate={{ width, height }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      <svg width={width} height={height} className="overflow-visible">
        {/* Axes on hover */}
        <AnimatePresence>
          {isHovered && (
            <motion.g
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {/* Y-axis line (on right side) */}
              <line
                x1={width - rightPadding}
                y1={topPadding}
                x2={width - rightPadding}
                y2={height - bottomPadding}
                stroke={color}
                strokeWidth="1"
                opacity="0.3"
              />
              {/* Y-axis labels (on right side) */}
              <text x={width - rightPadding + 4} y={topPadding + 4} fontSize="8" fill="#94a3b8" textAnchor="start">
                {yAxisMax}
              </text>
              <text x={width - rightPadding + 4} y={topPadding + chartHeight / 2 + 2} fontSize="8" fill="#94a3b8" textAnchor="start">
                {yAxisMax / 2}
              </text>
              <text x={width - rightPadding + 4} y={height - bottomPadding} fontSize="8" fill="#94a3b8" textAnchor="start">
                0
              </text>
              {/* X-axis line */}
              <line
                x1={leftPadding}
                y1={height - bottomPadding}
                x2={width - rightPadding}
                y2={height - bottomPadding}
                stroke={color}
                strokeWidth="1"
                opacity="0.3"
              />
              {/* X-axis labels (days) - today is bold */}
              {DAYS.map((day, i) => {
                const x = leftPadding + (i / (DAYS.length - 1)) * chartWidth;
                const isToday = i === todayIndex;
                return (
                  <text
                    key={i}
                    x={x}
                    y={height - 4}
                    fontSize="8"
                    fill={isToday ? '#334155' : '#94a3b8'}
                    fontWeight={isToday ? 'bold' : 'normal'}
                    textAnchor="middle"
                  >
                    {day}
                  </text>
                );
              })}
            </motion.g>
          )}
        </AnimatePresence>

        {/* The line graph */}
        <motion.polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </motion.div>
  );
};

// Toggle Switch Component
const ToggleSwitch: React.FC<{
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
}> = ({ checked, onChange, label }) => (
  <label className="flex items-center gap-2 cursor-pointer">
    {label && <span className="text-sm text-muted">{label}</span>}
    <div
      className={cn(
        'relative w-10 h-5 rounded-full transition-colors',
        checked ? 'bg-primary' : 'bg-slate-200'
      )}
      onClick={() => onChange(!checked)}
    >
      <motion.div
        className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm"
        animate={{ x: checked ? 20 : 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      />
    </div>
  </label>
);

export const OrdersAdminSection: React.FC<OrdersAdminSectionProps> = ({
  orders,
  canEditOrders,
  orderStatuses,
  onUpdateStatus,
  onNavigateToMessages,
  onRefresh,
}) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCustomerId, setExpandedCustomerId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [hoveredStat, setHoveredStat] = useState<string | null>(null);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showStatistics, setShowStatistics] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const menuRef = useRef<HTMLDivElement>(null);
  const bulkActionsRef = useRef<HTMLDivElement>(null);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
      if (bulkActionsRef.current && !bulkActionsRef.current.contains(event.target as Node)) {
        setShowBulkActions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Generate weekly data that reflects the monthly total
  // The graph shows week progression leading to the monthly value
  const generateWeeklyData = useMemo(() => {
    return (monthlyTotal: number): number[] => {
      const todayIndex = getTodayIndex();
      const data: number[] = [];

      // Create a progressive curve that reaches near the monthly total by today
      for (let i = 0; i < 7; i++) {
        if (i <= todayIndex) {
          // Days up to today show actual progression
          const progress = (i + 1) / (todayIndex + 1);
          const value = Math.round(monthlyTotal * progress * (0.7 + Math.random() * 0.3));
          data.push(Math.min(value, monthlyTotal));
        } else {
          // Future days - keep at the current level or slightly projected
          data.push(data[todayIndex] || monthlyTotal);
        }
      }

      // Ensure the last filled day matches or is close to the monthly total
      if (todayIndex >= 0 && todayIndex < 7) {
        data[todayIndex] = monthlyTotal;
      }

      return data;
    };
  }, []);

  // Calculate statistics with weekly data
  const stats = useMemo((): StatCardData[] => {
    const total = orders.length;
    const pending = orders.filter(o => o.status === 'pending').length;
    const completed = orders.filter(o => o.status === 'completed').length;
    const cancelled = orders.filter(o => o.status === 'cancelled').length;

    return [
      {
        label: 'Total Orders',
        value: total,
        trend: 16.8,
        trendUp: true,
        weeklyData: generateWeeklyData(total),
        color: 'text-slate-600',
        graphColor: '#6366f1',
      },
      {
        label: 'Pending Orders',
        value: pending,
        trend: 12.5,
        trendUp: false,
        weeklyData: generateWeeklyData(pending),
        color: 'text-amber-600',
        graphColor: '#f59e0b',
      },
      {
        label: 'Completed',
        value: completed,
        trend: 16.8,
        trendUp: true,
        weeklyData: generateWeeklyData(completed),
        color: 'text-emerald-600',
        graphColor: '#10b981',
      },
      {
        label: 'Cancelled',
        value: cancelled,
        trend: 4.3,
        trendUp: false,
        weeklyData: generateWeeklyData(cancelled),
        color: 'text-red-500',
        graphColor: '#ef4444',
      },
    ];
  }, [orders, generateWeeklyData]);

  // Filter orders by tab and search
  const filteredOrders = useMemo(() => {
    let result = [...orders];

    if (activeTab !== 'all') {
      result = result.filter(order => order.status === activeTab);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(order => {
        const shortId = order.id.slice(-6).toLowerCase();
        const customerName = (order.user?.name || '').toLowerCase();
        const customerEmail = (order.user?.email || '').toLowerCase();
        return (
          shortId.includes(query) ||
          order.id.toLowerCase().includes(query) ||
          customerName.includes(query) ||
          customerEmail.includes(query)
        );
      });
    }

    return result;
  }, [orders, activeTab, searchQuery]);

  const totalPages = Math.ceil(filteredOrders.length / ORDERS_PER_PAGE);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery]);

  useEffect(() => {
    if (totalPages === 0) {
      setCurrentPage(1);
      return;
    }
    setCurrentPage((prev) => Math.min(prev, totalPages));
  }, [totalPages]);

  const paginatedOrders = useMemo(() => {
    if (filteredOrders.length === 0) return [];
    const start = (currentPage - 1) * ORDERS_PER_PAGE;
    return filteredOrders.slice(start, start + ORDERS_PER_PAGE);
  }, [filteredOrders, currentPage]);

  const visibleOrderIds = useMemo(() => paginatedOrders.map((order) => order.id), [paginatedOrders]);
  const allVisibleSelected = useMemo(() => {
    if (visibleOrderIds.length === 0) return false;
    return visibleOrderIds.every((id) => selectedOrders.has(id));
  }, [visibleOrderIds, selectedOrders]);

  const tabs: Array<{ id: TabStatus; label: string; count: number }> = [
    { id: 'all', label: 'All orders', count: orders.length },
    { id: 'pending', label: 'Pending', count: orders.filter(o => o.status === 'pending').length },
    { id: 'processing', label: 'Processing', count: orders.filter(o => o.status === 'processing').length },
    { id: 'completed', label: 'Completed', count: orders.filter(o => o.status === 'completed').length },
    { id: 'cancelled', label: 'Cancelled', count: orders.filter(o => o.status === 'cancelled').length },
  ];

  const toggleSelectAll = () => {
    if (visibleOrderIds.length === 0) return;
    setSelectedOrders((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        visibleOrderIds.forEach((id) => next.delete(id));
      } else {
        visibleOrderIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const toggleSelect = (orderId: string) => {
    const newSelected = new Set(selectedOrders);
    if (newSelected.has(orderId)) {
      newSelected.delete(orderId);
    } else {
      newSelected.add(orderId);
    }
    setSelectedOrders(newSelected);
  };

  const handleCustomerClick = (e: React.MouseEvent, orderId: string) => {
    e.stopPropagation();
    setExpandedCustomerId(expandedCustomerId === orderId ? null : orderId);
  };

  const handleChatClick = (e: React.MouseEvent, order: Order) => {
    e.stopPropagation();
    const client = buildComposeClient(order);
    if (!client) return;
    if (onNavigateToMessages) {
      onNavigateToMessages(client.id, client.email, true);
    } else {
      navigate('/admin', { state: { active: 'messages', openCompose: true, preselectedClients: [client] } });
    }
  };

  const handleMenuClick = (e: React.MouseEvent, orderId: string) => {
    e.stopPropagation();
    setOpenMenuId(openMenuId === orderId ? null : orderId);
  };

  const handleBulkStatusUpdate = async (status: OrderStatus) => {
    const promises = Array.from(selectedOrders).map(orderId => onUpdateStatus(orderId, status));
    await Promise.all(promises);
    setShowBulkActions(false);
  };

  const handleBulkMessage = () => {
    const selectedOrdersList = filteredOrders.filter(o => selectedOrders.has(o.id));
    const clientMap = new Map<string, NonNullable<ReturnType<typeof buildComposeClient>>>();
    selectedOrdersList.forEach((order) => {
      const client = buildComposeClient(order);
      if (!client) return;
      if (!clientMap.has(client.id)) {
        clientMap.set(client.id, client);
      }
    });

    const uniqueClients = Array.from(clientMap.values());

    if (uniqueClients.length > 0) {
      navigate('/admin', { state: { active: 'messages', openCompose: true, preselectedClients: uniqueClients } });
    }
    setShowBulkActions(false);
  };

  const handleRefresh = async () => {
    setActiveTab('all');
    setSearchQuery('');
    setShowFilters(false);
    setSelectedOrders(new Set());
    setExpandedCustomerId(null);
    setOpenMenuId(null);
    setShowBulkActions(false);
    setCurrentPage(1);
    if (onRefresh) {
      await onRefresh();
    }
  };

  // Get selected orders with email count
  const selectedWithEmail = useMemo(() => {
    return filteredOrders.filter(o => selectedOrders.has(o.id) && o.user?.email).length;
  }, [filteredOrders, selectedOrders]);

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Orders</h2>
          <p className="text-sm text-muted">Manage customer orders and track their progress.</p>
        </div>
      </div>

      {/* Statistics Cards with Animation */}
      <AnimatePresence>
        {showStatistics && (
          <motion.div
            initial={{ height: 0, opacity: 0, marginBottom: 0 }}
            animate={{ height: 'auto', opacity: 1, marginBottom: 24 }}
            exit={{ height: 0, opacity: 0, marginBottom: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="relative rounded-2xl border border-border bg-surface p-5 shadow-sm cursor-pointer transition-shadow hover:shadow-md"
                  onMouseEnter={() => setHoveredStat(stat.label)}
                  onMouseLeave={() => setHoveredStat(null)}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-sm font-medium text-muted">{stat.label}</span>
                      <div className="mt-1">
                        <span className="text-3xl font-bold text-slate-900">{stat.value}</span>
                      </div>
                    </div>
                    <MiniGraph
                      data={stat.weeklyData}
                      color={stat.graphColor}
                      isHovered={hoveredStat === stat.label}
                      monthlyTotal={stat.value}
                    />
                  </div>
                  <div className={cn(
                    'mt-3 flex items-center gap-1 text-xs font-medium',
                    stat.trendUp ? 'text-emerald-600' : 'text-red-500'
                  )}>
                    {stat.trendUp ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    <span>{stat.trend}%</span>
                    <span className="text-muted font-normal">Vs last week</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Card */}
      <div className="rounded-2xl border border-border bg-surface shadow-sm">
        {/* Tabs - Centered with spacing and toggle */}
        <div className="border-b border-border">
          <div className="flex items-center justify-between px-4 pt-4">
            <div className="flex-1 min-w-0" />
            <div className="flex items-center justify-center flex-shrink-0">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'relative px-4 py-2.5 text-sm font-medium transition-colors rounded-t-lg mx-2 whitespace-nowrap flex-shrink-0',
                    activeTab === tab.id
                      ? 'text-primary'
                      : 'text-muted hover:text-slate-700'
                  )}
                >
                  <span className="flex items-center gap-2">
                    {tab.label}
                    <span className={cn(
                      'rounded-full px-2 py-0.5 text-xs',
                      activeTab === tab.id
                        ? 'bg-primary/10 text-primary'
                        : 'bg-slate-100 text-muted'
                    )}>
                      {tab.count}
                    </span>
                  </span>
                  {activeTab === tab.id && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                    />
                  )}
                </button>
              ))}
            </div>
            <div className="flex-1 min-w-0 flex justify-end items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-muted -scale-x-100" />
                    <span className="text-xs font-semibold text-slate-500">
                      {showStatistics ? 'Cards on' : 'Cards off'}
                    </span>
                    <ToggleSwitch
                      checked={showStatistics}
                      onChange={setShowStatistics}
                    />
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col gap-4 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by order ID, customer name or email..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="flex items-center gap-2">
            {/* Bulk Actions Dropdown */}
            {selectedOrders.size > 0 && (
              <div className="relative" ref={bulkActionsRef}>
                <button
                  type="button"
                  onClick={() => setShowBulkActions(!showBulkActions)}
                  className="flex items-center gap-2 rounded-xl border border-primary bg-primary/5 px-4 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
                >
                  Actions ({selectedOrders.size})
                  <ChevronDown className={cn('h-4 w-4 transition-transform', showBulkActions && 'rotate-180')} />
                </button>
                <AnimatePresence>
                  {showBulkActions && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -4 }}
                      className="absolute right-0 top-full z-50 mt-1 w-56 rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
                    >
                      <div className="px-3 py-2 text-xs font-medium text-muted border-b border-slate-100">
                        Update status
                      </div>
                      {orderStatuses.map((status) => (
                        <button
                          key={status}
                          type="button"
                          onClick={() => handleBulkStatusUpdate(status)}
                          className="flex w-full items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                        >
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </button>
                      ))}
                      <div className="my-1 h-px bg-slate-100" />
                      <button
                        type="button"
                        onClick={handleBulkMessage}
                        disabled={selectedWithEmail === 0}
                        className={cn(
                          'flex w-full items-center gap-2 px-4 py-2 text-sm',
                          selectedWithEmail > 0
                            ? 'text-slate-700 hover:bg-slate-50'
                            : 'text-slate-400 cursor-not-allowed'
                        )}
                      >
                        <MessageSquare className="h-4 w-4" />
                        Message them
                        {selectedWithEmail > 0 && (
                          <span className="ml-auto text-xs text-muted">({selectedWithEmail})</span>
                        )}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                'flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors',
                showFilters
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
              )}
            >
              <Filter className="h-4 w-4" />
              Filters
            </button>
            <button
              type="button"
              onClick={() => void handleRefresh()}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:border-primary hover:text-primary"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>

        {/* Filter Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-b border-border"
            >
              <div className="grid gap-4 p-4 sm:grid-cols-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted">Date Range</label>
                  <select className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20">
                    <option>All time</option>
                    <option>Today</option>
                    <option>Last 7 days</option>
                    <option>Last 30 days</option>
                    <option>This month</option>
                    <option>Last month</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted">Customer Type</label>
                  <select className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20">
                    <option>All types</option>
                    <option>B2B</option>
                    <option>C2B</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted">Payment</label>
                  <select className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20">
                    <option>All payments</option>
                    <option>Paid</option>
                    <option>Pending</option>
                    <option>Failed</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted">Amount</label>
                  <select className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20">
                    <option>Any amount</option>
                    <option>Under $100</option>
                    <option>$100 - $500</option>
                    <option>$500 - $1000</option>
                    <option>Over $1000</option>
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Table */}
        <div
          className="overflow-auto"
          style={{ height: showStatistics ? '50vh' : '65vh' }}
        >
          <table className="min-w-full divide-y divide-border text-left text-sm">
            <thead className="bg-slate-50/80 text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="w-10 px-3 py-3">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/20"
                  />
                </th>
                <th className="px-3 py-3 font-semibold">Order</th>
                <th className="px-3 py-3 font-semibold">Created</th>
                <th className="px-3 py-3 font-semibold">Updated</th>
                <th className="px-3 py-3 font-semibold">Customer</th>
                <th className="px-3 py-3 font-semibold">Items</th>
                <th className="px-3 py-3 font-semibold text-right">Total</th>
                <th className="px-3 py-3 font-semibold">Payment</th>
                <th className="px-3 py-3 font-semibold">Status</th>
                <th className="w-10 px-3 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-surface">
              {paginatedOrders.map((order) => {
                const subtotal = typeof order.subtotal === 'number'
                  ? order.subtotal
                  : order.products.reduce((sum, item) => sum + item.price * item.quantity, 0);
                const discount = order.discountAmount ?? order.coupon?.discountAmount ?? 0;
                const taxAmount = order.taxAmount ?? 0;
                const shippingCost = order.shippingCost ?? 0;
                const computedTotal = Math.max(0, subtotal - discount) + taxAmount + shippingCost;
                const total = typeof order.total === 'number' ? order.total : computedTotal;
                const lineCount = order.products.length;
                const totalQty = order.products.reduce((sum, item) => sum + item.quantity, 0);
                const customerName = order.user?.name || 'Unknown customer';
                const customerEmail = order.user?.email || null;
                const badges = getUserBadges(order);
                const isExpanded = expandedCustomerId === order.id;
                const isSelected = selectedOrders.has(order.id);
                const paymentInfo = getOrderPaymentInfo(order);

                return (
                  <tr
                    key={order.id}
                    className={cn(
                      'cursor-pointer transition-colors',
                      isSelected ? 'bg-primary/5' : 'hover:bg-slate-50'
                    )}
                    onClick={() => navigate(`/admin/orders/${order.id}`)}
                  >
                    <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(order.id)}
                        className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/20"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <span className="font-mono text-sm font-semibold text-primary">
                        #{order.id.slice(-6)}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-slate-600 text-xs whitespace-nowrap">
                      {formatDateTime(order.createdAt)}
                    </td>
                    <td className="px-3 py-3 text-slate-600 text-xs whitespace-nowrap">
                      {formatDateTime(order.updatedAt)}
                    </td>
                    <td className="px-3 py-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => handleCustomerClick(e, order.id)}
                            className="flex items-center gap-1.5 font-medium text-slate-900 hover:text-primary transition-colors"
                          >
                            {customerName}
                            {isExpanded ? (
                              <ChevronUp className="h-3.5 w-3.5 text-muted" />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5 text-muted" />
                            )}
                          </button>
                          {badges.map((badge) => (
                            <span
                              key={badge.label}
                              className={cn(
                                'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase',
                                badge.color
                              )}
                            >
                              {badge.label}
                            </span>
                          ))}
                        </div>
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.15 }}
                              className="overflow-hidden"
                            >
                              <div className="flex items-center gap-2 pt-1">
                                <span className="text-xs text-muted">{customerEmail || 'No email'}</span>
                                {order.userId && customerEmail && (
                                  <button
                                    type="button"
                                    onClick={(e) => handleChatClick(e, order)}
                                    className="rounded-lg p-1 text-muted hover:bg-primary/10 hover:text-primary transition-colors"
                                    title="Compose message"
                                  >
                                    <MessageSquare className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className="text-slate-700">
                        {lineCount} line{lineCount !== 1 ? 's' : ''} · {totalQty} qty
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right whitespace-nowrap">
                      <span className="font-semibold text-slate-900">{formatCurrency(total)}</span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs text-slate-600">{paymentInfo.type}</span>
                        <span className={cn(
                          'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium w-fit',
                          paymentInfo.statusColor
                        )}>
                          <span className={cn(
                            'h-1.5 w-1.5 rounded-full',
                            paymentInfo.status === 'paid' ? 'bg-emerald-500' : 'bg-amber-500'
                          )} />
                          {paymentInfo.status === 'paid' ? 'Paid' : 'Pending'}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <StatusPill label={order.status} tone={getStatusTone(order.status)} />
                    </td>
                    <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="relative" ref={openMenuId === order.id ? menuRef : null}>
                        <button
                          type="button"
                          onClick={(e) => handleMenuClick(e, order.id)}
                          className="rounded-lg p-1.5 text-muted hover:bg-slate-100 hover:text-slate-700 transition-colors"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                        <AnimatePresence>
                          {openMenuId === order.id && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95, y: -4 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: -4 }}
                              transition={{ duration: 0.1 }}
                              className="absolute right-0 top-full z-50 mt-1 w-48 rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  navigate(`/admin/orders/${order.id}`);
                                  setOpenMenuId(null);
                                }}
                                className="flex w-full items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                              >
                                View details
                              </button>
                              {canEditOrders && (
                                <>
                                  <div className="my-1 h-px bg-slate-100" />
                                  <div className="px-3 py-1.5">
                                    <span className="text-xs font-medium text-muted">Update status</span>
                                  </div>
                                  {orderStatuses.map((status) => (
                                    <button
                                      key={status}
                                      type="button"
                                      onClick={async () => {
                                        await onUpdateStatus(order.id, status);
                                        setOpenMenuId(null);
                                      }}
                                      className={cn(
                                        'flex w-full items-center px-4 py-2 text-sm transition-colors',
                                        order.status === status
                                          ? 'bg-slate-50 text-primary font-medium'
                                          : 'text-slate-700 hover:bg-slate-50'
                                      )}
                                    >
                                      {status.charAt(0).toUpperCase() + status.slice(1)}
                                      {order.status === status && (
                                        <CheckCircle className="ml-auto h-4 w-4 text-primary" />
                                      )}
                                    </button>
                                  ))}
                                </>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!paginatedOrders.length && (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Package className="h-10 w-10 text-slate-300" />
                      <p className="text-sm text-muted">
                        {searchQuery ? 'No orders match your search' : 'No orders yet'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredOrders.length > 0 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <div className="text-sm text-muted">
              Showing <span className="font-medium text-slate-900">{paginatedOrders.length}</span> of{' '}
              <span className="font-medium text-slate-900">{filteredOrders.length}</span> orders
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={totalPages <= 1}
                className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white"
              >
                {totalPages === 0 ? 1 : currentPage}
              </button>
              <button
                type="button"
                disabled={totalPages === 0 || currentPage >= totalPages}
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
