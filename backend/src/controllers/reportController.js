const { Invoice, InvoiceLineItem, Customer, Expense, Property, PropertyServiceHistory } = require('../models');
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

// Enhanced Revenue Analytics
exports.getRevenueAnalytics = async (req, res, next) => {
  try {
    const { period = '12months' } = req.query;
    
    let startDate, endDate, groupBy;
    const now = new Date();
    
    switch (period) {
      case '7days':
        startDate = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
        endDate = now;
        groupBy = 'day';
        break;
      case '30days':
        startDate = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
        endDate = now;
        groupBy = 'day';
        break;
      case '12months':
      default:
        startDate = subMonths(now, 11);
        endDate = now;
        groupBy = 'month';
        break;
    }

    // Get revenue data with invoice details
    const revenueData = await Invoice.findAll({
      attributes: [
        'invoiceDate',
        'status',
        [fn('SUM', literal('CASE WHEN "lineItems"."lineTotal" IS NOT NULL THEN "lineItems"."lineTotal" ELSE 0 END')), 'totalAmount']
      ],
      include: [
        {
          model: InvoiceLineItem,
          as: 'lineItems',
          attributes: []
        },
        {
          model: Property,
          as: 'property',
          attributes: ['propertyType', 'city', 'state']
        }
      ],
      where: {
        invoiceDate: {
          [Op.between]: [startDate, endDate]
        }
      },
      group: ['Invoice.id', 'Invoice.invoiceDate', 'Invoice.status', 'property.id', 'property.propertyType', 'property.city', 'property.state'],
      order: [['invoiceDate', 'ASC']]
    });

    // Process and group data by time period
    const processedData = [];
    const dataMap = new Map();

    revenueData.forEach(invoice => {
      const date = new Date(invoice.invoiceDate);
      let periodKey;
      
      if (groupBy === 'day') {
        periodKey = format(date, 'yyyy-MM-dd');
      } else {
        periodKey = format(date, 'yyyy-MM');
      }

      if (!dataMap.has(periodKey)) {
        dataMap.set(periodKey, {
          period: periodKey,
          totalRevenue: 0,
          paidRevenue: 0,
          unpaidRevenue: 0,
          overdueRevenue: 0,
          invoiceCount: 0,
          propertyTypes: {}
        });
      }

      const data = dataMap.get(periodKey);
      const amount = parseFloat(invoice.dataValues.totalAmount || 0);
      
      data.totalRevenue += amount;
      data.invoiceCount += 1;
      
      if (invoice.status === 'Paid') {
        data.paidRevenue += amount;
      } else if (invoice.status === 'Overdue') {
        data.overdueRevenue += amount;
      } else {
        data.unpaidRevenue += amount;
      }

      // Track by property type
      const propertyType = invoice.property?.propertyType || 'unknown';
      data.propertyTypes[propertyType] = (data.propertyTypes[propertyType] || 0) + amount;
    });

    // Convert map to array and fill gaps
    const periods = [];
    let currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      let periodKey;
      if (groupBy === 'day') {
        periodKey = format(currentDate, 'yyyy-MM-dd');
        currentDate.setDate(currentDate.getDate() + 1);
      } else {
        periodKey = format(currentDate, 'yyyy-MM');
        currentDate.setMonth(currentDate.getMonth() + 1);
      }
      
      periods.push(dataMap.get(periodKey) || {
        period: periodKey,
        totalRevenue: 0,
        paidRevenue: 0,
        unpaidRevenue: 0,
        overdueRevenue: 0,
        invoiceCount: 0,
        propertyTypes: {}
      });
    }

    res.json({
      period,
      data: periods,
      summary: {
        totalRevenue: periods.reduce((sum, p) => sum + p.totalRevenue, 0),
        avgRevenue: periods.length > 0 ? periods.reduce((sum, p) => sum + p.totalRevenue, 0) / periods.length : 0,
        totalInvoices: periods.reduce((sum, p) => sum + p.invoiceCount, 0)
      }
    });
  } catch (error) {
    console.error('Revenue analytics error:', error);
    res.status(500).json({ message: 'Failed to generate revenue analytics' });
  }
};

