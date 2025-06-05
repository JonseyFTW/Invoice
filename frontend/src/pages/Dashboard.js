import React from 'react';

function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Welcome to your Invoice Management System!</p>
      </div>
      
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Getting Started</h2>
        <p className="text-gray-600 mb-4">
          Your invoice management system is now running! The dashboard will show business analytics 
          once you start creating customers and invoices.
        </p>
        <div className="space-y-2">
          <p className="text-sm text-gray-500">• Create your first customer</p>
          <p className="text-sm text-gray-500">• Generate invoices</p>
          <p className="text-sm text-gray-500">• Track expenses with receipt scanning</p>
          <p className="text-sm text-gray-500">• View reports and analytics</p>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;