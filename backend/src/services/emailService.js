const nodemailer = require('nodemailer');
const pdfService = require('./pdfService');
const logger = require('../utils/logger');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS
      }
    });
  }

  async sendInvoiceEmail(invoice) {
    try {
      // Generate PDF
      const pdfBuffer = await pdfService.generateInvoicePDF(invoice);

      const mailOptions = {
        from: process.env.GMAIL_USER,
        to: invoice.customer.email,
        subject: `Invoice #${invoice.invoiceNumber} from ${process.env.COMPANY_NAME || 'Home Repair Solutions'}`,
        html: this.generateEmailHTML(invoice),
        attachments: [
          {
            filename: `invoice-${invoice.invoiceNumber}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf'
          }
        ]
      };

      const result = await this.transporter.sendMail(mailOptions);
      logger.info(`Invoice email sent: ${invoice.invoiceNumber} to ${invoice.customer.email}`);
      
      return result;
    } catch (error) {
      logger.error('Email sending failed:', error);
      throw error;
    }
  }

  generateEmailHTML(invoice) {
    const grandTotal = invoice.getGrandTotal();
    
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 28px;">${process.env.COMPANY_NAME || 'Home Repair Solutions'}</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Professional Home Repair Services</p>
        </div>
        
        <div style="background: white; padding: 30px; border: 1px solid #e0e0e0; border-radius: 0 0 10px 10px;">
          <h2 style="color: #667eea; margin-top: 0;">Invoice #${invoice.invoiceNumber}</h2>
          
          <p>Dear ${invoice.customer.name},</p>
          
          <p>Thank you for choosing our services! Please find attached your invoice for the work completed.</p>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin: 0 0 15px 0; color: #333;">Invoice Details:</h3>
            <p style="margin: 5px 0;"><strong>Invoice Date:</strong> ${new Date(invoice.invoiceDate).toLocaleDateString()}</p>
            <p style="margin: 5px 0;"><strong>Due Date:</strong> ${new Date(invoice.dueDate).toLocaleDateString()}</p>
            <p style="margin: 5px 0;"><strong>Amount Due:</strong> <span style="font-size: 18px; color: #667eea; font-weight: bold;">$${grandTotal.toFixed(2)}</span></p>
          </div>
          
          <p>Payment is due by <strong>${new Date(invoice.dueDate).toLocaleDateString()}</strong>. If you have any questions about this invoice, please don't hesitate to contact us.</p>
          
          <p>We appreciate your business and look forward to serving you again!</p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; color: #666;">
            <p><strong>${process.env.COMPANY_NAME || 'Home Repair Solutions'}</strong></p>
            <p>${process.env.COMPANY_PHONE || 'Phone: (555) 123-4567'} | ${process.env.COMPANY_EMAIL || 'info@homerepair.com'}</p>
          </div>
        </div>
      </div>
    `;
  }

  async testConnection() {
    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      logger.error('Email service connection failed:', error);
      return false;
    }
  }
}

module.exports = new EmailService();