// Customer Profitability Analysis
exports.getCustomerProfitability = async (req, res, next) => {
  try {
    const { limit = 10 } = req.query;
    
    const customers = await Customer.findAll({
      attributes: [
        'id',
        'name',
        'email',
        'createdAt'
      ],
      include: [
        {
          model: Property,
          as: 'properties',
          attributes: ['id', 'name', 'propertyType', 'city', 'state']
        }
      ]
    });

    const customerData = await Promise.all(customers.map(async (customer) => {
      try {
        // Get all invoices for this customer
        const invoices = await Invoice.findAll({
          where: { customerId: customer.id },
          include: [
            {
              model: InvoiceLineItem,
              as: 'lineItems',
              attributes: ['lineTotal']
            },
            {
              model: Property,
              as: 'property',
              attributes: ['id', 'name']
            }
          ]
        });

        const totalRevenue = invoices.reduce((sum, invoice) => {
          return sum + invoice.lineItems.reduce((lineSum, item) => lineSum + parseFloat(item.lineTotal || 0), 0);
        }, 0);

        const paidInvoices = invoices.filter(inv => inv.status === 'Paid');
        const paidRevenue = paidInvoices.reduce((sum, invoice) => {
          return sum + invoice.lineItems.reduce((lineSum, item) => lineSum + parseFloat(item.lineTotal || 0), 0);
        }, 0);

        const uniqueProperties = new Set(invoices.map(inv => inv.property?.id).filter(Boolean));
        
        // Calculate customer lifetime (months)
        const customerAge = Math.max(1, Math.ceil((new Date() - new Date(customer.createdAt)) / (1000 * 60 * 60 * 24 * 30)));
        
        return {
          id: customer.id,
          name: customer.name,
          email: customer.email,
          totalRevenue,
          paidRevenue,
          unpaidRevenue: totalRevenue - paidRevenue,
          invoiceCount: invoices.length,
          propertiesCount: customer.properties.length,
          servicedPropertiesCount: uniqueProperties.size,
          avgInvoiceValue: invoices.length > 0 ? totalRevenue / invoices.length : 0,
          customerLifetimeMonths: customerAge,
          monthlyRevenue: totalRevenue / customerAge,
          profitabilityScore: (totalRevenue * 0.7) + (invoices.length * 10) + (paidRevenue / Math.max(1, totalRevenue) * 30),
          lastInvoiceDate: invoices.length > 0 ? Math.max(...invoices.map(inv => new Date(inv.invoiceDate).getTime())) : null,
          paymentRate: invoices.length > 0 ? (paidInvoices.length / invoices.length) * 100 : 0
        };
      } catch (error) {
        console.error(`Error processing customer ${customer.id}:`, error);
        return null;
      }
    }));

    // Filter out failed customers and sort by profitability
    const validCustomers = customerData
      .filter(customer => customer !== null && customer.totalRevenue > 0)
      .sort((a, b) => b.profitabilityScore - a.profitabilityScore)
      .slice(0, parseInt(limit));

    res.json(validCustomers);
  } catch (error) {
    console.error('Customer profitability error:', error);
    res.status(500).json({ message: 'Failed to generate customer profitability analysis' });
  }
};

