const emailService = require('./emailService');
const logger = require('../utils/logger');

class NotificationService {
  constructor() {
    this.enabled = process.env.EMAIL_NOTIFICATIONS_ENABLED !== 'false';
    this.templates = {
      invoiceCreated: {
        subject: 'New Invoice Created - {{invoiceNumber}}',
        template: 'invoice-created'
      },
      invoiceSent: {
        subject: 'Invoice {{invoiceNumber}} has been sent',
        template: 'invoice-sent'
      },
      invoicePaid: {
        subject: 'Payment Received - Invoice {{invoiceNumber}}',
        template: 'invoice-paid'
      },
      invoiceOverdue: {
        subject: 'Overdue Notice - Invoice {{invoiceNumber}}',
        template: 'invoice-overdue'
      },
      paymentReminder: {
        subject: 'Payment Reminder - Invoice {{invoiceNumber}}',
        template: 'payment-reminder'
      },
      recurringInvoiceGenerated: {
        subject: 'Recurring Invoice Generated - {{invoiceNumber}}',
        template: 'recurring-invoice-generated'
      },
      customerCreated: {
        subject: 'New Customer Added - {{customerName}}',
        template: 'customer-created'
      },
      expenseAdded: {
        subject: 'New Expense Added - {{vendor}}',
        template: 'expense-added'
      }
    };
  }

  async sendInvoiceCreatedNotification(invoice) {
    if (!this.enabled) return;

    try {
      const template = this.templates.invoiceCreated;
      const context = {
        invoiceNumber: invoice.invoiceNumber,
        customerName: invoice.customer.name,
        amount: invoice.grandTotal,
        dueDate: invoice.dueDate
      };

      await this.sendNotification(
        invoice.customer.email,
        template,
        context,
        'invoice_created'
      );

      logger.info(`Invoice created notification sent for ${invoice.invoiceNumber}`);
    } catch (error) {
      logger.error('Failed to send invoice created notification:', error);
    }
  }

  async sendInvoicePaidNotification(invoice) {
    if (!this.enabled) return;

    try {
      const template = this.templates.invoicePaid;
      const context = {
        invoiceNumber: invoice.invoiceNumber,
        customerName: invoice.customer.name,
        amount: invoice.grandTotal,
        paymentDate: invoice.paymentDate
      };

      // Send to customer
      if (invoice.customer.email) {
        await this.sendNotification(
          invoice.customer.email,
          template,
          context,
          'invoice_paid'
        );
      }

      // Send to business owner
      const businessEmail = process.env.COMPANY_EMAIL;
      if (businessEmail) {
        await this.sendNotification(
          businessEmail,
          template,
          context,
          'invoice_paid_business'
        );
      }

      logger.info(`Invoice paid notification sent for ${invoice.invoiceNumber}`);
    } catch (error) {
      logger.error('Failed to send invoice paid notification:', error);
    }
  }

  async sendInvoiceOverdueNotification(invoice) {
    if (!this.enabled) return;

    try {
      const template = this.templates.invoiceOverdue;
      const daysPastDue = Math.floor((new Date() - new Date(invoice.dueDate)) / (1000 * 60 * 60 * 24));
      
      const context = {
        invoiceNumber: invoice.invoiceNumber,
        customerName: invoice.customer.name,
        amount: invoice.grandTotal,
        dueDate: invoice.dueDate,
        daysPastDue
      };

      await this.sendNotification(
        invoice.customer.email,
        template,
        context,
        'invoice_overdue'
      );

      logger.info(`Invoice overdue notification sent for ${invoice.invoiceNumber}`);
    } catch (error) {
      logger.error('Failed to send invoice overdue notification:', error);
    }
  }

  async sendPaymentReminderNotification(invoice, daysBefore = 3) {
    if (!this.enabled) return;

    try {
      const template = this.templates.paymentReminder;
      const context = {
        invoiceNumber: invoice.invoiceNumber,
        customerName: invoice.customer.name,
        amount: invoice.grandTotal,
        dueDate: invoice.dueDate,
        daysBefore
      };

      await this.sendNotification(
        invoice.customer.email,
        template,
        context,
        'payment_reminder'
      );

      logger.info(`Payment reminder sent for ${invoice.invoiceNumber}`);
    } catch (error) {
      logger.error('Failed to send payment reminder:', error);
    }
  }

