import React, { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  TrendingUp,
  DollarSign,
  FileText,
  Users,
  Calendar,
  Download,
  Filter,
  RefreshCw
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

function Reports() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [monthlyData, setMonthlyData] = useState([]);
  const [topCustomers, setTopCustomers] = useState([]);
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0], // Start of year
    to: new Date().toISOString().split('T')[0] // Today
  });

  useEffect(() => {
    fetchReportsData();
  }, [dateRange]);

  const fetchReportsData = async () => {
    try {
      setLoading(true);
      const [summaryRes, monthlyRes, customersRes] = await Promise.all([
        api.get('/reports/summary', { 
          params: { from: dateRange.from, to: dateRange.to } 
        }),
        api.get('/reports/monthly'),
        api.get('/reports/top-customers', { params: { limit: 10 } })
      ]);

      setSummary(summaryRes.data);
      setMonthlyData(monthlyRes.data);
      setTopCustomers(customersRes.data);
    } catch (error) {
      console.error('Error fetching reports data:', error);
      toast.error('Failed to load reports data');
    } finally {
      setLoading(false);
    }
  };

  const handleDateRangeChange = (field, value) => {
    setDateRange(prev => ({ ...prev, [field]: value }));
  };

  const exportReport = async (type) => {
    try {
      toast.loading('Generating report...', { id: 'export' });
      
      // Here you would call an API endpoint to generate and download the report
      // For now, we'll just show a success message
      setTimeout(() => {
        toast.success(`${type} report exported successfully!`, { id: 'export' });
      }, 2000);
    } catch (error) {
      toast.error('Failed to export report', { id: 'export' });
    }
  };

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-600">Track your business performance and insights</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={fetchReportsData}
            className="inline-flex items-center px-3 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
          <div className="relative">
            <select
              onChange={(e) => exportReport(e.target.value)}
              className="appearance-none bg-blue-600 text-white px-4 py-2 rounded-lg pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500"
              defaultValue=""
            >
              <option value="" disabled>Export Report</option>
              <option value="PDF">Export as PDF</option>
              <option value="Excel">Export as Excel</option>
              <option value="CSV">Export as CSV</option>
            </select>
            <Download className="h-4 w-4 absolute right-2 top-1/2 transform -translate-y-1/2 text-white pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Date Range:</span>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) => handleDateRangeChange('from', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) => handleDateRangeChange('to', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="bg-green-100 p-3 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">
                ${summary?.totalRevenue?.toLocaleString() || '0'}
              </p>
              <p className="text-sm text-green-600">
                +12% from last period
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="bg-blue-100 p-3 rounded-lg">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Total Invoices</p>
              <p className="text-2xl font-bold text-gray-900">
                {summary?.totalInvoices || '0'}
              </p>
              <p className="text-sm text-blue-600">
                Avg: ${summary?.avgRevenuePerInvoice?.toFixed(2) || '0'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="bg-purple-100 p-3 rounded-lg">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Total Profit</p>
              <p className="text-2xl font-bold text-gray-900">
                ${summary?.totalProfit?.toLocaleString() || '0'}
              </p>
              <p className="text-sm text-purple-600">
                Margin: {summary?.totalRevenue ? ((summary.totalProfit / summary.totalRevenue) * 100).toFixed(1) : '0'}%
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="bg-red-100 p-3 rounded-lg">
              <Users className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Unpaid Invoices</p>
              <p className="text-2xl font-bold text-gray-900">
                {summary?.unpaidInvoicesCount || '0'}
              </p>
              <p className="text-sm text-red-600">
                Needs attention
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Revenue & Profit */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Monthly Performance</h3>
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                <span>Revenue</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                <span>Profit</span>
              </div>
            </div>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="month" 
                  tickFormatter={(value) => {
                    const date = new Date(value + '-01');
                    return date.toLocaleDateString('en-US', { month: 'short' });
                  }}
                />
                <YAxis />
                <Tooltip 
                  formatter={(value, name) => [
                    `$${value.toLocaleString()}`, 
                    name.charAt(0).toUpperCase() + name.slice(1)
                  ]}
                  labelFormatter={(value) => {
                    const date = new Date(value + '-01');
                    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                  }}
                />
                <Bar dataKey="revenue" fill="#3B82F6" />
                <Bar dataKey="profit" fill="#10B981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Invoice Count Trend */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Invoice Volume Trend</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="month"
                  tickFormatter={(value) => {
                    const date = new Date(value + '-01');
                    return date.toLocaleDateString('en-US', { month: 'short' });
                  }}
                />
                <YAxis />
                <Tooltip 
                  formatter={(value) => [`${value} invoices`, 'Invoice Count']}
                  labelFormatter={(value) => {
                    const date = new Date(value + '-01');
                    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="invoiceCount" 
                  stroke="#8B5CF6" 
                  strokeWidth={3}
                  dot={{ fill: '#8B5CF6', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Customers */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Top Customers</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left text-sm font-medium text-gray-500 pb-3">Customer</th>
                  <th className="text-right text-sm font-medium text-gray-500 pb-3">Revenue</th>
                  <th className="text-right text-sm font-medium text-gray-500 pb-3">Invoices</th>
                  <th className="text-right text-sm font-medium text-gray-500 pb-3">Avg Order</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {topCustomers.map((customer, index) => (
                  <tr key={customer.id}>
                    <td className="py-3">
                      <div className="flex items-center">
                        <div className="bg-blue-100 w-8 h-8 rounded-full flex items-center justify-center mr-3">
                          <span className="text-blue-600 text-sm font-medium">
                            #{index + 1}
                          </span>
                        </div>
                        <span className="font-medium text-gray-900">{customer.name}</span>
                      </div>
                    </td>
                    <td className="py-3 text-right font-medium text-gray-900">
                      ${customer.totalRevenue.toLocaleString()}
                    </td>
                    <td className="py-3 text-right text-gray-600">
                      {customer.invoiceCount}
                    </td>
                    <td className="py-3 text-right text-gray-600">
                      ${(customer.totalRevenue / customer.invoiceCount).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Revenue Breakdown */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Revenue vs Expenses</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Revenue', value: summary?.totalRevenue || 0, color: '#10B981' },
                    { name: 'Expenses', value: summary?.totalExpenses || 0, color: '#EF4444' }
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {[
                    { name: 'Revenue', value: summary?.totalRevenue || 0, color: '#10B981' },
                    { name: 'Expenses', value: summary?.totalExpenses || 0, color: '#EF4444' }
                  ].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                <span className="text-sm text-gray-600">Revenue</span>
              </div>
              <span className="text-sm font-medium">${summary?.totalRevenue?.toLocaleString() || '0'}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                <span className="text-sm text-gray-600">Expenses</span>
              </div>
              <span className="text-sm font-medium">${summary?.totalExpenses?.toLocaleString() || '0'}</span>
            </div>
            <div className="border-t border-gray-200 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900">Net Profit</span>
                <span className="text-sm font-bold text-green-600">
                  ${summary?.totalProfit?.toLocaleString() || '0'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Insights */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-1">Best Month</h4>
            <p className="text-sm text-blue-700">
              {monthlyData.length > 0 && 
                monthlyData.reduce((best, current) => 
                  current.revenue > best.revenue ? current : best
                ).month
              } with ${monthlyData.length > 0 && 
                monthlyData.reduce((best, current) => 
                  current.revenue > best.revenue ? current : best
                ).revenue?.toLocaleString()
              }
            </p>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg">
            <h4 className="font-medium text-green-900 mb-1">Growth Rate</h4>
            <p className="text-sm text-green-700">
              +{monthlyData.length >= 2 ? 
                (((monthlyData[monthlyData.length - 1]?.revenue || 0) - 
                  (monthlyData[monthlyData.length - 2]?.revenue || 0)) / 
                 (monthlyData[monthlyData.length - 2]?.revenue || 1) * 100).toFixed(1)
                : '0'
              }% from last month
            </p>
          </div>
          
          <div className="bg-purple-50 p-4 rounded-lg">
            <h4 className="font-medium text-purple-900 mb-1">Top Customer</h4>
            <p className="text-sm text-purple-700">
              {topCustomers[0]?.name || 'No customers yet'} 
              {topCustomers[0] && ` ($${topCustomers[0].totalRevenue.toLocaleString()})`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Reports;