// Invoice Aging Report
exports.getInvoiceAging = async (req, res, next) => {
  try {
    const today = new Date();
    
    const invoices = await Invoice.findAll({
      where: {
        status: {
          [Op.in]: ['Unpaid', 'Overdue']
        }
      },
      include: [
        {
          model: Customer,
          as: 'customer',
          attributes: ['id', 'name', 'email', 'phone']
        },
        {
          model: Property,
          as: 'property',
          attributes: ['id', 'name', 'address']
        },
        {
          model: InvoiceLineItem,
          as: 'lineItems',
          attributes: ['lineTotal']
        }
      ],
      order: [['dueDate', 'ASC']]
    });

    const agingBuckets = {
      current: { count: 0, amount: 0, invoices: [] },
      overdue1to30: { count: 0, amount: 0, invoices: [] },
      overdue31to60: { count: 0, amount: 0, invoices: [] },
      overdue61to90: { count: 0, amount: 0, invoices: [] },
      overdue90plus: { count: 0, amount: 0, invoices: [] }
    };

    invoices.forEach(invoice => {
      const dueDate = new Date(invoice.dueDate);
      const daysDiff = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
      const totalAmount = invoice.lineItems.reduce((sum, item) => sum + parseFloat(item.lineTotal || 0), 0);
      
      const invoiceData = {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        customerName: invoice.customer.name,
        propertyName: invoice.property?.name,
        amount: totalAmount,
        dueDate: invoice.dueDate,
        daysPastDue: Math.max(0, daysDiff)
      };

      let bucket;
      if (daysDiff < 0) {
        bucket = agingBuckets.current;
      } else if (daysDiff <= 30) {
        bucket = agingBuckets.overdue1to30;
      } else if (daysDiff <= 60) {
        bucket = agingBuckets.overdue31to60;
      } else if (daysDiff <= 90) {
        bucket = agingBuckets.overdue61to90;
      } else {
        bucket = agingBuckets.overdue90plus;
      }

      bucket.count += 1;
      bucket.amount += totalAmount;
      bucket.invoices.push(invoiceData);
    });

    const totalUnpaid = Object.values(agingBuckets).reduce((sum, bucket) => sum + bucket.amount, 0);

    res.json({
      summary: {
        totalUnpaidAmount: totalUnpaid,
        totalUnpaidCount: invoices.length,
        averageAge: invoices.length > 0 
          ? invoices.reduce((sum, inv) => sum + Math.max(0, Math.floor((today - new Date(inv.dueDate)) / (1000 * 60 * 60 * 24))), 0) / invoices.length 
          : 0
      },
      agingBuckets
    });
  } catch (error) {
    console.error('Invoice aging error:', error);
    res.status(500).json({ message: 'Failed to generate invoice aging report' });
  }
};

// Geographic Distribution
exports.getGeographicDistribution = async (req, res, next) => {
  try {
    const properties = await Property.findAll({
      attributes: [
        'city',
        'state',
        'propertyType',
        'latitude',
        'longitude',
        [fn('COUNT', col('id')), 'propertyCount']
      ],
      include: [
        {
          model: Invoice,
          as: 'invoices',
          attributes: [],
          include: [
            {
              model: InvoiceLineItem,
              as: 'lineItems',
              attributes: []
            }
          ]
        }
      ],
      group: ['Property.city', 'Property.state', 'Property.propertyType', 'Property.latitude', 'Property.longitude'],
      having: literal('"propertyCount" > 0'),
      order: [[fn('COUNT', col('id')), 'DESC']]
    });

    // Get revenue by location
    const locationRevenue = await Property.findAll({
      attributes: [
        'city',
        'state',
        [fn('COUNT', col('Property.id')), 'propertyCount'],
        [fn('SUM', literal('CASE WHEN "invoices->lineItems"."lineTotal" IS NOT NULL THEN "invoices->lineItems"."lineTotal" ELSE 0 END')), 'totalRevenue']
      ],
      include: [
        {
          model: Invoice,
          as: 'invoices',
          attributes: [],
          include: [
            {
              model: InvoiceLineItem,
              as: 'lineItems',
              attributes: []
            }
          ]
        }
      ],
      group: ['Property.city', 'Property.state'],
      order: [[fn('SUM', literal('CASE WHEN "invoices->lineItems"."lineTotal" IS NOT NULL THEN "invoices->lineItems"."lineTotal" ELSE 0 END')), 'DESC']]
    });

    // Property type distribution
    const propertyTypeDistribution = await Property.findAll({
      attributes: [
        'propertyType',
        [fn('COUNT', col('id')), 'count']
      ],
      group: ['propertyType'],
      order: [[fn('COUNT', col('id')), 'DESC']]
    });

    res.json({
      byLocation: locationRevenue.map(item => ({
        city: item.city,
        state: item.state,
        propertyCount: parseInt(item.dataValues.propertyCount || 0),
        totalRevenue: parseFloat(item.dataValues.totalRevenue || 0)
      })),
      byPropertyType: propertyTypeDistribution.map(item => ({
        propertyType: item.propertyType,
        count: parseInt(item.dataValues.count)
      })),
      propertiesWithCoordinates: properties.filter(p => p.latitude && p.longitude).map(p => ({
        city: p.city,
        state: p.state,
        latitude: parseFloat(p.latitude),
        longitude: parseFloat(p.longitude),
        propertyType: p.propertyType,
        propertyCount: parseInt(p.dataValues.propertyCount || 0)
      }))
    });
  } catch (error) {
    console.error('Geographic distribution error:', error);
    res.status(500).json({ message: 'Failed to generate geographic distribution' });
  }
};

