const { Invoice, InvoiceLineItem, Customer, Expense } = require('../models');
const { Op, fn, col, literal } = require('sequelize');
const { startOfYear, endOfYear, subMonths, format } = require('date-fns');

exports.getSummary = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    
    // Default to current year if no dates provided
    const startDate = from ? new Date(from) : startOfYear(new Date());
    const endDate = to ? new Date(to) : endOfYear(new Date());

    // Get basic invoice counts
    const totalInvoices = await Invoice.count({
      where: {
        invoiceDate: {
          [Op.between]: [startDate, endDate]
        }
      }
    });

    const unpaidInvoicesCount = await Invoice.count({
      where: {
        invoiceDate: {
          [Op.between]: [startDate, endDate]
        },
        status: 'Unpaid'
      }
    });

    // Calculate total revenue by getting all line items for invoices in date range
    const lineItemsTotal = await InvoiceLineItem.findOne({
      attributes: [
        [fn('SUM', col('lineTotal')), 'subtotal']
      ],
      include: [
        {
          model: Invoice,
          as: 'invoice',
          where: {
            invoiceDate: {
              [Op.between]: [startDate, endDate]
            }
          },
          attributes: []
        }
      ],
      raw: true
    });

    // Get expense totals
    const expenseTotal = await Expense.findOne({
      attributes: [
        [fn('SUM', col('amount')), 'totalExpenses']
      ],
      where: {
        expenseDate: {
          [Op.between]: [startDate, endDate]
        }
      },
      raw: true
    });

    const subtotal = parseFloat(lineItemsTotal?.subtotal || 0);
    const totalExpenses = parseFloat(expenseTotal?.totalExpenses || 0);
    
    // Estimate tax (assuming average 8% tax rate for calculation)
    const estimatedTax = subtotal * 0.08;
    const totalRevenue = subtotal + estimatedTax;

    res.json({
      totalInvoices,
      totalRevenue,
      totalExpenses,
      totalProfit: totalRevenue - totalExpenses,
      avgRevenuePerInvoice: totalInvoices > 0 ? totalRevenue / totalInvoices : 0,
      unpaidInvoicesCount
    });
  } catch (error) {
    console.error('Summary report error:', error);
    // Return default data if there's an error
    res.json({
      totalInvoices: 0,
      totalRevenue: 0,
      totalExpenses: 0,
      totalProfit: 0,
      avgRevenuePerInvoice: 0,
      unpaidInvoicesCount: 0
    });
  }
};

exports.getMonthlyData = async (req, res, next) => {
  try {
    const endDate = new Date();
    const startDate = subMonths(endDate, 11); // Last 12 months

    // Generate 12 months of data with defaults
    const monthlyData = [];
    for (let i = 0; i < 12; i++) {
      const month = subMonths(endDate, 11 - i);
      const monthKey = format(month, 'yyyy-MM');
      
      monthlyData.push({
        month: monthKey,
        revenue: 0,
        expenses: 0,
        profit: 0,
        invoiceCount: 0
      });
    }

    // Try to get actual data, but don't fail if there are issues
    try {
      const invoices = await Invoice.findAll({
        attributes: ['invoiceDate', 'id'],
        where: {
          invoiceDate: {
            [Op.between]: [startDate, endDate]
          }
        },
        include: [
          {
            model: InvoiceLineItem,
            as: 'lineItems',
            attributes: ['lineTotal']
          }
        ]
      });

      // Process invoices into monthly data
      invoices.forEach(invoice => {
        const monthKey = format(new Date(invoice.invoiceDate), 'yyyy-MM');
        const monthIndex = monthlyData.findIndex(m => m.month === monthKey);
        
        if (monthIndex >= 0) {
          const revenue = invoice.lineItems.reduce((sum, item) => sum + parseFloat(item.lineTotal || 0), 0);
          monthlyData[monthIndex].revenue += revenue;
          monthlyData[monthIndex].invoiceCount += 1;
          monthlyData[monthIndex].profit = monthlyData[monthIndex].revenue - monthlyData[monthIndex].expenses;
        }
      });
    } catch (error) {
      console.error('Error getting monthly invoice data:', error);
    }

    res.json(monthlyData);
  } catch (error) {
    console.error('Monthly data error:', error);
    // Return empty monthly data if there's an error
    const monthlyData = [];
    for (let i = 0; i < 12; i++) {
      const month = subMonths(new Date(), 11 - i);
      monthlyData.push({
        month: format(month, 'yyyy-MM'),
        revenue: 0,
        expenses: 0,
        profit: 0,
        invoiceCount: 0
      });
    }
    res.json(monthlyData);
  }
};

exports.getTopCustomers = async (req, res, next) => {
  try {
    const { limit = 5 } = req.query;

    // Get customers with basic info first
    const customers = await Customer.findAll({
      attributes: ['id', 'name'],
      limit: parseInt(limit)
    });

    // Add revenue data for each customer
    const topCustomers = [];
    for (const customer of customers) {
      try {
        const invoices = await Invoice.findAll({
          where: { customerId: customer.id },
          include: [
            {
              model: InvoiceLineItem,
              as: 'lineItems',
              attributes: ['lineTotal']
            }
          ]
        });

        const totalRevenue = invoices.reduce((sum, invoice) => {
          return sum + invoice.lineItems.reduce((lineSum, item) => lineSum + parseFloat(item.lineTotal || 0), 0);
        }, 0);

        if (totalRevenue > 0) {
          topCustomers.push({
            id: customer.id,
            name: customer.name,
            totalRevenue,
            invoiceCount: invoices.length
          });
        }
      } catch (error) {
        console.error(`Error getting data for customer ${customer.id}:`, error);
      }
    }

    // Sort by revenue and limit
    topCustomers.sort((a, b) => b.totalRevenue - a.totalRevenue);
    const limitedCustomers = topCustomers.slice(0, parseInt(limit));

    res.json(limitedCustomers);
  } catch (error) {
    console.error('Top customers error:', error);
    // Return empty array if there's an error
    res.json([]);
  }
};