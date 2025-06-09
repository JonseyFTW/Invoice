import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { Save, ArrowLeft, Plus, Trash2, Calculator, Camera, Upload, Sparkles } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

function InvoiceForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [properties, setProperties] = useState([]);
  const [calculating, setCalculating] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const videoRef = useRef(null);

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
      propertyId: '',
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
  const watchedCustomerId = watch('customerId');

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

  // Fetch properties when customer changes
  useEffect(() => {
    if (watchedCustomerId) {
      fetchCustomerProperties(watchedCustomerId);
    } else {
      setProperties([]);
      setValue('propertyId', '');
    }
  }, [watchedCustomerId]);

  const fetchCustomers = async () => {
    try {
      const response = await api.get('/customers?limit=100');
      setCustomers(response.data.customers);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchCustomerProperties = async (customerId) => {
    try {
      const response = await api.get(`/customers/${customerId}/properties`);
      setProperties(response.data.properties);
    } catch (error) {
      console.error('Error fetching properties:', error);
      setProperties([]);
    }
  };

  const fetchInvoice = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/invoices/${id}`);
      const invoice = response.data.invoice;
      
      setValue('customerId', invoice.customerId);
      setValue('propertyId', invoice.propertyId || '');
      setValue('invoiceDate', invoice.invoiceDate);
      setValue('dueDate', invoice.dueDate);
      setValue('taxRate', parseFloat(invoice.taxRate));
      setValue('notes', invoice.notes || '');
      
      // Fetch properties for the selected customer
      if (invoice.customerId) {
        fetchCustomerProperties(invoice.customerId);
      }
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

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        setSelectedFile(file);
      } else {
        toast.error('Please select an image file');
      }
    }
  };

  const startCamera = async () => {
    try {
      // Check if camera is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast.error('Camera not available on this device');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      
      setCameraStream(stream);
      setShowCamera(true);
      
    } catch (error) {
      console.error('Error accessing camera:', error);
      if (error.name === 'NotAllowedError') {
        toast.error('Camera access denied. Please enable camera permissions.');
      } else if (error.name === 'NotFoundError') {
        toast.error('No camera found on this device.');
      } else {
        toast.error('Could not access camera. Please upload a file instead.');
      }
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !cameraStream) return;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);
    
    canvas.toBlob((blob) => {
      const file = new File([blob], `receipt-${Date.now()}.jpg`, { type: 'image/jpeg' });
      setSelectedFile(file);
      toast.success('Photo captured successfully!');
      closeCamera();
    }, 'image/jpeg', 0.9);
  };

  const closeCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setShowCamera(false);
  };

  // Effect to set video source when camera stream is available
  useEffect(() => {
    if (cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [cameraStream]);

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  const parseReceiptWithAI = async () => {
    if (!selectedFile) {
      toast.error('Please select a receipt image first');
      return;
    }

    try {
      setParsing(true);
      const formData = new FormData();
      formData.append('receipt', selectedFile);

      const response = await api.post('/expenses/parse-receipt', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success && response.data.lineItems) {
        // Clear existing line items and add parsed ones
        setValue('lineItems', []);
        
        response.data.lineItems.forEach((item, index) => {
          append({
            description: item.description || '',
            quantity: parseFloat(item.quantity) || 1,
            unitPrice: parseFloat(item.unitPrice) || 0,
            lineTotal: parseFloat(item.lineTotal) || 0
          });
        });

        toast.success('Receipt parsed successfully! Review the line items below.');
        setSelectedFile(null);
      } else {
        toast.error('Could not parse receipt. Please try again or add items manually.');
      }
    } catch (error) {
      console.error('Error parsing receipt:', error);
      toast.error('Failed to parse receipt. Please try again.');
    } finally {
      setParsing(false);
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
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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

            {/* Property */}
            <div>
              <label htmlFor="propertyId" className="block text-sm font-medium text-gray-700 mb-2">
                Property (Optional)
              </label>
              <select
                id="propertyId"
                {...register('propertyId')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={!watchedCustomerId || properties.length === 0}
              >
                <option value="">Select a property (optional)</option>
                {properties.map(property => (
                  <option key={property.id} value={property.id}>
                    {property.name} - {property.address}
                  </option>
                ))}
              </select>
              {!watchedCustomerId && (
                <p className="mt-1 text-sm text-gray-500">Select a customer first to view their properties</p>
              )}
              {watchedCustomerId && properties.length === 0 && (
                <p className="mt-1 text-sm text-gray-500">No properties found for this customer</p>
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
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={addLineItem}
                className="inline-flex items-center px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </button>
            </div>
          </div>

          {/* AI Receipt Parsing Section */}
          <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
            <div className="flex items-center mb-3">
              <Sparkles className="h-5 w-5 text-purple-600 mr-2" />
              <h4 className="text-sm font-semibold text-gray-900">AI Receipt Parser</h4>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Take a photo or upload a receipt image and our AI will automatically extract line items for your invoice.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex items-center space-x-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="receipt-upload"
                />
                <label
                  htmlFor="receipt-upload"
                  className="inline-flex items-center px-3 py-2 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 cursor-pointer"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Receipt
                </label>
                
                <button
                  type="button"
                  onClick={startCamera}
                  className="inline-flex items-center px-3 py-2 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Take Photo
                </button>
              </div>
              
              {selectedFile && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">
                    Selected: {selectedFile.name}
                  </span>
                  <button
                    type="button"
                    onClick={parseReceiptWithAI}
                    disabled={parsing}
                    className="inline-flex items-center px-3 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50"
                  >
                    {parsing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Parsing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Parse with AI
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
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

      {/* Camera Modal */}
      {showCamera && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Capture Receipt</h3>
            <video 
              ref={videoRef}
              autoPlay 
              playsInline 
              className="w-full rounded border mb-4"
              style={{ maxHeight: '300px' }}
            />
            <div className="flex space-x-3">
              <button
                onClick={capturePhoto}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Camera className="h-4 w-4 mr-2 inline" />
                Capture
              </button>
              <button
                onClick={closeCamera}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default InvoiceForm;