  async sendRecurringInvoiceNotification(invoice, templateName) {
    if (!this.enabled) return;

    try {
      const template = this.templates.recurringInvoiceGenerated;
      const context = {
        invoiceNumber: invoice.invoiceNumber,
        customerName: invoice.customer.name,
        amount: invoice.grandTotal,
        templateName
      };

      await this.sendNotification(
        invoice.customer.email,
        template,
        context,
        'recurring_invoice'
      );

      logger.info(`Recurring invoice notification sent for ${invoice.invoiceNumber}`);
    } catch (error) {
      logger.error('Failed to send recurring invoice notification:', error);
    }
  }

  async sendCustomerCreatedNotification(customer) {
    if (!this.enabled) return;

    try {
      const template = this.templates.customerCreated;
      const context = {
        customerName: customer.name,
        customerEmail: customer.email,
        createdDate: new Date().toLocaleDateString()
      };

      // Send welcome email to customer
      if (customer.email) {
        await this.sendNotification(
          customer.email,
          {
            subject: 'Welcome to {{companyName}}',
            template: 'customer-welcome'
          },
          {
            ...context,
            companyName: process.env.COMPANY_NAME || 'Our Company'
          },
          'customer_welcome'
        );
      }

      logger.info(`Customer created notification sent for ${customer.name}`);
    } catch (error) {
      logger.error('Failed to send customer created notification:', error);
    }
  }

  async sendExpenseAddedNotification(expense) {
    if (!this.enabled) return;

    try {
      const businessEmail = process.env.COMPANY_EMAIL;
      if (!businessEmail) return;

      const template = this.templates.expenseAdded;
      const context = {
        vendor: expense.vendor,
        amount: expense.amount,
        description: expense.description,
        expenseDate: expense.expenseDate
      };

      await this.sendNotification(
        businessEmail,
        template,
        context,
        'expense_added'
      );

      logger.info(`Expense added notification sent for ${expense.vendor}`);
    } catch (error) {
      logger.error('Failed to send expense added notification:', error);
    }
  }

