import { http } from './http';

export interface AnalyticsSummary {
  summary: {
    totalVisitors: number;
    uniqueVisitors: number;
    conversionRate: number;
  };
  trends?: {
    labels: string[];
    visitors: {
      total: number[];
      unique: number[];
    };
    devices: Record<string, number[]>;
  };
  topCountries: Array<{
    country: string;
    visitors: number;
  }>;
  topReferrers: Array<{
    source: string;
    visitors: number;
  }>;
  deviceBreakdown: Array<{
    device: string;
    visitors: number;
  }>;
}

interface AnalyticsSummaryResponse {
  success: boolean;
  data: AnalyticsSummary;
}

export const analyticsApi = {
  getSummary: (params?: { period?: '7d' | '30d' | '90d' | '1y'; startDate?: string; endDate?: string }) =>
    http.get<AnalyticsSummaryResponse>('/analytics/summary', { params }),
};