// Service Performance Metrics
exports.getServiceMetrics = async (req, res, next) => {
  try {
    const { timeframe = '6months' } = req.query;
    
    let startDate;
    switch (timeframe) {
      case '3months':
        startDate = subMonths(new Date(), 3);
        break;
      case '12months':
        startDate = subMonths(new Date(), 12);
        break;
      case '6months':
      default:
        startDate = subMonths(new Date(), 6);
        break;
    }

    // Service completion metrics
    const serviceMetrics = await PropertyServiceHistory.findAll({
      where: {
        serviceDate: {
          [Op.gte]: startDate
        }
      },
      include: [
        {
          model: Property,
          as: 'property',
          attributes: ['propertyType', 'city', 'state']
        },
        {
          model: Invoice,
          as: 'invoice',
          attributes: ['status', 'invoiceDate', 'paymentDate']
        }
      ]
    });

    // Calculate metrics
    const totalServices = serviceMetrics.length;
    const avgCustomerSatisfaction = serviceMetrics
      .filter(s => s.customerSatisfaction)
      .reduce((sum, s) => sum + s.customerSatisfaction, 0) / 
      serviceMetrics.filter(s => s.customerSatisfaction).length || 0;

    const avgTimeSpent = serviceMetrics
      .filter(s => s.timeSpent)
      .reduce((sum, s) => sum + parseFloat(s.timeSpent), 0) /
      serviceMetrics.filter(s => s.timeSpent).length || 0;

    const followUpRequired = serviceMetrics.filter(s => s.followUpRequired).length;
    
    // Service types breakdown
    const serviceTypeBreakdown = {};
    serviceMetrics.forEach(service => {
      const type = service.serviceType;
      if (!serviceTypeBreakdown[type]) {
        serviceTypeBreakdown[type] = {
          count: 0,
          totalCost: 0,
          avgSatisfaction: 0,
          satisfactionCount: 0
        };
      }
      serviceTypeBreakdown[type].count += 1;
      serviceTypeBreakdown[type].totalCost += parseFloat(service.totalCost || 0);
      if (service.customerSatisfaction) {
        serviceTypeBreakdown[type].avgSatisfaction += service.customerSatisfaction;
        serviceTypeBreakdown[type].satisfactionCount += 1;
      }
    });

    // Calculate averages for service types
    Object.keys(serviceTypeBreakdown).forEach(type => {
      const data = serviceTypeBreakdown[type];
      data.avgCost = data.count > 0 ? data.totalCost / data.count : 0;
      data.avgSatisfaction = data.satisfactionCount > 0 ? data.avgSatisfaction / data.satisfactionCount : 0;
    });

    res.json({
      summary: {
        totalServices,
        avgCustomerSatisfaction: Math.round(avgCustomerSatisfaction * 10) / 10,
        avgTimeSpent: Math.round(avgTimeSpent * 10) / 10,
        followUpRate: totalServices > 0 ? (followUpRequired / totalServices) * 100 : 0,
        repeatCustomerRate: 0 // TODO: Calculate based on multiple services
      },
      serviceTypeBreakdown,
      timeframe
    });
  } catch (error) {
    console.error('Service metrics error:', error);
    res.status(500).json({ message: 'Failed to generate service metrics' });
  }
};

