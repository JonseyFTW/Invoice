const fs = require('fs').promises;
const path = require('path');
const csv = require('csv-parser');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const archiver = require('archiver');
const { parse } = require('csv-parser');
const { 
  Customer, 
  Invoice, 
  InvoiceLineItem, 
  Expense, 
  RecurringTemplate,
  sequelize 
} = require('../models');
const logger = require('./logger');

class DataExportImport {
  constructor() {
    this.exportDir = path.join(__dirname, '../../exports');
    this.importDir = path.join(__dirname, '../../imports');
  }

  // Initialize directories
  async initialize() {
    try {
      await fs.mkdir(this.exportDir, { recursive: true });
      await fs.mkdir(this.importDir, { recursive: true });
      logger.info('Data export/import directories initialized');
    } catch (error) {
      logger.error('Failed to initialize directories:', error);
    }
  }

  // Export all data
  async exportAllData(format = 'json') {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const exportName = `invoice-export-${timestamp}`;
      const exportPath = path.join(this.exportDir, exportName);
      
      await fs.mkdir(exportPath, { recursive: true });

      const exportData = {
        metadata: {
          exportDate: new Date().toISOString(),
          version: '1.0.0',
          format
        },
        customers: await this.exportCustomers(),
        invoices: await this.exportInvoices(),
        expenses: await this.exportExpenses(),
        recurringTemplates: await this.exportRecurringTemplates()
      };

      if (format === 'json') {
        await this.exportToJSON(exportPath, exportData);
      } else if (format === 'csv') {
        await this.exportToCSV(exportPath, exportData);
      }

      // Create ZIP archive
      const zipPath = await this.createZipArchive(exportPath, exportName);
      
      logger.info(`Data exported successfully to ${zipPath}`);
      return zipPath;
    } catch (error) {
      logger.error('Export failed:', error);
      throw error;
    }
  }

  // Export customers
  async exportCustomers() {
    try {
      const customers = await Customer.findAll({
        attributes: ['id', 'name', 'email', 'phone', 'billingAddress', 'createdAt', 'updatedAt'],
        order: [['name', 'ASC']]
      });

      return customers.map(customer => customer.toJSON());
    } catch (error) {
      logger.error('Failed to export customers:', error);
      throw error;
    }
  }

  // Export invoices with line items
  async exportInvoices() {
    try {
      const invoices = await Invoice.findAll({
        include: [
          {
            model: Customer,
            as: 'customer',
            attributes: ['name', 'email']
          },
          {
            model: InvoiceLineItem,
            as: 'lineItems'
          }
        ],
        order: [['invoiceDate', 'DESC']]
      });

      return invoices.map(invoice => {
        const invoiceData = invoice.toJSON();
        return {
          ...invoiceData,
          subtotal: this.calculateSubtotal(invoiceData.lineItems),
          taxAmount: this.calculateTaxAmount(invoiceData.lineItems, invoiceData.taxRate),
          grandTotal: this.calculateGrandTotal(invoiceData.lineItems, invoiceData.taxRate)
        };
      });
    } catch (error) {
      logger.error('Failed to export invoices:', error);
      throw error;
    }
  }

  // Export expenses
  async exportExpenses() {
    try {
      const expenses = await Expense.findAll({
        include: [
          {
            model: Invoice,
            as: 'invoice',
            attributes: ['invoiceNumber'],
            include: [
              {
                model: Customer,
                as: 'customer',
                attributes: ['name']
              }
            ]
          }
        ],
        order: [['expenseDate', 'DESC']]
      });

      return expenses.map(expense => ({
        ...expense.toJSON(),
        // Remove sensitive file paths for security
        receiptImagePath: expense.receiptImagePath ? 'has_receipt' : null
      }));
    } catch (error) {
      logger.error('Failed to export expenses:', error);
      throw error;
    }
  }

  // Export recurring templates
  async exportRecurringTemplates() {
    try {
      const templates = await RecurringTemplate.findAll({
        include: [
          {
            model: Customer,
            as: 'customer',
            attributes: ['name', 'email']
          }
        ],
        order: [['templateName', 'ASC']]
      });

      return templates.map(template => template.toJSON());
    } catch (error) {
      logger.error('Failed to export recurring templates:', error);
      throw error;
    }
  }

  // Export to JSON format
  async exportToJSON(exportPath, data) {
    const jsonPath = path.join(exportPath, 'data.json');
    await fs.writeFile(jsonPath, JSON.stringify(data, null, 2));
    
    // Also create separate files for each entity type
    await fs.writeFile(
      path.join(exportPath, 'customers.json'),
      JSON.stringify(data.customers, null, 2)
    );
    await fs.writeFile(
      path.join(exportPath, 'invoices.json'),
      JSON.stringify(data.invoices, null, 2)
    );
    await fs.writeFile(
      path.join(exportPath, 'expenses.json'),
      JSON.stringify(data.expenses, null, 2)
    );
    await fs.writeFile(
      path.join(exportPath, 'recurring-templates.json'),
      JSON.stringify(data.recurringTemplates, null, 2)
    );
  }

  // Export to CSV format
  async exportToCSV(exportPath, data) {
    // Export customers
    await this.createCSVFile(
      path.join(exportPath, 'customers.csv'),
      data.customers,
      [
        { id: 'id', title: 'ID' },
        { id: 'name', title: 'Name' },
        { id: 'email', title: 'Email' },
        { id: 'phone', title: 'Phone' },
        { id: 'billingAddress', title: 'Billing Address' },
        { id: 'createdAt', title: 'Created At' },
        { id: 'updatedAt', title: 'Updated At' }
      ]
    );

    // Export invoices (flattened)
    const flattenedInvoices = data.invoices.map(invoice => ({
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      customerName: invoice.customer?.name,
      customerEmail: invoice.customer?.email,
      invoiceDate: invoice.invoiceDate,
      dueDate: invoice.dueDate,
      status: invoice.status,
      taxRate: invoice.taxRate,
      subtotal: invoice.subtotal,
      taxAmount: invoice.taxAmount,
      grandTotal: invoice.grandTotal,
      notes: invoice.notes,
      createdAt: invoice.createdAt,
      updatedAt: invoice.updatedAt
    }));

    await this.createCSVFile(
      path.join(exportPath, 'invoices.csv'),
      flattenedInvoices,
      [
        { id: 'id', title: 'ID' },
        { id: 'invoiceNumber', title: 'Invoice Number' },
        { id: 'customerName', title: 'Customer Name' },
        { id: 'customerEmail', title: 'Customer Email' },
        { id: 'invoiceDate', title: 'Invoice Date' },
        { id: 'dueDate', title: 'Due Date' },
        { id: 'status', title: 'Status' },
        { id: 'taxRate', title: 'Tax Rate (%)' },
        { id: 'subtotal', title: 'Subtotal' },
        { id: 'taxAmount', title: 'Tax Amount' },
        { id: 'grandTotal', title: 'Grand Total' },
        { id: 'notes', title: 'Notes' },
        { id: 'createdAt', title: 'Created At' },
        { id: 'updatedAt', title: 'Updated At' }
      ]
    );

    // Export line items
    const lineItems = [];
    data.invoices.forEach(invoice => {
      invoice.lineItems.forEach(item => {
        lineItems.push({
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: item.lineTotal
        });
      });
    });

    await this.createCSVFile(
      path.join(exportPath, 'line-items.csv'),
      lineItems,
      [
        { id: 'invoiceId', title: 'Invoice ID' },
        { id: 'invoiceNumber', title: 'Invoice Number' },
        { id: 'description', title: 'Description' },
        { id: 'quantity', title: 'Quantity' },
        { id: 'unitPrice', title: 'Unit Price' },
        { id: 'lineTotal', title: 'Line Total' }
      ]
    );

    // Export expenses
    const flattenedExpenses = data.expenses.map(expense => ({
      id: expense.id,
      vendor: expense.vendor,
      description: expense.description,
      amount: expense.amount,
      expenseDate: expense.expenseDate,
      invoiceNumber: expense.invoice?.invoiceNumber,
      customerName: expense.invoice?.customer?.name,
      hasReceipt: expense.receiptImagePath ? 'Yes' : 'No',
      createdAt: expense.createdAt,
      updatedAt: expense.updatedAt
    }));

    await this.createCSVFile(
      path.join(exportPath, 'expenses.csv'),
      flattenedExpenses,
      [
        { id: 'id', title: 'ID' },
        { id: 'vendor', title: 'Vendor' },
        { id: 'description', title: 'Description' },
        { id: 'amount', title: 'Amount' },
        { id: 'expenseDate', title: 'Expense Date' },
        { id: 'invoiceNumber', title: 'Linked Invoice' },
        { id: 'customerName', title: 'Customer' },
        { id: 'hasReceipt', title: 'Has Receipt' },
        { id: 'createdAt', title: 'Created At' },
        { id: 'updatedAt', title: 'Updated At' }
      ]
    );
  }

  // Create CSV file
  async createCSVFile(filePath, data, headers) {
    const csvWriter = createCsvWriter({
      path: filePath,
      header: headers
    });

    await csvWriter.writeRecords(data);
  }

  // Create ZIP archive
  async createZipArchive(exportPath, exportName) {
    return new Promise((resolve, reject) => {
      const zipPath = path.join(this.exportDir, `${exportName}.zip`);
      const output = require('fs').createWriteStream(zipPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', () => {
        logger.info(`ZIP archive created: ${archive.pointer()} total bytes`);
        resolve(zipPath);
      });

      archive.on('error', (err) => {
        reject(err);
      });

      archive.pipe(output);
      archive.directory(exportPath, false);
      archive.finalize();
    });
  }

  // Import data from JSON
  async importFromJSON(filePath) {
    try {
      const data = JSON.parse(await fs.readFile(filePath, 'utf8'));
      
      // Start transaction
      const transaction = await sequelize.transaction();

      try {
        // Import in correct order to handle foreign key constraints
        await this.importCustomers(data.customers, transaction);
        await this.importInvoices(data.invoices, transaction);
        await this.importExpenses(data.expenses, transaction);
        await this.importRecurringTemplates(data.recurringTemplates, transaction);

        await transaction.commit();
        logger.info('Data imported successfully from JSON');
        
        return {
          success: true,
          imported: {
            customers: data.customers?.length || 0,
            invoices: data.invoices?.length || 0,
            expenses: data.expenses?.length || 0,
            recurringTemplates: data.recurringTemplates?.length || 0
          }
        };
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    } catch (error) {
      logger.error('Import from JSON failed:', error);
      throw error;
    }
  }

  // Import customers
  async importCustomers(customers, transaction) {
    if (!customers?.length) return;

    for (const customerData of customers) {
      // Check if customer already exists
      const existing = await Customer.findOne({
        where: { email: customerData.email },
        transaction
      });

      if (!existing) {
        await Customer.create({
          name: customerData.name,
          email: customerData.email,
          phone: customerData.phone,
          billingAddress: customerData.billingAddress
        }, { transaction });
      }
    }

    logger.info(`Imported ${customers.length} customers`);
  }

  // Import invoices
  async importInvoices(invoices, transaction) {
    if (!invoices?.length) return;

    for (const invoiceData of invoices) {
      // Find customer by name or email
      const customer = await Customer.findOne({
        where: {
          [sequelize.Op.or]: [
            { name: invoiceData.customer?.name },
            { email: invoiceData.customer?.email }
          ]
        },
        transaction
      });

      if (!customer) {
        logger.warn(`Customer not found for invoice ${invoiceData.invoiceNumber}`);
        continue;
      }

      // Check if invoice already exists
      const existing = await Invoice.findOne({
        where: { invoiceNumber: invoiceData.invoiceNumber },
        transaction
      });

      if (!existing) {
        const invoice = await Invoice.create({
          invoiceNumber: invoiceData.invoiceNumber,
          customerId: customer.id,
          invoiceDate: invoiceData.invoiceDate,
          dueDate: invoiceData.dueDate,
          taxRate: invoiceData.taxRate,
          status: invoiceData.status,
          paymentDate: invoiceData.paymentDate,
          notes: invoiceData.notes
        }, { transaction });

        // Import line items
        if (invoiceData.lineItems?.length) {
          for (const lineItem of invoiceData.lineItems) {
            await InvoiceLineItem.create({
              invoiceId: invoice.id,
              description: lineItem.description,
              quantity: lineItem.quantity,
              unitPrice: lineItem.unitPrice,
              lineTotal: lineItem.lineTotal
            }, { transaction });
          }
        }
      }
    }

    logger.info(`Imported ${invoices.length} invoices`);
  }

  // Import expenses
  async importExpenses(expenses, transaction) {
    if (!expenses?.length) return;

    for (const expenseData of expenses) {
      // Find linked invoice if exists
      let invoiceId = null;
      if (expenseData.invoice?.invoiceNumber) {
        const invoice = await Invoice.findOne({
          where: { invoiceNumber: expenseData.invoice.invoiceNumber },
          transaction
        });
        invoiceId = invoice?.id;
      }

      await Expense.create({
        vendor: expenseData.vendor,
        description: expenseData.description,
        amount: expenseData.amount,
        expenseDate: expenseData.expenseDate,
        invoiceId
      }, { transaction });
    }

    logger.info(`Imported ${expenses.length} expenses`);
  }

  // Import recurring templates
  async importRecurringTemplates(templates, transaction) {
    if (!templates?.length) return;

    for (const templateData of templates) {
      // Find customer
      const customer = await Customer.findOne({
        where: {
          [sequelize.Op.or]: [
            { name: templateData.customer?.name },
            { email: templateData.customer?.email }
          ]
        },
        transaction
      });

      if (!customer) {
        logger.warn(`Customer not found for template ${templateData.templateName}`);
        continue;
      }

      await RecurringTemplate.create({
        customerId: customer.id,
        templateName: templateData.templateName,
        baseInvoiceData: templateData.baseInvoiceData,
        taxRate: templateData.taxRate,
        frequency: templateData.frequency,
        startDate: templateData.startDate,
        endDate: templateData.endDate,
        occurrences: templateData.occurrences,
        nextRunDate: templateData.nextRunDate,
        isActive: templateData.isActive,
        completedOccurrences: templateData.completedOccurrences
      }, { transaction });
    }

    logger.info(`Imported ${templates.length} recurring templates`);
  }

  // Import from CSV
  async importFromCSV(csvDir) {
    try {
      const transaction = await sequelize.transaction();

      try {
        // Import customers first
        const customersPath = path.join(csvDir, 'customers.csv');
        if (await this.fileExists(customersPath)) {
          await this.importCustomersFromCSV(customersPath, transaction);
        }

        // Then invoices
        const invoicesPath = path.join(csvDir, 'invoices.csv');
        const lineItemsPath = path.join(csvDir, 'line-items.csv');
        if (await this.fileExists(invoicesPath)) {
          await this.importInvoicesFromCSV(invoicesPath, lineItemsPath, transaction);
        }

        // Then expenses
        const expensesPath = path.join(csvDir, 'expenses.csv');
        if (await this.fileExists(expensesPath)) {
          await this.importExpensesFromCSV(expensesPath, transaction);
        }

        await transaction.commit();
        logger.info('Data imported successfully from CSV');
        
        return { success: true };
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    } catch (error) {
      logger.error('Import from CSV failed:', error);
      throw error;
    }
  }

  // Helper methods
  calculateSubtotal(lineItems) {
    return lineItems.reduce((sum, item) => sum + parseFloat(item.lineTotal), 0);
  }

  calculateTaxAmount(lineItems, taxRate) {
    const subtotal = this.calculateSubtotal(lineItems);
    return subtotal * (parseFloat(taxRate) / 100);
  }

  calculateGrandTotal(lineItems, taxRate) {
    return this.calculateSubtotal(lineItems) + this.calculateTaxAmount(lineItems, taxRate);
  }

  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  // Get export history
  async getExportHistory() {
    try {
      const files = await fs.readdir(this.exportDir);
      const exports = [];

      for (const file of files) {
        if (file.endsWith('.zip')) {
          const filePath = path.join(this.exportDir, file);
          const stats = await fs.stat(filePath);
          
          exports.push({
            filename: file,
            size: stats.size,
            createdAt: stats.birthtime,
            downloadUrl: `/api/exports/download/${file}`
          });
        }
      }

      return exports.sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
      logger.error('Failed to get export history:', error);
      return [];
    }
  }

  // Clean up old exports
  async cleanupOldExports(retentionDays = 30) {
    try {
      const files = await fs.readdir(this.exportDir);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      let deletedCount = 0;

      for (const file of files) {
        const filePath = path.join(this.exportDir, file);
        const stats = await fs.stat(filePath);

        if (stats.birthtime < cutoffDate) {
          await fs.unlink(filePath);
          deletedCount++;
        }
      }

      logger.info(`Cleaned up ${deletedCount} old export files`);
      return deletedCount;
    } catch (error) {
      logger.error('Failed to cleanup old exports:', error);
      return 0;
    }
  }
}

module.exports = new DataExportImport();