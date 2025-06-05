const { Invoice, InvoiceLineItem, Customer, Expense } = require('../models');
const { Op, fn, col, literal } = require('sequelize');
const { startOfYear, endOfYear, subMonths, format } = require('date-fns');

exports.getSummary = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    
    // Default to current year if no dates provided
    const startDate = from ? new Date(from) : startOfYear(new Date());
    const endDate = to ? new Date(to) : endOfYear(new Date());

    // Get invoice totals
    const invoiceStats = await Invoice.findOne({
      attributes: [
        [fn('COUNT', col('Invoice.id')), 'totalInvoices'],
        [fn('COUNT', literal(`CASE WHEN status = 'Unpaid' THEN 1 END`)), 'unpaidInvoicesCount']
      ],
      where: {
        invoiceDate: {
          [Op.between]: [startDate, endDate]
        }
      },
      include: [
        {
          model: InvoiceLineItem,
          as: 'lineItems',
          attributes: []
        }
      ],
      raw: true
    });

    // Calculate revenue
    const revenueData = await Invoice.findAll({
      attributes: [
        [fn('SUM', literal('("lineItems"."lineTotal" * (1 + "Invoice"."taxRate" / 100))')), 'totalRevenue']
      ],
      where: {
        invoiceDate: {
          [Op.between]: [startDate, endDate]
        }
      },
      include: [
        {
          model: InvoiceLineItem,
          as: 'lineItems',
          attributes: []
        }
      ],
      raw: true
    });

    // Get expense totals
    const expenseStats = await Expense.findOne({
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

    const totalRevenue = parseFloat(revenueData[0]?.totalRevenue || 0);
    const totalExpenses = parseFloat(expenseStats?.totalExpenses || 0);
    const totalInvoices = parseInt(invoiceStats?.totalInvoices || 0);

    res.json({
      totalInvoices,
      totalRevenue,
      totalExpenses,
      totalProfit: totalRevenue - totalExpenses,
      avgRevenuePerInvoice: totalInvoices > 0 ? totalRevenue / totalInvoices : 0,
      unpaidInvoicesCount: parseInt(invoiceStats?.unpaidInvoicesCount || 0)
    });
  } catch (error) {
    next(error);
  }
};

exports.getMonthlyData = async (req, res, next) => {
  try {
    const endDate = new Date();
    const startDate = subMonths(endDate, 11); // Last 12 months

    const monthlyRevenue = await Invoice.findAll({
      attributes: [
        [fn('DATE_TRUNC', 'month', col('invoiceDate')), 'month'],
        [fn('SUM', literal('("lineItems"."lineTotal" * (1 + "Invoice"."taxRate" / 100))')), 'revenue'],
        [fn('COUNT', col('Invoice.id')), 'invoiceCount']
      ],
      where: {
        invoiceDate: {
          [Op.between]: [startDate, endDate]
        }
      },
      include: [
        {
          model: InvoiceLineItem,
          as: 'lineItems',
          attributes: []
        }
      ],
      group: [fn('DATE_TRUNC', 'month', col('invoiceDate'))],
      order: [[fn('DATE_TRUNC', 'month', col('invoiceDate')), 'ASC']],
      raw: true
    });

    const monthlyExpenses = await Expense.findAll({
      attributes: [
        [fn('DATE_TRUNC', 'month', col('expenseDate')), 'month'],
        [fn('SUM', col('amount')), 'expenses']
      ],
      where: {
        expenseDate: {
          [Op.between]: [startDate, endDate]
        }
      },
      group: [fn('DATE_TRUNC', 'month', col('expenseDate'))],
      order: [[fn('DATE_TRUNC', 'month', col('expenseDate')), 'ASC']],
      raw: true
    });

    // Combine revenue and expense data
    const monthlyData = [];
    for (let i = 0; i < 12; i++) {
      const month = subMonths(endDate, 11 - i);
      const monthKey = format(month, 'yyyy-MM');
      
      const revenueEntry = monthlyRevenue.find(entry => 
        format(new Date(entry.month), 'yyyy-MM') === monthKey
      );
      
      const expenseEntry = monthlyExpenses.find(entry => 
        format(new Date(entry.month), 'yyyy-MM') === monthKey
      );

      const revenue = parseFloat(revenueEntry?.revenue || 0);
      const expenses = parseFloat(expenseEntry?.expenses || 0);

      monthlyData.push({
        month: monthKey,
        revenue,
        expenses,
        profit: revenue - expenses,
        invoiceCount: parseInt(revenueEntry?.invoiceCount || 0)
      });
    }

    res.json(monthlyData);
  } catch (error) {
    next(error);
  }
};

exports.getTopCustomers = async (req, res, next) => {
  try {
    const { limit = 5 } = req.query;
    const startDate = subMonths(new Date(), 12); // Last 12 months

    const topCustomers = await Customer.findAll({
      attributes: [
        'id', 
        'name',
        [fn('SUM', literal('("invoices->lineItems"."lineTotal" * (1 + "invoices"."taxRate" / 100))')), 'totalRevenue'],
        [fn('COUNT', col('invoices.id')), 'invoiceCount']
      ],
      include: [
        {
          model: Invoice,
          as: 'invoices',
          where: {
            invoiceDate: {
              [Op.gte]: startDate
            }
          },
          include: [
            {
              model: InvoiceLineItem,
              as: 'lineItems',
              attributes: []
            }
          ],
          attributes: []
        }
      ],
      group: ['Customer.id'],
      having: literal('COUNT("invoices"."id") > 0'),
      order: [[literal('totalRevenue'), 'DESC']],
      limit: parseInt(limit),
      subQuery: false,
      raw: true
    });

    const formattedCustomers = topCustomers.map(customer => ({
      ...customer,
      totalRevenue: parseFloat(customer.totalRevenue || 0),
      invoiceCount: parseInt(customer.invoiceCount || 0)
    }));

    res.json(formattedCustomers);
  } catch (error) {
    next(error);
  }
};