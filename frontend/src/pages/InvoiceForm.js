import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { Save, ArrowLeft, Plus, Trash2, Calculator } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

function InvoiceForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [calculating, setCalculating] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors }
  } = useForm({
    defaultValues: {
      customerId: '',
      invoiceDate: new Date().toISOString().split('T')[0],
      dueDate: '',
      taxRate: 8.25,
      notes: '',
      lineItems: [
        {
          description: '',
          quantity: 1,
          unitPrice: 0,
          lineTotal: 0
        }
      ]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'lineItems'
  });

  const watchedLineItems = watch('lineItems');
  const watchedTaxRate = watch('taxRate');

  useEffect(() => {
    fetchCustomers();
    if (isEdit) {
      fetchInvoice();
    } else {
      // Set default due date to 30 days from today
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);
      setValue('dueDate', dueDate.toISOString().split('T')[0]);
    }
  }, [id]);

  // Calculate totals when line items or tax rate changes
  useEffect(() => {
    calculateTotals();
  }, [watchedLineItems, watchedTaxRate]);

  const fetchCustomers = async () => {
    try {
      const response = await api.get('/customers?limit=100');
      setCustomers(response.data.customers);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchInvoice = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/invoices/${id}`);
      const invoice = response.data.invoice;
      
      setValue('customerId', invoice.customerId);
      setValue('invoiceDate', invoice.invoiceDate);
      setValue('dueDate', invoice.dueDate);
      setValue('taxRate', parseFloat(invoice.taxRate));
      setValue('notes', invoice.notes || '');
      setValue('lineItems', invoice.lineItems.map(item => ({
        description: item.description,
        quantity: parseFloat(item.quantity),
        unitPrice: parseFloat(item.unitPrice),
        lineTotal: parseFloat(item.lineTotal)
      })));
    } catch (error) {
      console.error('Error fetching invoice:', error);
      toast.error('Failed to load invoice data');
      navigate('/invoices');
    } finally {
      setLoading(false);
    }
  };

  const calculateTotals = () => {
    if (!watchedLineItems) return;
    
    setCalculating(true);
    
    // Calculate line totals
    watchedLineItems.forEach((item, index) => {
      const quantity = parseFloat(item.quantity) || 0;
      const unitPrice = parseFloat(item.unitPrice) || 0;
      const lineTotal = quantity * unitPrice;
      setValue(`lineItems.${index}.lineTotal`, lineTotal);
    });
    
    setCalculating(false);
  };

  const getSubtotal = () => {
    return watchedLineItems?.reduce((sum, item) => {
      return sum + (parseFloat(item.lineTotal) || 0);
    }, 0) || 0;
  };

  const getTaxAmount = () => {
    const subtotal = getSubtotal();
    const taxRate = parseFloat(watchedTaxRate) || 0;
    return subtotal * (taxRate / 100);
  };

  const getGrandTotal = () => {
    return getSubtotal() + getTaxAmount();
  };

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      
      // Ensure line items have calculated totals
      const processedData = {
        ...data,
        lineItems: data.lineItems.map(item => ({
          ...item,
          quantity: parseFloat(item.quantity),
          unitPrice: parseFloat(item.unitPrice),
          lineTotal: parseFloat(item.quantity) * parseFloat(item.unitPrice)
        }))
      };
      
      if (isEdit) {
        await api.put(`/invoices/${id}`, processedData);
        toast.success('Invoice updated successfully');
      } else {
        await api.post('/invoices', processedData);
        toast.success('Invoice created successfully');
      }
      
      navigate('/invoices');
    } catch (error) {
      console.error('Error saving invoice:', error);
    } finally {
      setLoading(false);
    }
  };

  const addLineItem = () => {
    append({
      description: '',
      quantity: 1,
      unitPrice: 0,
      lineTotal: 0
    });
  };

  const removeLineItem = (index) => {
    if (fields.length > 1) {
      remove(index);
    }
  };

  if (loading && isEdit) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? 'Edit Invoice' : 'Create New Invoice'}
          </h1>
          <p className="text-gray-600">
            {isEdit ? 'Update invoice details' : 'Fill in the details to create a new invoice'}
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Invoice Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Customer */}
            <div>
              <label htmlFor="customerId" className="block text-sm font-medium text-gray-700 mb-2">
                Customer *
              </label>
              <select
                id="customerId"
                {...register('customerId', { required: 'Customer is required' })}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.customerId ? 'border-red-300' : 'border-gray-300'
                }`}
              >
                <option value="">Select a customer</option>
                {customers.map(customer => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
              {errors.customerId && (
                <p className="mt-1 text-sm text-red-600">{errors.customerId.message}</p>
              )}
            </div>

            {/* Tax Rate */}
            <div>
              <label htmlFor="taxRate" className="block text-sm font-medium text-gray-700 mb-2">
                Tax Rate (%)
              </label>
              <input
                id="taxRate"
                type="number"
                step="0.01"
                min="0"
                max="100"
                {...register('taxRate', { 
                  required: 'Tax rate is required',
                  min: { value: 0, message: 'Tax rate must be 0 or greater' },
                  max: { value: 100, message: 'Tax rate must be 100 or less' }
                })}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.taxRate ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.taxRate && (
                <p className="mt-1 text-sm text-red-600">{errors.taxRate.message}</p>
              )}
            </div>

            {/* Invoice Date */}
            <div>
              <label htmlFor="invoiceDate" className="block text-sm font-medium text-gray-700 mb-2">
                Invoice Date *
              </label>
              <input
                id="invoiceDate"
                type="date"
                {...register('invoiceDate', { required: 'Invoice date is required' })}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.invoiceDate ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.invoiceDate && (
                <p className="mt-1 text-sm text-red-600">{errors.invoiceDate.message}</p>
              )}
            </div>

            {/* Due Date */}
            <div>
              <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 mb-2">
                Due Date *
              </label>
              <input
                id="dueDate"
                type="date"
                {...register('dueDate', { required: 'Due date is required' })}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.dueDate ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.dueDate && (
                <p className="mt-1 text-sm text-red-600">{errors.dueDate.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Line Items */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Line Items</h3>
            <button
              type="button"
              onClick={addLineItem}
              className="inline-flex items-center px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </button>
          </div>

          <div className="space-y-4">
            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 border border-gray-200 rounded-lg">
                {/* Description */}
                <div className="md:col-span-5">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description *
                  </label>
                  <input
                    type="text"
                    {...register(`lineItems.${index}.description`, { 
                      required: 'Description is required' 
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Item description"
                  />
                </div>

                {/* Quantity */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    {...register(`lineItems.${index}.quantity`, { 
                      required: 'Quantity is required',
                      min: { value: 0, message: 'Quantity must be positive' }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Unit Price */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit Price *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    {...register(`lineItems.${index}.unitPrice`, { 
                      required: 'Unit price is required',
                      min: { value: 0, message: 'Unit price must be positive' }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Line Total */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Total
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    {...register(`lineItems.${index}.lineTotal`)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                    disabled
                  />
                </div>

                {/* Remove Button */}
                <div className="md:col-span-1 flex items-end">
                  <button
                    type="button"
                    onClick={() => removeLineItem(index)}
                    disabled={fields.length === 1}
                    className="w-full p-2 text-red-600 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="mt-6 border-t border-gray-200 pt-6">
            <div className="flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">${getSubtotal().toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tax ({watchedTaxRate}%):</span>
                  <span className="font-medium">${getTaxAmount().toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-2">
                  <span>Total:</span>
                  <span>${getGrandTotal().toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Notes</h3>
          <textarea
            {...register('notes')}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Additional notes for this invoice..."
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/invoices')}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || calculating}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {isEdit ? 'Update Invoice' : 'Create Invoice'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default InvoiceForm;