// Financial Health Indicators
exports.getFinancialHealth = async (req, res, next) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
    const sixtyDaysAgo = new Date(now.getTime() - (60 * 24 * 60 * 60 * 1000));
    const ninetyDaysAgo = new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000));

    // Cash flow indicators
    const recentInvoices = await Invoice.findAll({
      where: {
        invoiceDate: {
          [Op.gte]: thirtyDaysAgo
        }
      },
      include: [
        {
          model: InvoiceLineItem,
          as: 'lineItems'
        }
      ]
    });

    const recentRevenue = recentInvoices.reduce((sum, invoice) => {
      return sum + invoice.lineItems.reduce((lineSum, item) => lineSum + parseFloat(item.lineTotal || 0), 0);
    }, 0);

    const recentExpenses = await Expense.findOne({
      attributes: [[fn('SUM', col('amount')), 'total']],
      where: {
        expenseDate: {
          [Op.gte]: thirtyDaysAgo
        }
      },
      raw: true
    });

    // Outstanding invoices
    const outstandingInvoices = await Invoice.findAll({
      where: {
        status: {
          [Op.in]: ['Unpaid', 'Overdue']
        }
      },
      include: [
        {
          model: InvoiceLineItem,
          as: 'lineItems'
        }
      ]
    });

    const totalOutstanding = outstandingInvoices.reduce((sum, invoice) => {
      return sum + invoice.lineItems.reduce((lineSum, item) => lineSum + parseFloat(item.lineTotal || 0), 0);
    }, 0);

    // Collection efficiency
    const paidInvoices30Days = recentInvoices.filter(inv => inv.status === 'Paid').length;
    const collectionRate = recentInvoices.length > 0 ? (paidInvoices30Days / recentInvoices.length) * 100 : 0;

    // Average payment time
    const paidInvoicesWithDates = await Invoice.findAll({
      where: {
        status: 'Paid',
        paymentDate: {
          [Op.not]: null
        },
        invoiceDate: {
          [Op.gte]: ninetyDaysAgo
        }
      }
    });

    const avgPaymentTime = paidInvoicesWithDates.length > 0 
      ? paidInvoicesWithDates.reduce((sum, invoice) => {
          const paymentTime = (new Date(invoice.paymentDate) - new Date(invoice.invoiceDate)) / (1000 * 60 * 60 * 24);
          return sum + paymentTime;
        }, 0) / paidInvoicesWithDates.length
      : 0;

    // Growth indicators
    const revenue30Days = recentRevenue;
    const revenue60to30Days = await Invoice.findAll({
      where: {
        invoiceDate: {
          [Op.between]: [sixtyDaysAgo, thirtyDaysAgo]
        }
      },
      include: [{ model: InvoiceLineItem, as: 'lineItems' }]
    });

    const revenue60to30 = revenue60to30Days.reduce((sum, invoice) => {
      return sum + invoice.lineItems.reduce((lineSum, item) => lineSum + parseFloat(item.lineTotal || 0), 0);
    }, 0);

    const revenueGrowthRate = revenue60to30 > 0 ? ((revenue30Days - revenue60to30) / revenue60to30) * 100 : 0;

    res.json({
      cashFlow: {
        recentRevenue: revenue30Days,
        recentExpenses: parseFloat(recentExpenses?.total || 0),
        netCashFlow: revenue30Days - parseFloat(recentExpenses?.total || 0)
      },
      receivables: {
        totalOutstanding,
        averagePaymentTime: Math.round(avgPaymentTime),
        collectionRate: Math.round(collectionRate * 10) / 10
      },
      growth: {
        revenueGrowthRate: Math.round(revenueGrowthRate * 10) / 10,
        monthlyRecurringRevenue: 0 // TODO: Calculate based on recurring templates
      },
      healthScore: Math.min(100, Math.max(0, 
        (collectionRate * 0.3) + 
        (Math.min(revenueGrowthRate + 10, 30) * 0.4) + 
        (Math.min(100 - (avgPaymentTime * 2), 30) * 0.3)
      ))
    });
  } catch (error) {
    console.error('Financial health error:', error);
    res.status(500).json({ message: 'Failed to generate financial health indicators' });
  }
};