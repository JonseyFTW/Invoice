const { Expense, Invoice, Customer } = require('../models');
const { validationResult } = require('express-validator');
const geminiService = require('../services/geminiService');
const fs = require('fs').promises;
const path = require('path');
const { Op } = require('sequelize');

exports.getExpenses = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, invoiceId } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {};
    if (invoiceId) whereClause.invoiceId = invoiceId;

    const { count, rows: expenses } = await Expense.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Invoice,
          as: 'invoice',
          include: [
            {
              model: Customer,
              as: 'customer',
              attributes: ['id', 'name']
            }
          ]
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['expenseDate', 'DESC']]
    });

    res.json({
      expenses,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      totalCount: count
    });
  } catch (error) {
    next(error);
  }
};

exports.getExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findByPk(req.params.id, {
      include: [
        {
          model: Invoice,
          as: 'invoice',
          include: [
            {
              model: Customer,
              as: 'customer'
            }
          ]
        }
      ]
    });

    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    res.json({ expense });
  } catch (error) {
    next(error);
  }
};

exports.createExpense = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // Clean up uploaded file if validation fails
      if (req.file) {
        await fs.unlink(req.file.path).catch(() => {});
      }
      return res.status(400).json({ errors: errors.array() });
    }

    let parsedData = null;
    let receiptImagePath = null;

    // Handle file upload and parsing
    if (req.file) {
      receiptImagePath = req.file.path;
      
      try {
        // Parse receipt with Gemini
        const fileBuffer = await fs.readFile(req.file.path);
        parsedData = await geminiService.parseReceipt(fileBuffer);
      } catch (parseError) {
        console.error('Receipt parsing failed:', parseError.message);
        // Continue without parsed data - manual entry will be required
      }
    }

    const expenseData = {
      ...req.body,
      receiptImagePath,
      parsedData
    };

    const expense = await Expense.create(expenseData);

    // If we have parsed data and an invoice ID, create line items
    if (parsedData && parsedData.lineItems && req.body.invoiceId) {
      const { InvoiceLineItem } = require('../models');
      
      const lineItemsData = parsedData.lineItems.map(item => ({
        invoiceId: req.body.invoiceId,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal
      }));

      await InvoiceLineItem.bulkCreate(lineItemsData);
    }

    // Fetch complete expense with relations
    const completeExpense = await Expense.findByPk(expense.id, {
      include: [
        {
          model: Invoice,
          as: 'invoice',
          include: [
            {
              model: Customer,
              as: 'customer'
            }
          ]
        }
      ]
    });

    res.status(201).json({ 
      expense: completeExpense,
      parsedData: parsedData
    });
  } catch (error) {
    // Clean up uploaded file on error
    if (req.file) {
      await fs.unlink(req.file.path).catch(() => {});
    }
    next(error);
  }
};

exports.updateExpense = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      if (req.file) {
        await fs.unlink(req.file.path).catch(() => {});
      }
      return res.status(400).json({ errors: errors.array() });
    }

    const expense = await Expense.findByPk(req.params.id);
    if (!expense) {
      if (req.file) {
        await fs.unlink(req.file.path).catch(() => {});
      }
      return res.status(404).json({ message: 'Expense not found' });
    }

    let updateData = { ...req.body };

    // Handle new file upload
    if (req.file) {
      // Delete old file if it exists
      if (expense.receiptImagePath) {
        await fs.unlink(expense.receiptImagePath).catch(() => {});
      }
      
      updateData.receiptImagePath = req.file.path;
      
      try {
        // Parse new receipt
        const fileBuffer = await fs.readFile(req.file.path);
        updateData.parsedData = await geminiService.parseReceipt(fileBuffer);
      } catch (parseError) {
        console.error('Receipt parsing failed:', parseError.message);
      }
    }

    await expense.update(updateData);

    const updatedExpense = await Expense.findByPk(expense.id, {
      include: [
        {
          model: Invoice,
          as: 'invoice',
          include: [
            {
              model: Customer,
              as: 'customer'
            }
          ]
        }
      ]
    });

    res.json({ expense: updatedExpense });
  } catch (error) {
    if (req.file) {
      await fs.unlink(req.file.path).catch(() => {});
    }
    next(error);
  }
};

exports.deleteExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findByPk(req.params.id);
    
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    // Delete associated file
    if (expense.receiptImagePath) {
      await fs.unlink(expense.receiptImagePath).catch(() => {});
    }

    await expense.destroy();
    res.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    next(error);
  }
};