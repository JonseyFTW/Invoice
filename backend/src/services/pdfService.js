const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs').promises;

class PDFService {
  async getLogoBase64() {
    try {
      const logoPath = path.join(__dirname, '../../uploads/logo.png');
      const fallbackPath = path.join(__dirname, '../../../frontend/public/logo.png');
      
      console.log('Attempting to load logo from:', logoPath);
      
      let logoBuffer;
      try {
        logoBuffer = await fs.readFile(logoPath);
        console.log('✅ Logo loaded successfully from uploads directory');
      } catch (uploadError) {
        console.log('❌ Logo not found in uploads, trying fallback:', fallbackPath);
        try {
          logoBuffer = await fs.readFile(fallbackPath);
          console.log('✅ Logo loaded successfully from fallback location');
        } catch (fallbackError) {
          console.log('❌ Fallback logo also not found:', fallbackError.message);
          throw fallbackError;
        }
      }
      
      const base64 = `data:image/png;base64,${logoBuffer.toString('base64')}`;
      console.log('✅ Logo converted to base64, length:', base64.length);
      return base64;
    } catch (error) {
      console.log('❌ Logo loading failed completely:', error.message);
      return null;
    }
  }

  async generateInvoicePDF(invoice) {
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();
      const logoBase64 = await this.getLogoBase64();

      const html = this.generateInvoiceHTML(invoice, logoBase64);
      await page.setContent(html, { waitUntil: 'networkidle0' });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm',
        },
      });

      return pdfBuffer;
    } finally {
      await browser.close();
    }
  }

  generateInvoiceHTML(invoice, logoBase64) {
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
              background: white;
              color: #333;
              padding: 30px;
              display: flex;
              align-items: center;
              justify-content: space-between;
              border-bottom: 3px solid #667eea;
            }
            .logo-section {
              display: flex;
              align-items: center;
            }
            .logo {
              height: 80px;
              width: auto;
              margin-right: 20px;
            }
            .company-info {
              text-align: left;
            }
            .company-name {
              font-size: 28px;
              font-weight: bold;
              margin-bottom: 10px;
              color: #667eea;
            }
            .company-details {
              font-size: 14px;
              color: #666;
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
            <div class="logo-section">
              ${logoBase64 ? `<img src="${logoBase64}" alt="Company Logo" class="logo">` : '<!-- No logo available -->'}
              <div class="company-info">
                <div class="company-name">${process.env.COMPANY_NAME || 'Home Repair Solutions'}</div>
                <div class="company-details">
                  ${process.env.COMPANY_ADDRESS || 'Your Business Address'}<br>
                  ${process.env.COMPANY_PHONE || 'Phone: (555) 123-4567'} | 
                  ${process.env.COMPANY_EMAIL || 'Email: info@homerepair.com'}
                </div>
              </div>
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
                ${invoice.lineItems.map((item) => `
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
