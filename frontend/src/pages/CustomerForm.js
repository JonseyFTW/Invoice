import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Save, ArrowLeft, User, Mail, Phone, MapPin } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

function CustomerForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors }
  } = useForm({
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      billingAddress: ''
    }
  });

  useEffect(() => {
    if (isEdit) {
      fetchCustomer();
    }
  }, [id]);

  const fetchCustomer = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/customers/${id}`);
      const customer = response.data.customer;
      
      setValue('name', customer.name);
      setValue('email', customer.email || '');
      setValue('phone', customer.phone || '');
      setValue('billingAddress', customer.billingAddress || '');
    } catch (error) {
      console.error('Error fetching customer:', error);
      toast.error('Failed to load customer data');
      navigate('/customers');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      
      if (isEdit) {
        await api.put(`/customers/${id}`, data);
        toast.success('Customer updated successfully');
      } else {
        await api.post('/customers', data);
        toast.success('Customer created successfully');
      }
      
      navigate('/customers');
    } catch (error) {
      console.error('Error saving customer:', error);
      if (error.response?.data?.errors) {
        error.response.data.errors.forEach((err) => {
          toast.error(err.msg);
        });
      } else {
        toast.error('Failed to save customer');
      }
    } finally {
      setLoading(false);
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
          onClick={() => navigate('/customers')}
          className="inline-flex items-center px-3 py-2 text-gray-600 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Customers
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? 'Edit Customer' : 'Add New Customer'}
          </h1>
          <p className="text-gray-600">
            {isEdit ? 'Update customer information' : 'Fill in the details to add a new customer'}
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-2xl">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Customer Information</h3>
            
            <div className="space-y-6">
              {/* Name */}
              <div>
                <label htmlFor="name" className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  <User className="h-4 w-4 mr-2" />
                  Customer Name *
                </label>
                <input
                  id="name"
                  type="text"
                  {...register('name', { 
                    required: 'Customer name is required',
                    maxLength: { value: 100, message: 'Name must be less than 100 characters' }
                  })}
                  className={`w-full px-3 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.name ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter customer name"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  <Mail className="h-4 w-4 mr-2" />
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  {...register('email', {
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: 'Please enter a valid email address'
                    }
                  })}
                  className={`w-full px-3 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.email ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="customer@example.com"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                )}
                <p className="mt-1 text-sm text-gray-500">
                  Email is used for sending invoices and notifications
                </p>
              </div>

              {/* Phone */}
              <div>
                <label htmlFor="phone" className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  <Phone className="h-4 w-4 mr-2" />
                  Phone Number
                </label>
                <input
                  id="phone"
                  type="tel"
                  {...register('phone', {
                    pattern: {
                      value: /^[\d\s\-\+\(\)\.]*$/,
                      message: 'Please enter a valid phone number'
                    }
                  })}
                  className={`w-full px-3 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.phone ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="(555) 123-4567"
                />
                {errors.phone && (
                  <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
                )}
              </div>

              {/* Billing Address */}
              <div>
                <label htmlFor="billingAddress" className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  <MapPin className="h-4 w-4 mr-2" />
                  Billing Address
                </label>
                <textarea
                  id="billingAddress"
                  rows={4}
                  {...register('billingAddress', {
                    maxLength: { value: 500, message: 'Address must be less than 500 characters' }
                  })}
                  className={`w-full px-3 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none ${
                    errors.billingAddress ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="123 Main Street&#10;City, State 12345&#10;Country"
                />
                {errors.billingAddress && (
                  <p className="mt-1 text-sm text-red-600">{errors.billingAddress.message}</p>
                )}
                <p className="mt-1 text-sm text-gray-500">
                  This address will appear on invoices and can be used for billing purposes
                </p>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Preview</h3>
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="flex items-start space-x-3">
                <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center">
                  <User className="h-6 w-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">
                    {register('name').value || 'Customer Name'}
                  </h4>
                  <div className="mt-2 space-y-1 text-sm text-gray-600">
                    {register('email').value && (
                      <div className="flex items-center">
                        <Mail className="h-3 w-3 mr-2" />
                        {register('email').value}
                      </div>
                    )}
                    {register('phone').value && (
                      <div className="flex items-center">
                        <Phone className="h-3 w-3 mr-2" />
                        {register('phone').value}
                      </div>
                    )}
                    {register('billingAddress').value && (
                      <div className="flex items-start">
                        <MapPin className="h-3 w-3 mr-2 mt-0.5 flex-shrink-0" />
                        <span className="whitespace-pre-line">{register('billingAddress').value}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate('/customers')}
              className="px-6 py-3 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {isEdit ? 'Update Customer' : 'Add Customer'}
            </button>
          </div>
        </form>
      </div>

      {/* Quick Tips */}
      <div className="max-w-2xl bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">💡 Quick Tips</h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li>• Customer name is required and will appear on all invoices</li>
          <li>• Email address is needed to send invoices automatically</li>
          <li>• Phone number helps with customer communication</li>
          <li>• Billing address appears on invoices and can be updated anytime</li>
          <li>• All fields except name are optional but recommended for complete records</li>
        </ul>
      </div>
    </div>
  );
}

export default CustomerForm;