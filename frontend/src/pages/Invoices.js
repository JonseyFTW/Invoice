import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { 
  Search, 
  Plus, 
  Filter, 
  Download, 
  Mail, 
  Eye,
  Edit2,
  Trash2,
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Home,
  MapPin
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { formatCurrency, formatDate, openAddressInMaps } from '../utils/frontend_utilities';
import PhotoThumbnail from '../components/shared/PhotoThumbnail';

function Invoices() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);
  const [sending, setSending] = useState(null);
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    status: searchParams.get('status') || '',
    customerId: searchParams.get('customerId') || ''
  });
  const [pagination, setPagination] = useState({
    currentPage: parseInt(searchParams.get('page')) || 1,
    totalPages: 1,
    totalCount: 0,
    limit: 10
  });
  const [sorting, setSorting] = useState({
    field: searchParams.get('sortBy') || 'invoiceDate',
    direction: searchParams.get('sortDir') || 'desc'
  });

  useEffect(() => {
    fetchInvoices();
  }, [pagination.currentPage, filters, sorting]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.currentPage.toString(),
        limit: pagination.limit.toString(),
        sortBy: sorting.field,
        sortDir: sorting.direction,
        ...(filters.search && { search: filters.search }),
        ...(filters.status && { status: filters.status }),
        ...(filters.customerId && { customerId: filters.customerId })
      });

      const response = await api.get(`/invoices?${params}`);
      setInvoices(response.data.invoices);
      setPagination(prev => ({
        ...prev,
        totalPages: response.data.totalPages,
        totalCount: response.data.totalCount
      }));

      // Update URL params
      const newSearchParams = new URLSearchParams(searchParams);
      if (filters.search) newSearchParams.set('search', filters.search);
      else newSearchParams.delete('search');
      if (filters.status) newSearchParams.set('status', filters.status);
      else newSearchParams.delete('status');
      if (filters.customerId) newSearchParams.set('customerId', filters.customerId);
      else newSearchParams.delete('customerId');
      newSearchParams.set('page', pagination.currentPage.toString());
      newSearchParams.set('sortBy', sorting.field);
      newSearchParams.set('sortDir', sorting.direction);
      setSearchParams(newSearchParams);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast.error('Failed to fetch invoices');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (invoiceId, invoiceNumber) => {
    if (!window.confirm(`Are you sure you want to delete invoice ${invoiceNumber}? This action cannot be undone.`)) {
      return;
    }

    try {
      setDeleting(invoiceId);
      await api.delete(`/invoices/${invoiceId}`);
      toast.success('Invoice deleted successfully');
      fetchInvoices();
    } catch (error) {
      console.error('Error deleting invoice:', error);
      toast.error('Failed to delete invoice');
    } finally {
      setDeleting(null);
    }
  };

  const handleMarkAsPaid = async (invoiceId, invoiceNumber) => {
    try {
      await api.patch(`/invoices/${invoiceId}/mark-paid`);
      toast.success(`Invoice ${invoiceNumber} marked as paid`);
      fetchInvoices();
    } catch (error) {
      console.error('Error marking invoice as paid:', error);
      toast.error('Failed to mark invoice as paid');
    }
  };

  const handleSendEmail = async (invoiceId, invoiceNumber) => {
    try {
      setSending(invoiceId);
      await api.post(`/invoices/${invoiceId}/send-email`);
      toast.success(`Invoice ${invoiceNumber} sent successfully`);
      fetchInvoices();
    } catch (error) {
      console.error('Error sending invoice:', error);
      if (error.response?.status === 400) {
        toast.error('Customer email address is required to send invoice');
      } else {
        toast.error('Failed to send invoice');
      }
    } finally {
      setSending(null);
    }
  };

  const handleDownloadPDF = async (invoiceId, invoiceNumber) => {
    try {
      const response = await api.get(`/invoices/${invoiceId}/pdf`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice-${invoiceNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('PDF downloaded successfully');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Failed to download PDF');
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, currentPage: newPage }));
  };

  const handleSort = (field) => {
    setSorting(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
    // Reset to first page when sorting changes
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  const getSortIcon = (field) => {
    if (sorting.field !== field) {
      return <span className="text-gray-400">↕</span>;
    }
    return sorting.direction === 'asc' ? 
      <span className="text-blue-600">↑</span> : 
      <span className="text-blue-600">↓</span>;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Paid':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Overdue':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'Draft':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Paid':
        return <CheckCircle className="h-4 w-4" />;
      case 'Overdue':
        return <AlertCircle className="h-4 w-4" />;
      case 'Draft':
        return <FileText className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const InvoiceCard = ({ invoice }) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center space-x-3 mb-2">
            <h3 className="text-lg font-semibold text-gray-900">{invoice.invoiceNumber}</h3>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(invoice.status)}`}>
              {getStatusIcon(invoice.status)}
              <span className="ml-1">{invoice.status}</span>
            </span>
          </div>
          <Link 
            to={`/customers/${invoice.customer?.id}`}
            className="text-sm text-gray-600 hover:text-blue-600 hover:underline mb-1 block"
          >
            {invoice.customer?.name}
          </Link>
          {invoice.property && (
            <div className="flex items-center text-sm text-gray-500 mb-1">
              <Home className="h-3 w-3 mr-1" />
              <Link
                to={`/properties/${invoice.property.id}`}
                className="hover:text-blue-600 hover:underline transition-colors truncate"
                title="View Property Details"
              >
                {invoice.property.name}
              </Link>
            </div>
          )}
          <p className="text-sm text-gray-500">
            Due: {formatDate(invoice.dueDate)}
          </p>
          
          {/* Invoice Photos */}
          {invoice.photos && invoice.photos.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {invoice.photos.slice(0, 3).map((photo, index) => (
                <PhotoThumbnail
                  key={index}
                  src={photo.url}
                  alt={`Invoice attachment ${index + 1}`}
                  className="w-8 h-8"
                />
              ))}
              {invoice.photos.length > 3 && (
                <div className="w-8 h-8 bg-gray-200 rounded border flex items-center justify-center text-xs text-gray-600">
                  +{invoice.photos.length - 3}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-gray-900">
            {formatCurrency(invoice.grandTotal)}
          </p>
          <p className="text-sm text-gray-500">
            {formatDate(invoice.invoiceDate)}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <div className="flex items-center space-x-2">
          <Link
            to={`/invoices/${invoice.id}`}
            className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700"
          >
            <Eye className="h-3 w-3 mr-1" />
            View
          </Link>
          {invoice.status === 'Unpaid' && (
            <button
              onClick={() => handleMarkAsPaid(invoice.id, invoice.invoiceNumber)}
              className="inline-flex items-center px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700"
            >
              <CheckCircle className="h-3 w-3 mr-1" />
              Mark Paid
            </button>
          )}
        </div>
        
        <div className="flex items-center space-x-1">
          <button
            onClick={() => handleSendEmail(invoice.id, invoice.invoiceNumber)}
            disabled={sending === invoice.id || !invoice.customer?.email}
            className="p-2 text-gray-400 hover:text-purple-600 disabled:opacity-50"
            title={!invoice.customer?.email ? 'Customer email required' : 'Send email'}
          >
            {sending === invoice.id ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
            ) : (
              <Mail className="h-4 w-4" />
            )}
          </button>
          <button
            onClick={() => handleDownloadPDF(invoice.id, invoice.invoiceNumber)}
            className="p-2 text-gray-400 hover:text-green-600"
            title="Download PDF"
          >
            <Download className="h-4 w-4" />
          </button>
          <Link
            to={`/invoices/${invoice.id}/edit`}
            className="p-2 text-gray-400 hover:text-blue-600"
            title="Edit invoice"
          >
            <Edit2 className="h-4 w-4" />
          </Link>
          <button
            onClick={() => handleDelete(invoice.id, invoice.invoiceNumber)}
            disabled={deleting === invoice.id}
            className="p-2 text-gray-400 hover:text-red-600 disabled:opacity-50"
            title="Delete invoice"
          >
            {deleting === invoice.id ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );

  const TableView = () => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button 
                  onClick={() => handleSort('invoiceNumber')}
                  className="flex items-center space-x-1 hover:text-gray-700 transition-colors"
                >
                  <span>Invoice</span>
                  {getSortIcon('invoiceNumber')}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button 
                  onClick={() => handleSort('customer.name')}
                  className="flex items-center space-x-1 hover:text-gray-700 transition-colors"
                >
                  <span>Customer</span>
                  {getSortIcon('customer.name')}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button 
                  onClick={() => handleSort('property.name')}
                  className="flex items-center space-x-1 hover:text-gray-700 transition-colors"
                >
                  <span>Property</span>
                  {getSortIcon('property.name')}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button 
                  onClick={() => handleSort('grandTotal')}
                  className="flex items-center space-x-1 hover:text-gray-700 transition-colors"
                >
                  <span>Amount</span>
                  {getSortIcon('grandTotal')}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button 
                  onClick={() => handleSort('status')}
                  className="flex items-center space-x-1 hover:text-gray-700 transition-colors"
                >
                  <span>Status</span>
                  {getSortIcon('status')}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button 
                  onClick={() => handleSort('dueDate')}
                  className="flex items-center space-x-1 hover:text-gray-700 transition-colors"
                >
                  <span>Due Date</span>
                  {getSortIcon('dueDate')}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Photos
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {invoices.map((invoice) => (
              <tr key={invoice.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <Link 
                      to={`/invoices/${invoice.id}`}
                      className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
                    >
                      {invoice.invoiceNumber}
                    </Link>
                    <div className="text-sm text-gray-500">{formatDate(invoice.invoiceDate)}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Link 
                    to={`/customers/${invoice.customer?.id}`}
                    className="text-sm font-medium text-gray-900 hover:text-blue-600 hover:underline block"
                  >
                    {invoice.customer?.name}
                  </Link>
                  <div className="text-sm text-gray-500">{invoice.customer?.email}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {invoice.property ? (
                    <div>
                      <div className="flex items-center text-sm font-medium text-gray-900">
                        <Home className="h-3 w-3 mr-1" />
                        <Link
                          to={`/properties/${invoice.property.id}`}
                          className="hover:text-blue-600 hover:underline"
                        >
                          {invoice.property.name}
                        </Link>
                      </div>
                      <button
                        onClick={() => openAddressInMaps(invoice.property.address)}
                        className="text-xs text-gray-500 hover:text-blue-600 hover:underline transition-colors truncate block max-w-32"
                        title="Open in Maps"
                      >
                        {invoice.property.address}
                      </button>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-400">No property</div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {formatCurrency(invoice.grandTotal)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(invoice.status)}`}>
                    {getStatusIcon(invoice.status)}
                    <span className="ml-1">{invoice.status}</span>
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatDate(invoice.dueDate)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {/* Invoice Photos */}
                  {invoice.photos && invoice.photos.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {invoice.photos.slice(0, 2).map((photo, index) => (
                        <PhotoThumbnail
                          key={index}
                          src={photo.url || photo.filePath}
                          alt={`Invoice attachment ${index + 1}`}
                          className="w-6 h-6"
                        />
                      ))}
                      {invoice.photos.length > 2 && (
                        <div className="w-6 h-6 bg-gray-200 rounded border flex items-center justify-center text-xs text-gray-600">
                          +{invoice.photos.length - 2}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-gray-400 text-xs">None</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end space-x-1">
                    <Link
                      to={`/invoices/${invoice.id}`}
                      className="text-blue-600 hover:text-blue-900 p-1"
                      title="View details"
                    >
                      <Eye className="h-4 w-4" />
                    </Link>
                    <button
                      onClick={() => handleSendEmail(invoice.id, invoice.invoiceNumber)}
                      disabled={sending === invoice.id || !invoice.customer?.email}
                      className="text-purple-600 hover:text-purple-900 p-1 disabled:opacity-50"
                      title={!invoice.customer?.email ? 'Customer email required' : 'Send email'}
                    >
                      {sending === invoice.id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                      ) : (
                        <Mail className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={() => handleDownloadPDF(invoice.id, invoice.invoiceNumber)}
                      className="text-green-600 hover:text-green-900 p-1"
                      title="Download PDF"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                    <Link
                      to={`/invoices/${invoice.id}/edit`}
                      className="text-gray-600 hover:text-gray-900 p-1"
                      title="Edit invoice"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Link>
                    {invoice.status === 'Unpaid' && (
                      <button
                        onClick={() => handleMarkAsPaid(invoice.id, invoice.invoiceNumber)}
                        className="text-green-600 hover:text-green-900 p-1"
                        title="Mark as paid"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(invoice.id, invoice.invoiceNumber)}
                      disabled={deleting === invoice.id}
                      className="text-red-600 hover:text-red-900 p-1 disabled:opacity-50"
                      title="Delete invoice"
                    >
                      {deleting === invoice.id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const Pagination = () => (
    <div className="flex items-center justify-between">
      <div className="text-sm text-gray-700">
        Showing {Math.min((pagination.currentPage - 1) * pagination.limit + 1, pagination.totalCount)} to{' '}
        {Math.min(pagination.currentPage * pagination.limit, pagination.totalCount)} of {pagination.totalCount} invoices
      </div>
      <div className="flex items-center space-x-2">
        <button
          onClick={() => handlePageChange(pagination.currentPage - 1)}
          disabled={pagination.currentPage === 1}
          className="px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="px-3 py-2 text-sm text-gray-700">
          Page {pagination.currentPage} of {pagination.totalPages}
        </span>
        <button
          onClick={() => handlePageChange(pagination.currentPage + 1)}
          disabled={pagination.currentPage === pagination.totalPages}
          className="px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
          <p className="text-gray-600">Manage and track your invoices</p>
        </div>
        <Link
          to="/invoices/new"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Invoice
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search invoices..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <select
          value={filters.status}
          onChange={(e) => handleFilterChange('status', e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">All Statuses</option>
          <option value="Draft">Draft</option>
          <option value="Unpaid">Unpaid</option>
          <option value="Paid">Paid</option>
          <option value="Overdue">Overdue</option>
        </select>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: pagination.totalCount, color: 'blue' },
          { 
            label: 'Unpaid', 
            value: invoices.filter(i => i.status === 'Unpaid').length, 
            color: 'yellow' 
          },
          { 
            label: 'Overdue', 
            value: invoices.filter(i => i.status === 'Overdue').length, 
            color: 'red' 
          },
          { 
            label: 'Paid', 
            value: invoices.filter(i => i.status === 'Paid').length, 
            color: 'green' 
          }
        ].map((stat) => (
          <div key={stat.label} className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <div className={`bg-${stat.color}-100 p-2 rounded-lg mr-3`}>
                <FileText className={`h-5 w-5 text-${stat.color}-600`} />
              </div>
              <div>
                <p className="text-sm text-gray-600">{stat.label}</p>
                <p className="text-xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : invoices.length === 0 ? (
        <div className="text-center py-12">
          <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {filters.search || filters.status ? 'No invoices found' : 'No invoices yet'}
          </h3>
          <p className="text-gray-500 mb-6">
            {filters.search || filters.status 
              ? 'Try adjusting your search or filters' 
              : 'Get started by creating your first invoice'
            }
          </p>
          {!filters.search && !filters.status && (
            <Link
              to="/invoices/new"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Invoice
            </Link>
          )}
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden lg:block">
            <TableView />
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden grid gap-4">
            {invoices.map((invoice) => (
              <InvoiceCard key={invoice.id} invoice={invoice} />
            ))}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <Pagination />
          )}
        </>
      )}
    </div>
  );
}

export default Invoices;