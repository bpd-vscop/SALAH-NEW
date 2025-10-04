// filepath: apps/admin/app/(dashboard)/page.tsx
// Modern dashboard page matching Boltshift design reference exactly

"use client";

import { api } from "../../lib/api";
import { useState } from "react";

export default function DashboardPage() {
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'quarter' | 'year'>('month');

  // Use analytics dashboard stats (admin.analytics.getDashboardStats)
  const { data: analytics, isLoading, error } = api.admin.analytics.getDashboardStats.useQuery({ period: 'month' });
  
  // Mock data that matches the design reference exactly
  const mockData = {
    totalSales: 2500,
    increase: 4.9,
    lastMonth: 2345,
    
    newCustomer: 110,
    customerIncrease: 7.5,
    customerLastMonth: 89,
    
    returnProducts: 72,
    returnDecrease: 6.0,
    returnLastMonth: 60,
    
    totalRevenue: 8220.64,
    revenueIncrease: 4.5,
    revenueLastMonth: 6620.00,
    
    salesGrowth: 70.8,
    numberOfSales: 2343,
    numberOfSalesIncrease: 5.8,
    totalRevenueShort: 30.9,
    totalRevenueIncreaseShort: 4.5,
    
    chartData: {
      totalSales: 440,
      totalRevenue: 4.5
    }
  };

  // Use real data if available, otherwise fall back to mock data
  // Avoid duplicate keys with spread; pull the rest of mock props first
  const { totalSales: _ts, newCustomer: _nc, totalRevenue: _tr, returnProducts: _rp, ...restMock } = mockData;
  const displayData = {
    ...restMock,
    totalSales: analytics?.stats?.totalOrders ?? mockData.totalSales,
    newCustomer: analytics?.stats?.totalCustomers ?? mockData.newCustomer,
    totalRevenue: analytics?.stats?.totalRevenue ?? mockData.totalRevenue,
    returnProducts: mockData.returnProducts,
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Sales Overview Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales Overview</h1>
          <p className="text-gray-600 mt-1">Your current sales summary and activity</p>
        </div>
        <div className="flex items-center space-x-3">
          <select 
            value={period} 
            onChange={(e) => setPeriod(e.target.value as any)}
            className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
            <option value="year">This Year</option>
          </select>
          <button className="flex items-center space-x-2 px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Export</span>
          </button>
          <button className="flex items-center space-x-2 px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <span>Filter</span>
          </button>
        </div>
      </div>

      {/* KPI Cards - Exact design match */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Sales Card - Blue gradient like in design */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-3">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M7 4V2C7 1.45 7.45 1 8 1H16C16.55 1 17 1.45 17 2V4H20C20.55 4 21 4.45 21 5S20.55 6 20 6H19V19C19 20.1 18.1 21 17 21H7C5.9 21 5 20.1 5 19V6H4C3.45 6 3 5.55 3 5S3.45 4 4 4H7ZM9 3V4H15V3H9ZM7 6V19H17V6H7Z"/>
                </svg>
                <span className="text-sm text-blue-100">Total Sales</span>
              </div>
              <div className="text-3xl font-bold mb-2">{displayData.totalSales.toLocaleString()}</div>
              <div className="flex items-center space-x-2 text-sm">
                <span className="flex items-center text-green-300">
                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M7 14l5-5 5 5H7z"/>
                  </svg>
                  +{mockData.increase}%
                </span>
                <span className="text-blue-100">Last month: {mockData.lastMonth}</span>
              </div>
            </div>
          </div>
        </div>

        {/* New Customer Card - White background */}
        <div className="bg-white rounded-xl p-6 border border-gray-100">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-3">
                <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                  </svg>
                </div>
              </div>
              <div className="text-gray-600 text-sm mb-1">New Customer</div>
              <div className="text-2xl font-bold text-gray-900 mb-2">{displayData.newCustomer}</div>
              <div className="flex items-center space-x-2 text-sm">
                <span className="flex items-center text-green-600">
                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M7 14l5-5 5 5H7z"/>
                  </svg>
                  +{mockData.customerIncrease}%
                </span>
                <span className="text-gray-500">Last month: {mockData.customerLastMonth}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Return Products Card - White background */}
        <div className="bg-white rounded-xl p-6 border border-gray-100">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                </div>
              </div>
              <div className="text-gray-600 text-sm mb-1">Return Products</div>
              <div className="text-2xl font-bold text-gray-900 mb-2">{displayData.returnProducts}</div>
              <div className="flex items-center space-x-2 text-sm">
                <span className="flex items-center text-red-600">
                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M7 10l5 5 5-5H7z"/>
                  </svg>
                  -{mockData.returnDecrease}%
                </span>
                <span className="text-gray-500">Last month: {mockData.returnLastMonth}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Total Revenue Card - White background */}
        <div className="bg-white rounded-xl p-6 border border-gray-100">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-3">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                </div>
              </div>
              <div className="text-gray-600 text-sm mb-1">Total Revenue</div>
              <div className="text-2xl font-bold text-gray-900 mb-2">${displayData.totalRevenue.toLocaleString()}</div>
              <div className="flex items-center space-x-2 text-sm">
                <span className="flex items-center text-green-600">
                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M7 14l5-5 5 5H7z"/>
                  </svg>
                  +{mockData.revenueIncrease}%
                </span>
                <span className="text-gray-500">Last month: ${mockData.revenueLastMonth.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section - Side by side like in design */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Performance Overview Chart - Left side */}
        <div className="bg-white rounded-xl p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Performance Overview</h3>
            <select className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white">
              <option>This Week</option>
              <option>This Month</option>
              <option>This Year</option>
            </select>
          </div>
          
          {/* Mock Bar Chart - Matching design */}
          <div className="space-y-4">
            <div className="flex items-end justify-between h-48 px-4">
              {['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month, i) => (
                <div key={month} className="flex flex-col items-center w-12">
                  <div 
                    className={`w-8 rounded-t-sm transition-all duration-300 ${
                      i === 3 ? 'bg-blue-500' : 'bg-gray-200'
                    }`}
                    style={{ 
                      height: `${i === 3 ? '75%' : Math.random() * 40 + 20}%`
                    }}
                  ></div>
                  <span className="text-xs text-gray-500 mt-2">{month}</span>
                </div>
              ))}
            </div>
            
            <div className="border-t pt-4">
              <div className="text-center mb-2">
                <span className="text-sm font-medium text-gray-600">August 2026</span>
              </div>
              <div className="flex items-center justify-center space-x-6 text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                  <span className="text-gray-600">Total Sales: {mockData.chartData.totalSales}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                  <span className="text-gray-600">Total Revenue: ${mockData.chartData.totalRevenue}k</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sales Overview - Right side with circular chart */}
        <div className="bg-white rounded-xl p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Sales Overview</h3>
            <button className="text-gray-400 hover:text-gray-600">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
              </svg>
            </button>
          </div>
          
          {/* Circular Progress Chart */}
          <div className="flex items-center justify-center mb-6">
            <div className="relative w-32 h-32">
              {/* Background circle */}
              <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 128 128">
                <circle
                  cx="64"
                  cy="64"
                  r="52"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="8"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="52"
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="8"
                  strokeDasharray={`${(mockData.salesGrowth / 100) * 326.7} 326.7`}
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-gray-900">{mockData.salesGrowth}%</span>
                <span className="text-xs text-gray-500">Sales Growth</span>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Number of Sales</span>
              <div className="text-right">
                <span className="font-medium">{mockData.numberOfSales.toLocaleString()}</span>
                <span className="ml-2 text-xs text-orange-500 bg-orange-100 px-2 py-0.5 rounded">
                  +{mockData.numberOfSalesIncrease}%
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Total Revenue</span>
              <div className="text-right">
                <span className="font-medium">${mockData.totalRevenueShort}k</span>
                <span className="ml-2 text-xs text-orange-500 bg-orange-100 px-2 py-0.5 rounded">
                  +{mockData.totalRevenueIncreaseShort}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Orders Table */}
      <div className="bg-white rounded-xl border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Recent orders</h3>
            <div className="flex items-center space-x-3">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search products..."
                  className="w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
              <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white">
                <option>Sort by</option>
                <option>Date</option>
                <option>Amount</option>
                <option>Status</option>
              </select>
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-3 px-6 text-sm font-medium text-gray-500 uppercase tracking-wider">
                  <input type="checkbox" className="rounded border-gray-300" />
                </th>
                <th className="text-left py-3 px-6 text-sm font-medium text-gray-500 uppercase tracking-wider">Product info</th>
                <th className="text-left py-3 px-6 text-sm font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                <th className="text-left py-3 px-6 text-sm font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="text-left py-3 px-6 text-sm font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="text-left py-3 px-6 text-sm font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th className="text-left py-3 px-6 text-sm font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-left py-3 px-6 text-sm font-medium text-gray-500 uppercase tracking-wider">Items</th>
                <th className="text-left py-3 px-6 text-sm font-medium text-gray-500 uppercase tracking-wider">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {/* Empty state since we don't have real orders yet */}
              <tr>
                <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                  <div className="flex flex-col items-center space-y-3">
                    <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium">No recent orders</p>
                      <p className="text-xs text-gray-400 mt-1">Orders will appear here when customers start making purchases</p>
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


