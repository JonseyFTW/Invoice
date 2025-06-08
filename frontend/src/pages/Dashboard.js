import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
  Plus,
  ArrowRight,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';
import api from '../services/api';
import { formatCurrency, formatDate } from '../utils/frontend_utilities';
import logo from '../assets/logo.png';

function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    summary: null,
    monthlyData: [],
    recentInvoices: [],
    topCustomers: [],
    overdueInvoices: []
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [summaryRes, monthlyRes, invoicesRes, customersRes] = await Promise.all([
        api.get('/reports/summary'),
        api.get('/reports/monthly'),
        api.get('/invoices?limit=5&status='),
        api.get('/reports/top-customers?limit=5')
      ]);

      // Get overdue invoices
      const overdueRes = await api.get('/invoices?status=Overdue&limit=5');

      setDashboardData({
        summary: summaryRes.data,
        monthlyData: monthlyRes.data,
        recentInvoices: invoicesRes.data.invoices || [],
        topCustomers: customersRes.data || [],
        overdueInvoices: overdueRes.data.invoices || []
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Paid':
        return 'bg-green-100 text-green-800';
      case 'Overdue':
        return 'bg-red-100 text-red-800';
      case 'Draft':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Paid':
        return <CheckCircle className="h-4 w-4" />;
      case 'Overdue':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="loading-spinner">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const { summary, monthlyData, recentInvoices, topCustomers, overdueInvoices } = dashboardData;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <img
            className="h-12 w-auto mr-4"
            src={logo}
            alt="Company Logo"
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600">Welcome back! Here's what's happening with your business.</p>
          </div>
        </div>
        <Link
          to="/invoices/new"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Invoice
        </Link>
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
                {formatCurrency(summary?.totalRevenue || 0)}
              </p>
              <p className="text-sm text-green-600">
                +12% from last month
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
                {summary?.totalInvoices || 0}
              </p>
              <p className="text-sm text-blue-600">
                Avg: {formatCurrency(summary?.avgRevenuePerInvoice || 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="bg-yellow-100 p-3 rounded-lg">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Unpaid Invoices</p>
              <p className="text-2xl font-bold text-gray-900">
                {summary?.unpaidInvoicesCount || 0}
              </p>
              <p className="text-sm text-yellow-600">
                Needs attention
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
                {formatCurrency(summary?.totalProfit || 0)}
              </p>
              <p className="text-sm text-purple-600">
                Margin: {summary?.totalRevenue ? ((summary.totalProfit / summary.totalRevenue) * 100).toFixed(1) : '0'}%
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Revenue Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Monthly Revenue</h3>
            <Link to="/reports" className="text-blue-600 hover:text-blue-700 text-sm">
              View Details
            </Link>
          </div>
          <div className="h-64">
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
                  formatter={(value) => [formatCurrency(value), 'Revenue']}
                  labelFormatter={(value) => {
                    const date = new Date(value + '-01');
                    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                  }}
                />
                <Bar dataKey="revenue" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Invoice Trends */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Invoice Volume</h3>
            <Link to="/reports" className="text-blue-600 hover:text-blue-700 text-sm">
              View Details
            </Link>
          </div>
          <div className="h-64">
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
                  formatter={(value) => [`${value} invoices`, 'Count']}
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
        {/* Recent Invoices */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Recent Invoices</h3>
            <Link 
              to="/invoices" 
              className="inline-flex items-center text-blue-600 hover:text-blue-700 text-sm"
            >
              View all
              <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </div>
          {recentInvoices.length > 0 ? (
            <div className="space-y-3">
              {recentInvoices.map((invoice) => (
                <div key={invoice.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div>
                      <p className="font-medium text-gray-900">{invoice.invoiceNumber}</p>
                      <p className="text-sm text-gray-600">{invoice.customer?.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="font-medium text-gray-900">
                      {formatCurrency(invoice.grandTotal)}
                    </span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
                      {getStatusIcon(invoice.status)}
                      <span className="ml-1">{invoice.status}</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No invoices found</p>
              <Link 
                to="/invoices/new"
                className="inline-flex items-center mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Invoice
              </Link>
            </div>
          )}
        </div>

        {/* Quick Actions & Overdue */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <Link
                to="/invoices/new"
                className="block w-full text-left px-4 py-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <div className="flex items-center">
                  <Plus className="h-4 w-4 mr-3" />
                  Create Invoice
                </div>
              </Link>
              <Link
                to="/customers/new"
                className="block w-full text-left px-4 py-3 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
              >
                <div className="flex items-center">
                  <Users className="h-4 w-4 mr-3" />
                  Add Customer
                </div>
              </Link>
              <Link
                to="/expenses"
                className="block w-full text-left px-4 py-3 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors"
              >
                <div className="flex items-center">
                  <DollarSign className="h-4 w-4 mr-3" />
                  Track Expense
                </div>
              </Link>
              <Link
                to="/reports"
                className="block w-full text-left px-4 py-3 bg-yellow-50 text-yellow-700 rounded-lg hover:bg-yellow-100 transition-colors"
              >
                <div className="flex items-center">
                  <TrendingUp className="h-4 w-4 mr-3" />
                  View Reports
                </div>
              </Link>
            </div>
          </div>

          {/* Overdue Invoices Alert */}
          {overdueInvoices.length > 0 && (
            <div className="bg-red-50 border border-red-200 p-6 rounded-xl">
              <div className="flex items-center mb-4">
                <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                <h3 className="text-lg font-semibold text-red-900">Overdue Invoices</h3>
              </div>
              <p className="text-red-700 mb-4">
                You have {overdueInvoices.length} overdue invoice{overdueInvoices.length > 1 ? 's' : ''} requiring attention.
              </p>
              <div className="space-y-2">
                {overdueInvoices.slice(0, 3).map((invoice) => (
                  <div key={invoice.id} className="flex justify-between items-center text-sm">
                    <span className="text-red-800">{invoice.invoiceNumber}</span>
                    <span className="font-medium text-red-900">
                      {formatCurrency(invoice.grandTotal)}
                    </span>
                  </div>
                ))}
              </div>
              <Link
                to="/invoices?status=Overdue"
                className="inline-flex items-center mt-4 text-red-600 hover:text-red-700 text-sm font-medium"
              >
                View All Overdue
                <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </div>
          )}

          {/* Top Customers */}
          {topCustomers.length > 0 && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Customers</h3>
              <div className="space-y-3">
                {topCustomers.map((customer, index) => (
                  <div key={customer.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="bg-blue-100 w-8 h-8 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 text-sm font-medium">#{index + 1}</span>
                      </div>
                      <span className="font-medium text-gray-900">{customer.name}</span>
                    </div>
                    <span className="text-sm font-medium text-gray-600">
                      {formatCurrency(customer.totalRevenue)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;