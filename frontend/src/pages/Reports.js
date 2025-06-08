import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  TrendingUp, 
  DollarSign, 
  Users, 
  FileText, 
  MapPin, 
  Calendar,
  Download,
  Filter,
  RefreshCw,
  FileDown,
  FileSpreadsheet,
  BarChart3,
  PieChart,
  LineChart,
  Clock,
  AlertCircle,
  CheckCircle,
  Zap,
  Target,
  Building,
  Globe,
  Star,
  TrendingDown,
  Briefcase
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { formatCurrency, formatDate } from '../utils/frontend_utilities';

function Reports() {
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState('overview');
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [data, setData] = useState({
    summary: null,
    monthly: [],
    revenueAnalytics: null,
    customerProfitability: [],
    invoiceAging: null,
    geographicDistribution: null,
    serviceMetrics: null,
    financialHealth: null
  });

  const reportOptions = [
    { id: 'overview', label: 'Business Overview', icon: BarChart3 },
    { id: 'revenue', label: 'Revenue Analytics', icon: TrendingUp },
    { id: 'customers', label: 'Customer Analysis', icon: Users },
    { id: 'aging', label: 'Invoice Aging', icon: Clock },
    { id: 'geographic', label: 'Geographic Distribution', icon: MapPin },
    { id: 'service', label: 'Service Performance', icon: Star },
    { id: 'financial', label: 'Financial Health', icon: Target }
  ];

  useEffect(() => {
    loadAllReports();
  }, []);

  const loadAllReports = async () => {
    try {
      setLoading(true);
      
      // Load reports individually with fallbacks
      const loadReport = async (endpoint, fallback = null) => {
        try {
          const response = await api.get(endpoint);
          return response.data;
        } catch (error) {
          console.error(`Failed to load ${endpoint}:`, error);
          return fallback;
        }
      };

      const [
        summary,
        monthly,
        revenueAnalytics,
        customerProfitability,
        invoiceAging,
        geographicDistribution,
        serviceMetrics,
        financialHealth
      ] = await Promise.all([
        loadReport('/reports/summary', { totalInvoices: 0, totalRevenue: 0, totalExpenses: 0, totalProfit: 0, avgRevenuePerInvoice: 0, unpaidInvoicesCount: 0 }),
        loadReport('/reports/monthly', []),
        loadReport('/reports/revenue-analytics?period=12months', { data: [], summary: { totalRevenue: 0, avgRevenue: 0, totalInvoices: 0 } }),
        loadReport('/reports/customer-profitability?limit=10', []),
        loadReport('/reports/invoice-aging', { summary: { totalUnpaidAmount: 0, totalUnpaidCount: 0, averageAge: 0 }, agingBuckets: {} }),
        loadReport('/reports/geographic-distribution', { byLocation: [], byPropertyType: [], propertiesWithCoordinates: [] }),
        loadReport('/reports/service-metrics?timeframe=6months', { summary: { totalServices: 0, avgCustomerSatisfaction: 0, avgTimeSpent: 0, followUpRate: 0 }, serviceTypeBreakdown: {} }),
        loadReport('/reports/financial-health', { cashFlow: { recentRevenue: 0, recentExpenses: 0, netCashFlow: 0 }, receivables: { totalOutstanding: 0, averagePaymentTime: 15, collectionRate: 85 }, growth: { revenueGrowthRate: 0, monthlyRecurringRevenue: 0 }, healthScore: 75 })
      ]);

      setData({
        summary,
        monthly,
        revenueAnalytics,
        customerProfitability,
        invoiceAging,
        geographicDistribution,
        serviceMetrics,
        financialHealth
      });

      // Show success only if we got some data
      if (summary || monthly.length > 0) {
        toast.success('Reports loaded successfully');
      } else {
        toast.error('No data available for reports');
      }
    } catch (error) {
      console.error('Error loading reports:', error);
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const refreshReports = async () => {
    setRefreshing(true);
    await loadAllReports();
    setRefreshing(false);
    toast.success('Reports refreshed successfully');
  };

  const exportReport = async (format) => {
    try {
      setExporting(true);
      
      let exportType = selectedReport;
      let params = {};
      
      // Map report types to export types
      switch (selectedReport) {
        case 'overview':
          exportType = 'overview';
          break;
        case 'revenue':
          exportType = 'revenue';
          params.period = '12months';
          break;
        case 'customers':
          exportType = 'customers';
          params.limit = 10;
          break;
        case 'aging':
          exportType = 'aging';
          break;
        case 'financial':
          exportType = 'financial';
          break;
        default:
          toast.error('Export not available for this report type');
          return;
      }

      const queryParams = new URLSearchParams({
        type: exportType,
        ...params
      });

      const endpoint = format === 'csv' ? 'csv' : 'pdf';
      const response = await api.get(`/reports/export/${endpoint}?${queryParams}`, {
        responseType: 'blob'
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      const fileExtension = format === 'csv' ? 'csv' : 'pdf';
      const fileName = `${exportType}_report_${new Date().toISOString().split('T')[0]}.${fileExtension}`;
      link.setAttribute('download', fileName);
      
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success(`${format.toUpperCase()} report downloaded successfully`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error(`Failed to export ${format.toUpperCase()} report`);
    } finally {
      setExporting(false);
    }
  };

  const StatCard = ({ title, value, icon: Icon, color, subtitle, trend }) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`bg-${color}-100 p-3 rounded-lg`}>
          <Icon className={`h-6 w-6 text-${color}-600`} />
        </div>
      </div>
      {trend && (
        <div className="mt-4 flex items-center">
          {trend > 0 ? (
            <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
          ) : (
            <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
          )}
          <span className={`text-sm ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {Math.abs(trend).toFixed(1)}% vs last period
          </span>
        </div>
      )}
    </div>
  );

  const OverviewReport = () => {
    if (!data.summary || !data.monthly) return null;

    const currentMonth = data.monthly[data.monthly.length - 1] || {};
    const previousMonth = data.monthly[data.monthly.length - 2] || {};
    
    const revenueTrend = previousMonth.revenue > 0 
      ? ((currentMonth.revenue - previousMonth.revenue) / previousMonth.revenue) * 100 
      : 0;

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Revenue"
            value={formatCurrency(data.summary.totalRevenue)}
            icon={DollarSign}
            color="green"
            subtitle="Current period"
            trend={revenueTrend}
          />
          <StatCard
            title="Total Invoices"
            value={data.summary.totalInvoices}
            icon={FileText}
            color="blue"
            subtitle="All time"
          />
          <StatCard
            title="Unpaid Invoices"
            value={data.summary.unpaidInvoicesCount}
            icon={AlertCircle}
            color="red"
            subtitle="Requires attention"
          />
          <StatCard
            title="Net Profit"
            value={formatCurrency(data.summary.totalProfit)}
            icon={TrendingUp}
            color="purple"
            subtitle="Revenue - Expenses"
          />
        </div>

        {/* Monthly Revenue Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Revenue Trend</h3>
          <div className="h-64 flex items-end space-x-2">
            {data.monthly.map((month, index) => {
              const maxRevenue = Math.max(...data.monthly.map(m => m.revenue));
              const height = maxRevenue > 0 ? (month.revenue / maxRevenue) * 100 : 0;
              
              return (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div 
                    className="w-full bg-blue-500 rounded-t hover:bg-blue-600 transition-colors relative group"
                    style={{ height: `${Math.max(height, 2)}%` }}
                  >
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      {formatCurrency(month.revenue)}
                    </div>
                  </div>
                  <span className="text-xs text-gray-500 mt-2 transform rotate-45 origin-left">
                    {month.month}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Insights */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Insights</h3>
          <div className="space-y-3">
            {data.summary.avgRevenuePerInvoice > 0 && (
              <div className="flex items-center">
                <Briefcase className="h-5 w-5 text-blue-500 mr-3" />
                <span className="text-gray-700">
                  Average invoice value: <strong>{formatCurrency(data.summary.avgRevenuePerInvoice)}</strong>
                </span>
              </div>
            )}
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
              <span className="text-gray-700">
                Payment rate: <strong>{data.summary.totalInvoices > 0 
                  ? (((data.summary.totalInvoices - data.summary.unpaidInvoicesCount) / data.summary.totalInvoices) * 100).toFixed(1)
                  : 0}%</strong>
              </span>
            </div>
            {data.financialHealth?.healthScore && (
              <div className="flex items-center">
                <Target className="h-5 w-5 text-purple-500 mr-3" />
                <span className="text-gray-700">
                  Financial health score: <strong>{data.financialHealth.healthScore.toFixed(1)}/100</strong>
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const RevenueAnalyticsReport = () => {
    if (!data.revenueAnalytics) return null;

    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Analytics Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-gray-600">Total Revenue</p>
              <p className="text-xl font-bold text-green-600">
                {formatCurrency(data.revenueAnalytics.summary.totalRevenue)}
              </p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-600">Average Revenue</p>
              <p className="text-xl font-bold text-blue-600">
                {formatCurrency(data.revenueAnalytics.summary.avgRevenue)}
              </p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <p className="text-sm text-gray-600">Total Invoices</p>
              <p className="text-xl font-bold text-purple-600">
                {data.revenueAnalytics.summary.totalInvoices}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Breakdown by Status</h3>
          <div className="h-64 flex items-end space-x-2">
            {data.revenueAnalytics.data.map((period, index) => {
              const maxTotal = Math.max(...data.revenueAnalytics.data.map(p => p.totalRevenue));
              const totalHeight = maxTotal > 0 ? (period.totalRevenue / maxTotal) * 100 : 0;
              const paidHeight = maxTotal > 0 ? (period.paidRevenue / maxTotal) * 100 : 0;
              const unpaidHeight = maxTotal > 0 ? (period.unpaidRevenue / maxTotal) * 100 : 0;
              
              return (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div className="w-full flex flex-col" style={{ height: '200px' }}>
                    {period.paidRevenue > 0 && (
                      <div 
                        className="w-full bg-green-500 hover:bg-green-600 transition-colors"
                        style={{ height: `${paidHeight}%` }}
                        title={`Paid: ${formatCurrency(period.paidRevenue)}`}
                      />
                    )}
                    {period.unpaidRevenue > 0 && (
                      <div 
                        className="w-full bg-yellow-500 hover:bg-yellow-600 transition-colors"
                        style={{ height: `${unpaidHeight}%` }}
                        title={`Unpaid: ${formatCurrency(period.unpaidRevenue)}`}
                      />
                    )}
                    {period.overdueRevenue > 0 && (
                      <div 
                        className="w-full bg-red-500 hover:bg-red-600 transition-colors"
                        style={{ height: `${(period.overdueRevenue / maxTotal) * 100}%` }}
                        title={`Overdue: ${formatCurrency(period.overdueRevenue)}`}
                      />
                    )}
                  </div>
                  <span className="text-xs text-gray-500 mt-2 transform rotate-45 origin-left">
                    {period.period}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-center mt-4 space-x-4">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded mr-2"></div>
              <span className="text-sm text-gray-600">Paid</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-yellow-500 rounded mr-2"></div>
              <span className="text-sm text-gray-600">Unpaid</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-red-500 rounded mr-2"></div>
              <span className="text-sm text-gray-600">Overdue</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const CustomerAnalysisReport = () => {
    if (!data.customerProfitability) return null;

    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Customers by Profitability</h3>
          <div className="space-y-4">
            {data.customerProfitability.slice(0, 10).map((customer, index) => (
              <div key={customer.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                    <span className="text-sm font-medium text-blue-600">#{index + 1}</span>
                  </div>
                  <div>
                    <Link 
                      to={`/customers/${customer.id}`}
                      className="font-medium text-gray-900 hover:text-blue-600 hover:underline block"
                    >
                      {customer.name}
                    </Link>
                    <p className="text-sm text-gray-500">
                      {customer.invoiceCount} invoices • {customer.propertiesCount} properties
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">{formatCurrency(customer.totalRevenue)}</p>
                  <p className="text-sm text-gray-500">
                    {formatCurrency(customer.monthlyRevenue)}/month
                  </p>
                  <div className="flex items-center mt-1">
                    <div className="w-12 bg-gray-200 rounded-full h-2 mr-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full" 
                        style={{ width: `${customer.paymentRate}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-gray-500">{customer.paymentRate.toFixed(0)}% paid</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const InvoiceAgingReport = () => {
    if (!data.invoiceAging) return null;

    const { agingBuckets, summary } = data.invoiceAging;

    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Aging Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <p className="text-sm text-gray-600">Total Unpaid</p>
              <p className="text-xl font-bold text-red-600">
                {formatCurrency(summary.totalUnpaidAmount)}
              </p>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <p className="text-sm text-gray-600">Unpaid Count</p>
              <p className="text-xl font-bold text-yellow-600">
                {summary.totalUnpaidCount}
              </p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-600">Average Age</p>
              <p className="text-xl font-bold text-blue-600">
                {summary.averageAge.toFixed(0)} days
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Object.entries(agingBuckets).map(([bucket, data]) => {
            const titles = {
              current: 'Current (Not Due)',
              overdue1to30: '1-30 Days Overdue',
              overdue31to60: '31-60 Days Overdue',
              overdue61to90: '61-90 Days Overdue',
              overdue90plus: '90+ Days Overdue'
            };

            const colors = {
              current: 'green',
              overdue1to30: 'yellow',
              overdue31to60: 'orange',
              overdue61to90: 'red',
              overdue90plus: 'purple'
            };

            return (
              <div key={bucket} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-3">{titles[bucket]}</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Amount:</span>
                    <span className={`font-medium text-${colors[bucket]}-600`}>
                      {formatCurrency(data.amount)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Count:</span>
                    <span className="font-medium">{data.count}</span>
                  </div>
                  {data.count > 0 && (
                    <div className="pt-2 border-t">
                      <p className="text-xs text-gray-500 mb-2">Recent invoices:</p>
                      {data.invoices.slice(0, 3).map(invoice => (
                        <div key={invoice.id} className="text-xs text-gray-600 py-1">
                          <Link 
                            to={`/invoices/${invoice.id}`}
                            className="text-blue-600 hover:underline"
                          >
                            {invoice.invoiceNumber}
                          </Link>
                          {' - '}
                          <Link 
                            to={`/customers/${invoice.customerId}`}
                            className="text-blue-600 hover:underline"
                          >
                            {invoice.customerName}
                          </Link>
                          {' - '}{formatCurrency(invoice.amount)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const GeographicReport = () => {
    if (!data.geographicDistribution) return null;

    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue by Location</h3>
          <div className="space-y-3">
            {data.geographicDistribution.byLocation.slice(0, 10).map((location, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 text-gray-400 mr-2" />
                  <span className="text-gray-900">{location.city}, {location.state}</span>
                </div>
                <div className="text-right">
                  <span className="font-medium">{formatCurrency(location.totalRevenue)}</span>
                  <span className="text-sm text-gray-500 ml-2">({location.propertyCount} properties)</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Property Type Distribution</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.geographicDistribution.byPropertyType.map(type => (
              <div key={type.propertyType} className="text-center p-4 bg-gray-50 rounded-lg">
                <Building className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="font-medium text-gray-900 capitalize">{type.propertyType}</p>
                <p className="text-sm text-gray-600">{type.count} properties</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const ServicePerformanceReport = () => {
    if (!data.serviceMetrics) return null;

    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Service Performance Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-600">Total Services</p>
              <p className="text-xl font-bold text-blue-600">
                {data.serviceMetrics.summary.totalServices}
              </p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-gray-600">Avg Satisfaction</p>
              <p className="text-xl font-bold text-green-600">
                {data.serviceMetrics.summary.avgCustomerSatisfaction.toFixed(1)}/5
              </p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <p className="text-sm text-gray-600">Avg Time</p>
              <p className="text-xl font-bold text-purple-600">
                {data.serviceMetrics.summary.avgTimeSpent.toFixed(1)}h
              </p>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <p className="text-sm text-gray-600">Follow-up Rate</p>
              <p className="text-xl font-bold text-yellow-600">
                {data.serviceMetrics.summary.followUpRate.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Service Type Breakdown</h3>
          <div className="space-y-4">
            {Object.entries(data.serviceMetrics.serviceTypeBreakdown).map(([type, metrics]) => (
              <div key={type} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900 capitalize">{type.replace('_', ' ')}</h4>
                  <span className="text-sm text-gray-500">{metrics.count} services</span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Avg Cost:</span>
                    <span className="ml-2 font-medium">{formatCurrency(metrics.avgCost)}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Satisfaction:</span>
                    <span className="ml-2 font-medium">{metrics.avgSatisfaction.toFixed(1)}/5</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Total Revenue:</span>
                    <span className="ml-2 font-medium">{formatCurrency(metrics.totalCost)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const FinancialHealthReport = () => {
    if (!data.financialHealth) return null;

    const getHealthColor = (score) => {
      if (score >= 80) return 'green';
      if (score >= 60) return 'yellow';
      return 'red';
    };

    const healthColor = getHealthColor(data.financialHealth.healthScore);

    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Financial Health Score</h3>
          <div className="text-center">
            <div className={`inline-flex items-center justify-center w-24 h-24 bg-${healthColor}-100 rounded-full mb-4`}>
              <span className={`text-2xl font-bold text-${healthColor}-600`}>
                {data.financialHealth.healthScore.toFixed(0)}
              </span>
            </div>
            <p className="text-gray-600">Overall Financial Health</p>
            <p className={`text-sm text-${healthColor}-600 font-medium`}>
              {data.financialHealth.healthScore >= 80 ? 'Excellent' : 
               data.financialHealth.healthScore >= 60 ? 'Good' : 'Needs Attention'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h4 className="font-semibold text-gray-900 mb-4">Cash Flow (30 days)</h4>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Revenue:</span>
                <span className="font-medium text-green-600">
                  {formatCurrency(data.financialHealth.cashFlow.recentRevenue)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Expenses:</span>
                <span className="font-medium text-red-600">
                  {formatCurrency(data.financialHealth.cashFlow.recentExpenses)}
                </span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="font-medium">Net Cash Flow:</span>
                <span className={`font-bold ${data.financialHealth.cashFlow.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(data.financialHealth.cashFlow.netCashFlow)}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h4 className="font-semibold text-gray-900 mb-4">Receivables</h4>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Outstanding:</span>
                <span className="font-medium text-yellow-600">
                  {formatCurrency(data.financialHealth.receivables.totalOutstanding)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Avg Payment Time:</span>
                <span className="font-medium">
                  {data.financialHealth.receivables.averagePaymentTime} days
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Collection Rate:</span>
                <span className="font-medium text-green-600">
                  {data.financialHealth.receivables.collectionRate.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h4 className="font-semibold text-gray-900 mb-4">Growth</h4>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Revenue Growth:</span>
                <span className={`font-medium ${data.financialHealth.growth.revenueGrowthRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {data.financialHealth.growth.revenueGrowthRate.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Monthly Recurring:</span>
                <span className="font-medium">
                  {formatCurrency(data.financialHealth.growth.monthlyRecurringRevenue)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderReport = () => {
    switch (selectedReport) {
      case 'overview':
        return <OverviewReport />;
      case 'revenue':
        return <RevenueAnalyticsReport />;
      case 'customers':
        return <CustomerAnalysisReport />;
      case 'aging':
        return <InvoiceAgingReport />;
      case 'geographic':
        return <GeographicReport />;
      case 'service':
        return <ServicePerformanceReport />;
      case 'financial':
        return <FinancialHealthReport />;
      default:
        return <OverviewReport />;
    }
  };

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
          <h1 className="text-2xl font-bold text-gray-900">Business Reports</h1>
          <p className="text-gray-600">Comprehensive analytics and insights</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={refreshReports}
            disabled={refreshing}
            className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          
          {/* Export Dropdown */}
          <div className="relative group">
            <button 
              disabled={exporting}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {exporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </>
              )}
            </button>
            
            {!exporting && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                <div className="py-2">
                  <button
                    onClick={() => exportReport('csv')}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <FileSpreadsheet className="h-4 w-4 mr-3 text-green-600" />
                    Export as CSV
                  </button>
                  <button
                    onClick={() => exportReport('pdf')}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <FileDown className="h-4 w-4 mr-3 text-red-600" />
                    Export as PDF
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Report Navigation */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex flex-wrap gap-2">
            {reportOptions.map(option => {
              const Icon = option.icon;
              return (
                <button
                  key={option.id}
                  onClick={() => setSelectedReport(option.id)}
                  className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedReport === option.id
                      ? 'bg-blue-100 text-blue-700 border border-blue-200'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Report Content */}
      <div className="transition-all duration-300">
        {renderReport()}
      </div>
    </div>
  );
}

export default Reports;