const { Op } = require('sequelize');
const { Invoice } = require('../models');

exports.generateInvoiceNumber = async () => {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;

  // Find the highest invoice number for the current year
  const lastInvoice = await Invoice.findOne({
    where: {
      invoiceNumber: {
        [Op.like]: `${prefix}%`,
      },
    },
    order: [['invoiceNumber', 'DESC']],
  });

  let nextNumber = 1;
  if (lastInvoice) {
    const lastNumber = parseInt(lastInvoice.invoiceNumber.split('-')[2]);
    nextNumber = lastNumber + 1;
  }

  return `${prefix}${nextNumber.toString().padStart(4, '0')}`;
};

exports.calculateInvoiceTotals = (lineItems, taxRate = 0) => {
  const subtotal = lineItems.reduce((sum, item) => sum + (parseFloat(item.quantity) * parseFloat(item.unitPrice)), 0);

  const taxAmount = subtotal * (parseFloat(taxRate) / 100);
  const grandTotal = subtotal + taxAmount;

  return {
    subtotal: parseFloat(subtotal.toFixed(2)),
    taxAmount: parseFloat(taxAmount.toFixed(2)),
    grandTotal: parseFloat(grandTotal.toFixed(2)),
  };
};

exports.updateOverdueInvoices = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await Invoice.update(
    { status: 'Overdue' },
    {
      where: {
        status: 'Unpaid',
        dueDate: {
          [Op.lt]: today,
        },
      },
    },
  );
};
