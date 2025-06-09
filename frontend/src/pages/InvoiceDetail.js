import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Edit, 
  Download, 
  Mail, 
  CheckCircle, 
  Calendar,
  DollarSign,
  User,
  FileText,
  Phone,
  MapPin,
  Home
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { openAddressInMaps } from '../utils/frontend_utilities';
import PhotoThumbnail from '../components/shared/PhotoThumbnail';

function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    fetchInvoice();
  }, [id]);

  const fetchInvoice = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/invoices/${id}`);
      setInvoice(response.data.invoice);
    } catch (error) {
      console.error('Error fetching invoice:', error);
      toast.error('Failed to load invoice');
      navigate('/invoices');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsPaid = async () => {
    try {
      setActionLoading('markPaid');
      await api.patch(`/invoices/${id}/mark-paid`);
      toast.success('Invoice marked as paid');
      fetchInvoice(); // Refresh the invoice data
    } catch (error) {
      console.error('Error marking invoice as paid:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      setActionLoading('download');
      const response = await api.get(`/invoices/${id}/pdf`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice-${invoice.invoiceNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('PDF downloaded successfully');
    } catch (error) {
      console.error('Error downloading PDF:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSendEmail = async () => {
    try {
      setActionLoading('email');
      await api.post(`/invoices/${id}/send-email`);
      toast.success('Invoice sent successfully');
      fetchInvoice(); // Refresh to update sent date
    } catch (error) {
      console.error('Error sending email:', error);
    } finally {
      setActionLoading(null);
    }
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
        return <Calendar className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Invoice not found</p>
        <button
          onClick={() => navigate('/invoices')}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Back to Invoices
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate('/invoices')}
          className="inline-flex items-center px-3 py-2 text-gray-600 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Invoices
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">
            Invoice {invoice.invoiceNumber}
          </h1>
          <p className="text-gray-600">
            Created on {new Date(invoice.invoiceDate).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Link
            to={`/invoices/${invoice.id}/edit`}
            className="inline-flex items-center px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Link>
          <button
            onClick={handleDownloadPDF}
            disabled={actionLoading === 'download'}
            className="inline-flex items-center px-4 py-2 text-green-600 border border-green-300 rounded-lg hover:bg-green-50 disabled:opacity-50"
          >
            {actionLoading === 'download' ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600 mr-2"></div>
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Download PDF
          </button>
          {invoice.customer.email && (
            <button
              onClick={handleSendEmail}
              disabled={actionLoading === 'email'}
              className="inline-flex items-center px-4 py-2 text-purple-600 border border-purple-300 rounded-lg hover:bg-purple-50 disabled:opacity-50"
            >
              {actionLoading === 'email' ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600 mr-2"></div>
              ) : (
                <Mail className="h-4 w-4 mr-2" />
              )}
              Send Email
            </button>
          )}
          {invoice.status === 'Unpaid' && (
            <button
              onClick={handleMarkAsPaid}
              disabled={actionLoading === 'markPaid'}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {actionLoading === 'markPaid' ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Mark as Paid
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Invoice Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Invoice Header */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Invoice Details</h2>
                <p className="text-gray-600">Invoice #{invoice.invoiceNumber}</p>
              </div>
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(invoice.status)}`}>
                {getStatusIcon(invoice.status)}
                <span className="ml-2">{invoice.status}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Bill To:</h3>
                <div className="space-y-1">
                  <p className="font-medium">{invoice.customer.name}</p>
                  {invoice.customer.billingAddress && (
                    <p className="text-gray-600 whitespace-pre-line">
                      {invoice.customer.billingAddress}
                    </p>
                  )}
                  {invoice.customer.phone && (
                    <div className="flex items-center text-gray-600">
                      <Phone className="h-4 w-4 mr-2" />
                      {invoice.customer.phone}
                    </div>
                  )}
                  {invoice.customer.email && (
                    <div className="flex items-center text-gray-600">
                      <Mail className="h-4 w-4 mr-2" />
                      {invoice.customer.email}
                    </div>
                  )}
                </div>
              </div>

              {/* Property Information */}
              {invoice.property && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Service Location:</h3>
                  <div className="space-y-1">
                    <div className="flex items-center text-gray-900">
                      <Home className="h-4 w-4 mr-2" />
                      <span className="font-medium">{invoice.property.name}</span>
                    </div>
                    <div className="flex items-start text-gray-600">
                      <MapPin className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                      <button
                        onClick={() => openAddressInMaps([
                          invoice.property.address,
                          invoice.property.city && invoice.property.state ? `${invoice.property.city}, ${invoice.property.state}` : null
                        ].filter(Boolean).join('\n'))}
                        className="text-left hover:text-blue-600 hover:underline transition-colors"
                        title="Open in Maps"
                      >
                        {invoice.property.address}
                        {invoice.property.city && invoice.property.state && (
                          <span className="block">{invoice.property.city}, {invoice.property.state}</span>
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 capitalize">
                      {invoice.property.propertyType} Property
                    </p>
                    {invoice.property.accessNotes && (
                      <div className="mt-2 p-2 bg-yellow-50 rounded border-l-4 border-yellow-400">
                        <p className="text-xs text-yellow-800 font-medium">Access Notes:</p>
                        <p className="text-xs text-yellow-700">{invoice.property.accessNotes}</p>
                      </div>
                    )}
                    {invoice.property.gateCode && (
                      <div className="mt-1">
                        <p className="text-xs text-gray-600">
                          <span className="font-medium">Gate Code:</span> {invoice.property.gateCode}
                        </p>
                      </div>
                    )}
                    {invoice.property.keyLocation && (
                      <div className="mt-1">
                        <p className="text-xs text-gray-600">
                          <span className="font-medium">Key Location:</span> {invoice.property.keyLocation}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Invoice Information:</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Invoice Date:</span>
                    <span>{new Date(invoice.invoiceDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Due Date:</span>
                    <span>{new Date(invoice.dueDate).toLocaleDateString()}</span>
                  </div>
                  {invoice.paymentDate && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Payment Date:</span>
                      <span>{new Date(invoice.paymentDate).toLocaleDateString()}</span>
                    </div>
                  )}
                  {invoice.sentDate && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Last Sent:</span>
                      <span>{new Date(invoice.sentDate).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Line Items</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Qty
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Unit Price
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {invoice.lineItems.map((item, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {item.description}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 text-right">
                        {parseFloat(item.quantity).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 text-right">
                        ${parseFloat(item.unitPrice).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 text-right font-medium">
                        ${parseFloat(item.lineTotal).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-medium">${invoice.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Tax ({parseFloat(invoice.taxRate).toFixed(1)}%):</span>
                    <span className="font-medium">${invoice.taxAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t border-gray-300 pt-2">
                    <span>Total:</span>
                    <span>${invoice.grandTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Notes</h3>
              <p className="text-gray-600 whitespace-pre-line">{invoice.notes}</p>
            </div>
          )}

          {/* Attached Photos */}
          {invoice.photos && invoice.photos.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Attached Photos</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {invoice.photos.map((photo, index) => (
                  <PhotoThumbnail
                    key={index}
                    src={photo.url}
                    alt={`Invoice attachment ${index + 1}`}
                    className="w-full aspect-square"
                  />
                ))}
              </div>
              {invoice.photos.length > 6 && (
                <p className="text-sm text-gray-500 mt-3">
                  Showing {Math.min(6, invoice.photos.length)} of {invoice.photos.length} photos
                </p>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
            <div className="space-y-4">
              <div className="flex items-center">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <DollarSign className="h-5 w-5 text-blue-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-gray-600">Total Amount</p>
                  <p className="text-lg font-semibold">${invoice.grandTotal.toFixed(2)}</p>
                </div>
              </div>
              
              <div className="flex items-center">
                <div className="bg-green-100 p-2 rounded-lg">
                  <Calendar className="h-5 w-5 text-green-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-gray-600">Days Until Due</p>
                  <p className="text-lg font-semibold">
                    {Math.ceil((new Date(invoice.dueDate) - new Date()) / (1000 * 60 * 60 * 24))} days
                  </p>
                </div>
              </div>

              <div className="flex items-center">
                <div className="bg-purple-100 p-2 rounded-lg">
                  <User className="h-5 w-5 text-purple-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-gray-600">Customer</p>
                  <p className="text-lg font-semibold">{invoice.customer.name}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Activity Timeline</h3>
            <div className="space-y-3">
              <div className="flex items-start">
                <div className="bg-blue-100 p-1 rounded-full">
                  <FileText className="h-3 w-3 text-blue-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium">Invoice Created</p>
                  <p className="text-xs text-gray-500">
                    {new Date(invoice.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              
              {invoice.sentDate && (
                <div className="flex items-start">
                  <div className="bg-purple-100 p-1 rounded-full">
                    <Mail className="h-3 w-3 text-purple-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium">Invoice Sent</p>
                    <p className="text-xs text-gray-500">
                      {new Date(invoice.sentDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              )}

              {invoice.paymentDate && (
                <div className="flex items-start">
                  <div className="bg-green-100 p-1 rounded-full">
                    <CheckCircle className="h-3 w-3 text-green-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium">Payment Received</p>
                    <p className="text-xs text-gray-500">
                      {new Date(invoice.paymentDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Related Actions */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Related Actions</h3>
            <div className="space-y-2">
              <Link
                to={`/customers/${invoice.customer.id}/edit`}
                className="block w-full text-left px-3 py-2 text-sm text-gray-600 rounded-lg hover:bg-gray-50"
              >
                View Customer Details
              </Link>
              <Link
                to="/expenses?invoiceId=${invoice.id}"
                className="block w-full text-left px-3 py-2 text-sm text-gray-600 rounded-lg hover:bg-gray-50"
              >
                View Related Expenses
              </Link>
              <button
                onClick={() => window.print()}
                className="block w-full text-left px-3 py-2 text-sm text-gray-600 rounded-lg hover:bg-gray-50"
              >
                Print Invoice
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default InvoiceDetail;