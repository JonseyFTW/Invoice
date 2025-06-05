const cron = require('node-cron');
const { RecurringTemplate } = require('../models');
const { generateInvoiceFromTemplate } = require('../controllers/recurringController');
const { updateOverdueInvoices } = require('../utils/invoiceUtils');
const { Op } = require('sequelize');
const logger = require('../utils/logger');

class CronService {
  static start() {
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
            [Op.lte]: today
          }
        }
      });

      logger.info(`Found ${templates.length} templates ready for generation`);

      for (const template of templates) {
        try {
          const invoice = await generateInvoiceFromTemplate(template);
          logger.info(`Generated invoice ${invoice.invoiceNumber} from template ${template.templateName}`);
        } catch (error) {
          logger.error(`Failed to generate invoice from template ${template.id}:`, error);
        }
      }
    } catch (error) {
      logger.error('Error in recurring invoice generation:', error);
    }
  }

  static async updateOverdueInvoices() {
    try {
      await updateOverdueInvoices();
      logger.info('Updated overdue invoices');
    } catch (error) {
      logger.error('Error updating overdue invoices:', error);
    }
  }
}

module.exports = CronService;