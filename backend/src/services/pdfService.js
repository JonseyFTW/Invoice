const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs').promises;

class PDFService {
  async generateInvoicePDF(invoice) {
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
      const page = await browser.newPage();
      
      const html = this.generateInvoiceHTML(invoice);
      await page.setContent(html, { waitUntil: 'networkidle0' });
      
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm'
        }
      });

      return pdfBuffer;
    } finally {
      await browser.close();
    }
  }

  generateInvoiceHTML(invoice) {
    const subtotal = invoice.getSubtotal();
    const taxAmount = invoice.getTaxAmount();
    const grandTotal = invoice.getGrandTotal();

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Invoice ${invoice.invoiceNumber}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 0;
              color: #333;
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 30px;
              text-align: center;
            }
            .company-name {
              font-size: 28px;
              font-weight: bold;
              margin-bottom: 10px;
            }
            .company-details {
              font-size: 14px;
              opacity: 0.9;
            }
            .content {
              padding: 30px;
            }
            .invoice-details {
              display: flex;
              justify-content: space-between;
              margin-bottom: 30px;
            }
            .invoice-info, .customer-info {
              flex: 1;
            }
            .invoice-info {
              text-align: right;
            }
            .invoice-number {
              font-size: 24px;
              font-weight: bold;
              color: #667eea;
              margin-bottom: 10px;
            }
            .customer-info h3 {
              color: #667eea;
              margin-bottom: 10px;
            }
            .line-items {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 30px;
            }
            .line-items th {
              background-color: #f8f9fa;
              border: 1px solid #dee2e6;
              padding: 12px;
              text-align: left;
              font-weight: bold;
            }
            .line-items td {
              border: 1px solid #dee2e6;
              padding: 12px;
            }
            .line-items .number {
              text-align: right;
            }
            .totals {
              margin-left: auto;
              width: 300px;
            }
            .totals table {
              width: 100%;
              border-collapse: collapse;
            }
            .totals td {
              padding: 8px 12px;
              border-bottom: 1px solid #eee;
            }
            .totals .total-row {
              font-weight: bold;
              font-size: 18px;
              background-color: #667eea;
              color: white;
            }
            .footer {
              margin-top: 50px;
              padding-top: 20px;
              border-top: 2px solid #667eea;
              text-align: center;
              color: #666;
            }
            .notes {
              margin-top: 30px;
              padding: 20px;
              background-color: #f8f9fa;
              border-left: 4px solid #667eea;
            }
            @media print {
              body { margin: 0; }
              .header { break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-name">${process.env.COMPANY_NAME || 'Home Repair Solutions'}</div>
            <div class="company-details">
              ${process.env.COMPANY_ADDRESS || 'Your Business Address'}<br>
              ${process.env.COMPANY_PHONE || 'Phone: (555) 123-4567'} | 
              ${process.env.COMPANY_EMAIL || 'Email: info@homerepair.com'}
            </div>
          </div>

          <div class="content">
            <div class="invoice-details">
              <div class="customer-info">
                <h3>Bill To:</h3>
                <strong>${invoice.customer.name}</strong><br>
                ${invoice.customer.billingAddress ? invoice.customer.billingAddress.replace(/\n/g, '<br>') : ''}
                ${invoice.customer.phone ? `<br>Phone: ${invoice.customer.phone}` : ''}
                ${invoice.customer.email ? `<br>Email: ${invoice.customer.email}` : ''}
              </div>
              
              <div class="invoice-info">
                <div class="invoice-number">Invoice #${invoice.invoiceNumber}</div>
                <strong>Invoice Date:</strong> ${new Date(invoice.invoiceDate).toLocaleDateString()}<br>
                <strong>Due Date:</strong> ${new Date(invoice.dueDate).toLocaleDateString()}<br>
                <strong>Status:</strong> <span style="color: ${invoice.status === 'Paid' ? 'green' : 'red'};">${invoice.status}</span>
              </div>
            </div>

            <table class="line-items">
              <thead>
                <tr>
                  <th>Description</th>
                  <th class="number">Qty</th>
                  <th class="number">Unit Price</th>
                  <th class="number">Total</th>
                </tr>
              </thead>
              <tbody>
                ${invoice.lineItems.map(item => `
                  <tr>
                    <td>${item.description}</td>
                    <td class="number">${parseFloat(item.quantity).toFixed(2)}</td>
                    <td class="number">$${parseFloat(item.unitPrice).toFixed(2)}</td>
                    <td class="number">$${parseFloat(item.lineTotal).toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <div class="totals">
              <table>
                <tr>
                  <td>Subtotal:</td>
                  <td class="number">$${subtotal.toFixed(2)}</td>
                </tr>
                <tr>
                  <td>Tax (${parseFloat(invoice.taxRate).toFixed(1)}%):</td>
                  <td class="number">$${taxAmount.toFixed(2)}</td>
                </tr>
                <tr class="total-row">
                  <td>Total:</td>
                  <td class="number">$${grandTotal.toFixed(2)}</td>
                </tr>
              </table>
            </div>

            ${invoice.notes ? `
              <div class="notes">
                <h4>Notes:</h4>
                <p>${invoice.notes.replace(/\n/g, '<br>')}</p>
              </div>
            ` : ''}

            <div class="footer">
              <p>Thank you for your business!</p>
              <p>Please remit payment by the due date. For questions about this invoice, please contact us.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }
}

module.exports = new PDFService();