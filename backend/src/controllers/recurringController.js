const { RecurringTemplate, Customer, Invoice, InvoiceLineItem } = require('../models');
const { validationResult } = require('express-validator');
const { generateInvoiceNumber } = require('../utils/invoiceUtils');
const { addDays, addWeeks, addMonths, addYears } = require('date-fns');

exports.getTemplates = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const { count, rows: templates } = await RecurringTemplate.findAndCountAll({
      include: [
        {
          model: Customer,
          as: 'customer',
          attributes: ['id', 'name', 'email']
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['nextRunDate', 'ASC']]
    });

    res.json({
      templates,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      totalCount: count
    });
  } catch (error) {
    next(error);
  }
};

exports.getTemplate = async (req, res, next) => {
  try {
    const template = await RecurringTemplate.findByPk(req.params.id, {
      include: [
        {
          model: Customer,
          as: 'customer'
        }
      ]
    });

    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    res.json({ template });
  } catch (error) {
    next(error);
  }
};

exports.createTemplate = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { startDate, frequency, ...templateData } = req.body;
    
    // Calculate next run date
    const nextRunDate = calculateNextRunDate(new Date(startDate), frequency);

    const template = await RecurringTemplate.create({
      ...templateData,
      startDate,
      frequency,
      nextRunDate
    });

    const completeTemplate = await RecurringTemplate.findByPk(template.id, {
      include: [{ model: Customer, as: 'customer' }]
    });

    res.status(201).json({ template: completeTemplate });
  } catch (error) {
    next(error);
  }
};

exports.updateTemplate = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const template = await RecurringTemplate.findByPk(req.params.id);
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    const { startDate, frequency, ...updateData } = req.body;
    
    // Recalculate next run date if frequency or start date changed
    if (startDate || frequency) {
      const newStartDate = startDate ? new Date(startDate) : template.startDate;
      const newFrequency = frequency || template.frequency;
      updateData.nextRunDate = calculateNextRunDate(newStartDate, newFrequency);
    }

    await template.update({
      ...updateData,
      ...(startDate && { startDate }),
      ...(frequency && { frequency })
    });

    const updatedTemplate = await RecurringTemplate.findByPk(template.id, {
      include: [{ model: Customer, as: 'customer' }]
    });

    res.json({ template: updatedTemplate });
  } catch (error) {
    next(error);
  }
};

exports.deleteTemplate = async (req, res, next) => {
  try {
    const template = await RecurringTemplate.findByPk(req.params.id);
    
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    await template.destroy();
    res.json({ message: 'Template deleted successfully' });
  } catch (error) {
    next(error);
  }
};

exports.generateInvoice = async (req, res, next) => {
  try {
    const template = await RecurringTemplate.findByPk(req.params.id);
    
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    const invoice = await generateInvoiceFromTemplate(template);
    
    res.status(201).json({ 
      message: 'Invoice generated successfully',
      invoice 
    });
  } catch (error) {
    next(error);
  }
};

// Helper functions
function calculateNextRunDate(baseDate, frequency) {
  const date = new Date(baseDate);
  
  switch (frequency) {
    case 'WEEKLY':
      return addWeeks(date, 1);
    case 'MONTHLY':
      return addMonths(date, 1);
    case 'QUARTERLY':
      return addMonths(date, 3);
    case 'YEARLY':
      return addYears(date, 1);
    default:
      return addMonths(date, 1);
  }
}

async function generateInvoiceFromTemplate(template) {
  const { baseInvoiceData } = template;
  const invoiceNumber = await generateInvoiceNumber();
  
  // Calculate due date (30 days from today by default)
  const invoiceDate = new Date();
  const dueDate = addDays(invoiceDate, 30);

  // Create invoice
  const invoice = await Invoice.create({
    invoiceNumber,
    customerId: template.customerId,
    invoiceDate,
    dueDate,
    taxRate: template.taxRate,
    notes: baseInvoiceData.notes || '',
    recurringTemplateId: template.id
  });

  // Create line items
  if (baseInvoiceData.lineItems && baseInvoiceData.lineItems.length > 0) {
    const lineItemsData = baseInvoiceData.lineItems.map(item => ({
      ...item,
      invoiceId: invoice.id
    }));
    await InvoiceLineItem.bulkCreate(lineItemsData);
  }

  // Update template
  const nextRunDate = calculateNextRunDate(template.nextRunDate, template.frequency);
  const completedOccurrences = template.completedOccurrences + 1;
  
  // Check if we should deactivate the template
  const shouldDeactivate = (template.endDate && nextRunDate > new Date(template.endDate)) ||
                          (template.occurrences && completedOccurrences >= template.occurrences);

  await template.update({
    nextRunDate: shouldDeactivate ? null : nextRunDate,
    completedOccurrences,
    isActive: !shouldDeactivate
  });

  // Return complete invoice
  return await Invoice.findByPk(invoice.id, {
    include: [
      { model: Customer, as: 'customer' },
      { model: InvoiceLineItem, as: 'lineItems' }
    ]
  });
}

module.exports = { generateInvoiceFromTemplate };