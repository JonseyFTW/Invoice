import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Dashboard from '../Dashboard';
import { AuthProvider } from '../../contexts/AuthContext';
import api from '../../services/api';

// Mock the API
jest.mock('../../services/api');

// Mock recharts to avoid canvas issues in tests
jest.mock('recharts', () => ({
  BarChart: ({ children }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  ResponsiveContainer: ({ children }) => <div data-testid="responsive-container">{children}</div>
}));

// Mock data
const mockSummary = {
  totalRevenue: 50000,
  totalInvoices: 25,
  unpaidInvoicesCount: 3,
  totalProfit: 35000
};

const mockMonthlyData = [
  { month: '2024-01', revenue: 10000 },
  { month: '2024-02', revenue: 15000 },
  { month: '2024-03', revenue: 12000 }
];

const mockRecentInvoices = [
  {
    id: '1',
    invoiceNumber: 'INV-2024-0001',
    customer: { name: 'John Doe' },
    grandTotal: 1500,
    status: 'Paid'
  },
  {
    id: '2',
    invoiceNumber: 'INV-2024-0002',
    customer: { name: 'Jane Smith' },
    grandTotal: 2000,
    status: 'Unpaid'
  }
];

const mockUser = {
  id: '1',
  username: 'testuser',
  email: 'test@example.com'
};

// Wrapper component for providers
const TestWrapper = ({ children }) => (
  <BrowserRouter>
    <AuthProvider value={{ user: mockUser, loading: false }}>
      {children}
    </AuthProvider>
  </BrowserRouter>
);

describe('Dashboard Component', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup API mocks
    api.get.mockImplementation((url) => {
      switch (url) {
        case '/reports/summary':
          return Promise.resolve({ data: mockSummary });
        case '/reports/monthly':
          return Promise.resolve({ data: mockMonthlyData });
        case '/invoices?limit=5':
          return Promise.resolve({ data: { invoices: mockRecentInvoices } });
        default:
          return Promise.reject(new Error('Unknown endpoint'));
      }
    });
  });

  it('renders dashboard with loading state initially', () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('displays summary statistics after loading', async () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('$50,000')).toBeInTheDocument();
      expect(screen.getByText('25')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('$35,000')).toBeInTheDocument();
    });

    expect(screen.getByText('Total Revenue')).toBeInTheDocument();
    expect(screen.getByText('Total Invoices')).toBeInTheDocument();
    expect(screen.getByText('Unpaid Invoices')).toBeInTheDocument();
    expect(screen.getByText('Total Profit')).toBeInTheDocument();
  });

  it('displays recent invoices', async () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('INV-2024-0001')).toBeInTheDocument();
      expect(screen.getByText('INV-2024-0002')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });
  });

  it('displays invoice statuses with correct styling', async () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      const paidBadge = screen.getByText('Paid');
      const unpaidBadge = screen.getByText('Unpaid');
      
      expect(paidBadge).toHaveClass('bg-green-100', 'text-green-800');
      expect(unpaidBadge).toHaveClass('bg-yellow-100', 'text-yellow-800');
    });
  });

  it('renders monthly revenue chart', async () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
      expect(screen.getByText('Monthly Revenue')).toBeInTheDocument();
    });
  });

  it('navigates to invoices page when "New Invoice" is clicked', async () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      const newInvoiceButton = screen.getByText('New Invoice');
      expect(newInvoiceButton).toBeInTheDocument();
      expect(newInvoiceButton.closest('a')).toHaveAttribute('href', '/invoices/new');
    });
  });

  it('navigates to all invoices when "View all" is clicked', async () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      const viewAllLink = screen.getByText('View all');
      expect(viewAllLink).toBeInTheDocument();
      expect(viewAllLink.closest('a')).toHaveAttribute('href', '/invoices');
    });
  });

  it('handles API errors gracefully', async () => {
    // Mock API error
    api.get.mockRejectedValue(new Error('API Error'));

    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      // Should not crash and should hide loading state
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });
  });

  it('displays empty state when no recent invoices', async () => {
    // Mock empty invoices response
    api.get.mockImplementation((url) => {
      switch (url) {
        case '/reports/summary':
          return Promise.resolve({ data: mockSummary });
        case '/reports/monthly':
          return Promise.resolve({ data: mockMonthlyData });
        case '/invoices?limit=5':
          return Promise.resolve({ data: { invoices: [] } });
        default:
          return Promise.reject(new Error('Unknown endpoint'));
      }
    });

    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('No invoices found')).toBeInTheDocument();
    });
  });

  it('formats currency values correctly', async () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      // Check that invoice amounts are formatted as currency
      expect(screen.getByText('$1,500.00')).toBeInTheDocument();
      expect(screen.getByText('$2,000.00')).toBeInTheDocument();
    });
  });

  it('displays correct welcome message', async () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText("Welcome back! Here's what's happening with your business.")).toBeInTheDocument();
    });
  });
});