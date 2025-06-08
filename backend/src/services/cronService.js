const cron = require('node-cron');
const { Op } = require('sequelize');
const {
  addDays, addWeeks, addMonths, addYears,
} = require('date-fns');
const {
  RecurringTemplate, Invoice, InvoiceLineItem, Customer,
} = require('../models');
const { updateOverdueInvoices, generateInvoiceNumber } = require('../utils/invoiceUtils');
const logger = require('../utils/logger');

class CronService {
  static start() {
    if (process.env.NODE_ENV === 'production') {
      // Run every day at 6 AM to generate recurring invoices
      cron.schedule('0 6 * * *', async () => {
        logger.info('Running recurring invoice generation job');
        await this.generateRecurringInvoices();
      });

      // Run every day at 7 AM to update overdue invoices
      cron.schedule('0 7 * * *', async () => {
        logger.info('Running overdue invoice update job');
        await this.updateOverdueInvoices();
      });

      // Run weekly cleanup on Sundays at 2 AM
      cron.schedule('0 2 * * 0', async () => {
        logger.info('Running weekly cleanup job');
        await this.weeklyCleanup();
      });
    } else {
      // In development, run every 5 minutes for testing
      cron.schedule('*/5 * * * *', async () => {
        logger.info('Running development recurring invoice check');
        await this.generateRecurringInvoices();
      });
    }

    logger.info('Cron jobs started');
  }

  static async generateRecurringInvoices() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const templates = await RecurringTemplate.findAll({
        where: {
          isActive: true,
          nextRunDate: {
            [Op.lte]: today,
          },
        },
        include: [
          {
            model: Customer,
            as: 'customer',
          },
        ],
      });

      logger.info(`Found ${templates.length} templates ready for generation`);

      for (const template of templates) {
        try {
          const invoice = await this.generateInvoiceFromTemplate(template);
          logger.info(`Generated invoice ${invoice.invoiceNumber} from template ${template.templateName}`);
        } catch (error) {
          logger.error(`Failed to generate invoice from template ${template.id}:`, error);
        }
      }
    } catch (error) {
      logger.error('Error in recurring invoice generation:', error);
    }
  }

  static async generateInvoiceFromTemplate(template) {
    const { baseInvoiceData } = template;
    const invoiceNumber = await generateInvoiceNumber();

    // Calculate due date (30 days from today by default)
    const invoiceDate = new Date();
    const dueDate = addDays(invoiceDate, baseInvoiceData.paymentTerms || 30);

    // Create invoice
    const invoice = await Invoice.create({
      invoiceNumber,
      customerId: template.customerId,
      invoiceDate,
      dueDate,
      taxRate: template.taxRate,
      notes: baseInvoiceData.notes || `Auto-generated from template: ${template.templateName}`,
      recurringTemplateId: template.id,
    });

    // Create line items
    if (baseInvoiceData.lineItems && baseInvoiceData.lineItems.length > 0) {
      const lineItemsData = baseInvoiceData.lineItems.map((item) => ({
        invoiceId: invoice.id,
        description: item.description,
        quantity: parseFloat(item.quantity),
        unitPrice: parseFloat(item.unitPrice),
        lineTotal: parseFloat(item.quantity) * parseFloat(item.unitPrice),
      }));
      await InvoiceLineItem.bulkCreate(lineItemsData);
    }

    // Update template for next run
    const nextRunDate = this.calculateNextRunDate(template.nextRunDate, template.frequency);
    const completedOccurrences = template.completedOccurrences + 1;

    // Check if we should deactivate the template
    const shouldDeactivate = (template.endDate && nextRunDate > new Date(template.endDate))
                            || (template.occurrences && completedOccurrences >= template.occurrences);

    await template.update({
      nextRunDate: shouldDeactivate ? null : nextRunDate,
      completedOccurrences,
      isActive: !shouldDeactivate,
    });

    // Return complete invoice
    return await Invoice.findByPk(invoice.id, {
      include: [
        { model: Customer, as: 'customer' },
        { model: InvoiceLineItem, as: 'lineItems' },
      ],
    });
  }

  static calculateNextRunDate(baseDate, frequency) {
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

  static async updateOverdueInvoices() {
    try {
      const result = await updateOverdueInvoices();
      logger.info('Updated overdue invoices');
      return result;
    } catch (error) {
      logger.error('Error updating overdue invoices:', error);
      throw error;
    }
  }

  static async weeklyCleanup() {
    try {
      // Clean up old logs (keep last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // You can add more cleanup tasks here
      logger.info('Weekly cleanup completed');
    } catch (error) {
      logger.error('Error in weekly cleanup:', error);
    }
  }

  static stop() {
    cron.destroy();
    logger.info('Cron jobs stopped');
  }
}

module.exports = CronService;