  async sendBulkPaymentReminders() {
    if (!this.enabled) return;

    try {
      const { Invoice, Customer } = require('../models');
      const { Op } = require('sequelize');
      
      // Get invoices due in 3 days
      const reminderDate = new Date();
      reminderDate.setDate(reminderDate.getDate() + 3);
      
      const invoices = await Invoice.findAll({
        where: {
          status: 'Unpaid',
          dueDate: {
            [Op.eq]: reminderDate.toISOString().split('T')[0]
          }
        },
        include: [
          {
            model: Customer,
            as: 'customer',
            where: {
              email: { [Op.ne]: null }
            }
          }
        ]
      });

      for (const invoice of invoices) {
        await this.sendPaymentReminderNotification(invoice);
        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      logger.info(`Sent ${invoices.length} payment reminders`);
      return invoices.length;
    } catch (error) {
      logger.error('Failed to send bulk payment reminders:', error);
      return 0;
    }
  }

  async sendBulkOverdueNotifications() {
    if (!this.enabled) return;

    try {
      const { Invoice, Customer } = require('../models');
      const { Op } = require('sequelize');
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const overdueInvoices = await Invoice.findAll({
        where: {
          status: 'Overdue',
          dueDate: {
            [Op.lt]: today
          }
        },
        include: [
          {
            model: Customer,
            as: 'customer',
            where: {
              email: { [Op.ne]: null }
            }
          }
        ]
      });

      for (const invoice of overdueInvoices) {
        await this.sendInvoiceOverdueNotification(invoice);
        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      logger.info(`Sent ${overdueInvoices.length} overdue notifications`);
      return overdueInvoices.length;
    } catch (error) {
      logger.error('Failed to send bulk overdue notifications:', error);
      return 0;
    }
  }

  async sendNotification(to, template, context, type) {
    if (!to || !template) {
      throw new Error('Recipient email and template are required');
    }

    try {
      const subject = this.replaceTemplate(template.subject, context);
      const htmlContent = this.generateEmailHTML(template.template, context);

      const mailOptions = {
        from: process.env.GMAIL_USER,
        to,
        subject,
        html: htmlContent
      };

      await emailService.transporter.sendMail(mailOptions);
      
      // Log notification for audit trail
      logger.info(`Notification sent: ${type} to ${to}`);
      
    } catch (error) {
      logger.error(`Failed to send notification to ${to}:`, error);
      throw error;
    }
  }

  replaceTemplate(template, context) {
    let result = template;
    for (const [key, value] of Object.entries(context)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, value);
    }
    return result;
  }

  generateEmailHTML(templateName, context) {
    // This is a simple template system. In production, you might want to use
    // a more sophisticated template engine like Handlebars or Mustache
    
    const baseTemplate = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">${process.env.COMPANY_NAME || 'Invoice Management'}</h1>
        </div>
        <div style="background: white; padding: 30px; border: 1px solid #e0e0e0; border-radius: 0 0 10px 10px;">
          {{content}}
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; color: #666;">
            <p><strong>${process.env.COMPANY_NAME || 'Invoice Management'}</strong></p>
            <p>${process.env.COMPANY_PHONE || 'Phone: (555) 123-4567'} | ${process.env.COMPANY_EMAIL || 'info@company.com'}</p>
          </div>
        </div>
      </div>
    `;

    let content = '';
    
    switch (templateName) {
      case 'invoice-created':
        content = `
          <h2 style="color: #333;">Invoice Created</h2>
          <p>Hello ${context.customerName},</p>
          <p>A new invoice has been created for you:</p>
          <ul>
            <li><strong>Invoice Number:</strong> ${context.invoiceNumber}</li>
            <li><strong>Amount:</strong> $${context.amount?.toFixed(2)}</li>
            <li><strong>Due Date:</strong> ${new Date(context.dueDate).toLocaleDateString()}</li>
          </ul>
          <p>Thank you for your business!</p>
        `;
        break;
        
      case 'invoice-paid':
        content = `
          <h2 style="color: #10B981;">Payment Received</h2>
          <p>Hello ${context.customerName},</p>
          <p>We have received your payment for invoice ${context.invoiceNumber}.</p>
          <ul>
            <li><strong>Amount Paid:</strong> $${context.amount?.toFixed(2)}</li>
            <li><strong>Payment Date:</strong> ${new Date(context.paymentDate).toLocaleDateString()}</li>
          </ul>
          <p>Thank you for your prompt payment!</p>
        `;
        break;
        
      case 'invoice-overdue':
        content = `
          <h2 style="color: #EF4444;">Overdue Payment Notice</h2>
          <p>Hello ${context.customerName},</p>
          <p>This is a reminder that invoice ${context.invoiceNumber} is now overdue.</p>
          <ul>
            <li><strong>Amount Due:</strong> $${context.amount?.toFixed(2)}</li>
            <li><strong>Due Date:</strong> ${new Date(context.dueDate).toLocaleDateString()}</li>
            <li><strong>Days Past Due:</strong> ${context.daysPastDue}</li>
          </ul>
          <p>Please remit payment as soon as possible to avoid any late fees.</p>
        `;
        break;
        
      case 'payment-reminder':
        content = `
          <h2 style="color: #F59E0B;">Payment Reminder</h2>
          <p>Hello ${context.customerName},</p>
          <p>This is a friendly reminder that invoice ${context.invoiceNumber} is due in ${context.daysBefore} days.</p>
          <ul>
            <li><strong>Amount Due:</strong> $${context.amount?.toFixed(2)}</li>
            <li><strong>Due Date:</strong> ${new Date(context.dueDate).toLocaleDateString()}</li>
          </ul>
          <p>Please ensure payment is made by the due date.</p>
        `;
        break;
        
      case 'customer-welcome':
        content = `
          <h2 style="color: #3B82F6;">Welcome!</h2>
          <p>Hello ${context.customerName},</p>
          <p>Welcome to ${context.companyName}! We're excited to work with you.</p>
          <p>Your customer account has been created and you'll receive invoices and updates at this email address.</p>
          <p>If you have any questions, please don't hesitate to contact us.</p>
        `;
        break;
        
      default:
        content = `
          <h2>Notification</h2>
          <p>You have a new notification from ${process.env.COMPANY_NAME || 'Invoice Management'}.</p>
        `;
    }

    return baseTemplate.replace('{{content}}', content);
  }

  // Get notification settings/status
  getSettings() {
    return {
      enabled: this.enabled,
      availableTemplates: Object.keys(this.templates),
      emailService: emailService.transporter ? 'configured' : 'not configured'
    };
  }

  // Test notification
  async testNotification(email) {
    try {
      await this.sendNotification(
        email,
        {
          subject: 'Test Notification from {{companyName}}',
          template: 'test'
        },
        {
          companyName: process.env.COMPANY_NAME || 'Invoice Management'
        },
        'test'
      );
      return true;
    } catch (error) {
      logger.error('Test notification failed:', error);
      return false;
    }
  }
}

module.exports = new NotificationService();