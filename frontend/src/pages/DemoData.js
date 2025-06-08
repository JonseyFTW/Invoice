import React, { useState } from 'react';
import { 
  Database, 
  Plus, 
  Trash2, 
  AlertTriangle,
  CheckCircle,
  Loader,
  BarChart3,
  Users,
  Building,
  FileText,
  DollarSign,
  Wrench
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

function DemoData() {
  const [loading, setLoading] = useState(false);
  const [generationData, setGenerationData] = useState(null);
  const [showConfirmClear, setShowConfirmClear] = useState(false);

  const generateDemoData = async () => {
    try {
      setLoading(true);
      const response = await api.post('/demo-data/generate');
      
      if (response.data.success) {
        setGenerationData(response.data.data);
        toast.success(response.data.message);
      } else {
        toast.error('Failed to generate demo data');
      }
    } catch (error) {
      console.error('Error generating demo data:', error);
      toast.error('Failed to generate demo data');
    } finally {
      setLoading(false);
    }
  };

  const clearDemoData = async () => {
    try {
      setLoading(true);
      const response = await api.delete('/demo-data/clear');
      
      if (response.data.success) {
        setGenerationData(null);
        setShowConfirmClear(false);
        toast.success(response.data.message);
      } else {
        toast.error('Failed to clear demo data');
      }
    } catch (error) {
      console.error('Error clearing demo data:', error);
      toast.error('Failed to clear demo data');
    } finally {
      setLoading(false);
    }
  };

  const DataCard = ({ icon: Icon, title, count, description, color }) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center mb-2">
            <div className={`bg-${color}-100 p-2 rounded-lg mr-3`}>
              <Icon className={`h-5 w-5 text-${color}-600`} />
            </div>
            <h3 className="text-sm font-medium text-gray-600">{title}</h3>
          </div>
          <p className="text-2xl font-bold text-gray-900">{count}</p>
          <p className="text-xs text-gray-500 mt-1">{description}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Demo Data Management</h1>
          <p className="text-gray-600">Generate or clear demo data for testing and demonstrations</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={generateDemoData}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? (
              <Loader className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            Generate Demo Data
          </button>
          <button
            onClick={() => setShowConfirmClear(true)}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear All Data
          </button>
        </div>
      </div>

      {/* Warning Banner */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start">
          <AlertTriangle className="h-5 w-5 text-yellow-600 mr-3 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-yellow-800">Demo Data Warning</h3>
            <p className="text-sm text-yellow-700 mt-1">
              This feature is intended for demo and testing purposes only. 
              <strong> Clearing data will permanently remove all customers, properties, invoices, and expenses</strong> (except user accounts).
              Make sure you have backups if needed.
            </p>
          </div>
        </div>
      </div>

      {/* Demo Data Preview */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">What Will Be Generated</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <div className="flex items-center p-4 bg-blue-50 rounded-lg">
            <Users className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <p className="font-medium text-blue-900">5 Customers</p>
              <p className="text-sm text-blue-700">Property management companies</p>
            </div>
          </div>
          <div className="flex items-center p-4 bg-green-50 rounded-lg">
            <Building className="h-8 w-8 text-green-600 mr-3" />
            <div>
              <p className="font-medium text-green-900">10 Properties</p>
              <p className="text-sm text-green-700">Various residential properties</p>
            </div>
          </div>
          <div className="flex items-center p-4 bg-purple-50 rounded-lg">
            <FileText className="h-8 w-8 text-purple-600 mr-3" />
            <div>
              <p className="font-medium text-purple-900">45 Invoices</p>
              <p className="text-sm text-purple-700">With realistic payment statuses</p>
            </div>
          </div>
          <div className="flex items-center p-4 bg-yellow-50 rounded-lg">
            <DollarSign className="h-8 w-8 text-yellow-600 mr-3" />
            <div>
              <p className="font-medium text-yellow-900">85 Expenses</p>
              <p className="text-sm text-yellow-700">Materials, fuel, subcontractors</p>
            </div>
          </div>
          <div className="flex items-center p-4 bg-indigo-50 rounded-lg">
            <Wrench className="h-8 w-8 text-indigo-600 mr-3" />
            <div>
              <p className="font-medium text-indigo-900">50+ Service Records</p>
              <p className="text-sm text-indigo-700">Maintenance history with ratings</p>
            </div>
          </div>
          <div className="flex items-center p-4 bg-gray-50 rounded-lg">
            <BarChart3 className="h-8 w-8 text-gray-600 mr-3" />
            <div>
              <p className="font-medium text-gray-900">Rich Analytics Data</p>
              <p className="text-sm text-gray-700">12 months of business data</p>
            </div>
          </div>
        </div>

        <div className="border-t pt-4">
          <h3 className="font-medium text-gray-900 mb-2">Data Features Include:</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Realistic customer and property information with GPS coordinates</li>
            <li>• Invoices with various payment statuses (paid, unpaid, overdue)</li>
            <li>• Service history with satisfaction ratings and follow-up schedules</li>
            <li>• Detailed notes for customers and properties</li>
            <li>• Expenses categorized by type with vendor information</li>
            <li>• 12 months of historical data for comprehensive reports</li>
            <li>• Recurring service templates and schedules</li>
          </ul>
        </div>
      </div>

      {/* Generated Data Summary */}
      {generationData && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center mb-4">
            <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">Demo Data Generated Successfully</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <DataCard
              icon={Users}
              title="Customers"
              count={generationData.customers}
              description="Property management companies"
              color="blue"
            />
            <DataCard
              icon={Building}
              title="Properties"
              count={generationData.properties}
              description="Residential properties with details"
              color="green"
            />
            <DataCard
              icon={FileText}
              title="Invoices"
              count={generationData.invoices}
              description="With line items and payments"
              color="purple"
            />
            <DataCard
              icon={DollarSign}
              title="Expenses"
              count={generationData.expenses}
              description="Materials and operational costs"
              color="yellow"
            />
            <DataCard
              icon={Wrench}
              title="Service Records"
              count={generationData.serviceRecords}
              description="Maintenance history entries"
              color="indigo"
            />
            <DataCard
              icon={Database}
              title="Total Records"
              count={Object.values(generationData).reduce((sum, val) => sum + val, 0)}
              description="All data points generated"
              color="gray"
            />
          </div>

          <div className="mt-6 p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-green-700">
              <strong>Ready to explore!</strong> You can now view the dashboard, reports, customers, and invoices 
              to see the system populated with realistic data. The reports will show 12 months of business trends 
              and analytics.
            </p>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmClear && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <div className="flex items-center mb-4">
              <AlertTriangle className="h-6 w-6 text-red-600 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900">Confirm Data Deletion</h3>
            </div>
            
            <p className="text-gray-600 mb-6">
              Are you sure you want to clear all demo data? This will permanently delete:
            </p>
            
            <ul className="text-sm text-gray-600 mb-6 space-y-1">
              <li>• All customers and their information</li>
              <li>• All properties and service history</li>
              <li>• All invoices and line items</li>
              <li>• All expenses and receipts</li>
              <li>• All notes and recurring templates</li>
            </ul>
            
            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => setShowConfirmClear(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={clearDemoData}
                disabled={loading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader className="h-4 w-4 mr-2 animate-spin inline" />
                    Clearing...
                  </>
                ) : (
                  'Yes, Clear All Data'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DemoData;