const { validationResult } = require('express-validator');
const { Op } = require('sequelize');
const {
  Invoice, InvoiceLineItem, InvoicePhoto, Customer, Property, PropertyServiceHistory,
} = require('../models');
const { generateInvoiceNumber } = require('../utils/invoiceUtils');
const pdfService = require('../services/pdfService');
const emailService = require('../services/emailService');

exports.getInvoices = async (req, res, next) => {
  try {
    const {
      page = 1, limit = 10, status, customerId, propertyId, search, sortBy = 'invoiceDate', sortDir = 'desc',
    } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {};
    if (status) whereClause.status = status;
    if (customerId) whereClause.customerId = customerId;
    if (propertyId) whereClause.propertyId = propertyId;
    if (search) {
      whereClause.invoiceNumber = { [Op.iLike]: `%${search}%` };
    }

    // Handle sorting - map frontend fields to database fields/includes
    let orderClause = [];
    const direction = sortDir.toUpperCase();
    
    switch (sortBy) {
      case 'customer.name':
        orderClause = [[{ model: Customer, as: 'customer' }, 'name', direction]];
        break;
      case 'property.name':
        orderClause = [[{ model: Property, as: 'property' }, 'name', direction]];
        break;
      case 'grandTotal':
        // For calculated fields, we'll sort by a related field or handle in app
        orderClause = [['invoiceDate', direction]]; // Fallback to date for now
        break;
      default:
        orderClause = [[sortBy, direction]];
    }

    const { count, rows: invoices } = await Invoice.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Customer,
          as: 'customer',
          attributes: ['id', 'name', 'email'],
        },
        {
          model: Property,
          as: 'property',
          attributes: ['id', 'name', 'address', 'city', 'state', 'propertyType'],
        },
        {
          model: InvoiceLineItem,
          as: 'lineItems',
        },
        {
          model: InvoicePhoto,
          as: 'photos',
          attributes: ['id', 'filename', 'description', 'category', 'uploadedAt'],
          order: [['uploadedAt', 'DESC']],
        },
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: orderClause,
    });

    // Add calculated totals
    const invoicesWithTotals = invoices.map((invoice) => {
      const invoiceJson = invoice.toJSON();
      // Ensure photo URLs are included
      if (invoiceJson.photos) {
        invoiceJson.photos = invoiceJson.photos.map(photo => ({
          ...photo,
          url: invoice.photos.find(p => p.id === photo.id)?.url
        }));
      }
      return {
        ...invoiceJson,
        subtotal: invoice.getSubtotal(),
        taxAmount: invoice.getTaxAmount(),
        grandTotal: invoice.getGrandTotal(),
      };
    });

    res.json({
      invoices: invoicesWithTotals,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      totalCount: count,
    });
  } catch (error) {
    next(error);
  }
};

exports.getInvoice = async (req, res, next) => {
  try {
    const invoice = await Invoice.findByPk(req.params.id, {
      include: [
        {
          model: Customer,
          as: 'customer',
        },
        {
          model: Property,
          as: 'property',
          attributes: ['id', 'name', 'address', 'city', 'state', 'propertyType', 'gateCode', 'keyLocation', 'accessNotes'],
        },
        {
          model: InvoiceLineItem,
          as: 'lineItems',
          order: [['createdAt', 'ASC']],
        },
        {
          model: InvoicePhoto,
          as: 'photos',
          attributes: ['id', 'filename', 'description', 'category', 'uploadedAt'],
          order: [['uploadedAt', 'DESC']],
        },
      ],
    });

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    const invoiceJson = invoice.toJSON();
    // Ensure photo URLs are included
    if (invoiceJson.photos) {
      invoiceJson.photos = invoiceJson.photos.map(photo => ({
        ...photo,
        url: invoice.photos.find(p => p.id === photo.id)?.url
      }));
    }
    
    const invoiceWithTotals = {
      ...invoiceJson,
      subtotal: invoice.getSubtotal(),
      taxAmount: invoice.getTaxAmount(),
      grandTotal: invoice.getGrandTotal(),
    };

    res.json({ invoice: invoiceWithTotals });
  } catch (error) {
    next(error);
  }
};

exports.createInvoice = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      customerId, propertyId, invoiceDate, dueDate, taxRate, notes, lineItems,
    } = req.body;

    // Generate invoice number
    const invoiceNumber = await generateInvoiceNumber();

    // Create invoice
    const invoice = await Invoice.create({
      invoiceNumber,
      customerId,
      propertyId: propertyId || null,
      invoiceDate,
      dueDate,
      taxRate: taxRate || 0,
      notes,
    });

    // Create line items
    if (lineItems && lineItems.length > 0) {
      const lineItemsWithInvoiceId = lineItems.map((item) => ({
        ...item,
        invoiceId: invoice.id,
      }));
      await InvoiceLineItem.bulkCreate(lineItemsWithInvoiceId);
    }

    // Fetch the complete invoice with line items
    const completeInvoice = await Invoice.findByPk(invoice.id, {
      include: [
        { model: Customer, as: 'customer' },
        { model: Property, as: 'property' },
        { model: InvoiceLineItem, as: 'lineItems' },
      ],
    });

    const invoiceWithTotals = {
      ...completeInvoice.toJSON(),
      subtotal: completeInvoice.getSubtotal(),
      taxAmount: completeInvoice.getTaxAmount(),
      grandTotal: completeInvoice.getGrandTotal(),
    };

    res.status(201).json({ invoice: invoiceWithTotals });
  } catch (error) {
    next(error);
  }
};

exports.updateInvoice = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const invoice = await Invoice.findByPk(req.params.id);
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    const { lineItems, ...invoiceData } = req.body;

    // Update invoice
    await invoice.update(invoiceData);

    // Update line items if provided
    if (lineItems) {
      // Delete existing line items
      await InvoiceLineItem.destroy({ where: { invoiceId: invoice.id } });

      // Create new line items
      if (lineItems.length > 0) {
        const lineItemsWithInvoiceId = lineItems.map((item) => ({
          ...item,
          invoiceId: invoice.id,
        }));
        await InvoiceLineItem.bulkCreate(lineItemsWithInvoiceId);
      }
    }

    // Fetch updated invoice
    const updatedInvoice = await Invoice.findByPk(invoice.id, {
      include: [
        { model: Customer, as: 'customer' },
        { model: InvoiceLineItem, as: 'lineItems' },
      ],
    });

    const invoiceWithTotals = {
      ...updatedInvoice.toJSON(),
      subtotal: updatedInvoice.getSubtotal(),
      taxAmount: updatedInvoice.getTaxAmount(),
      grandTotal: updatedInvoice.getGrandTotal(),
    };

    res.json({ invoice: invoiceWithTotals });
  } catch (error) {
    next(error);
  }
};

exports.deleteInvoice = async (req, res, next) => {
  try {
    const invoice = await Invoice.findByPk(req.params.id);

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    await invoice.destroy();
    res.json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    next(error);
  }
};

exports.markAsPaid = async (req, res, next) => {
  try {
    const invoice = await Invoice.findByPk(req.params.id, {
      include: [
        { model: Customer, as: 'customer' },
        { model: Property, as: 'property' },
        { model: InvoiceLineItem, as: 'lineItems' },
      ],
    });

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    // Update invoice status
    await invoice.update({
      status: 'Paid',
      paymentDate: new Date(),
    });

    // Create automatic service history entry if property exists
    if (invoice.propertyId) {
      const serviceDescription = invoice.lineItems && invoice.lineItems.length > 0
        ? invoice.lineItems.map((item) => `${item.description} (${item.quantity}x)`).join(', ')
        : 'Service completed as per invoice';

      const totalCost = invoice.getGrandTotal();
      const serviceDate = invoice.invoiceDate;

      await PropertyServiceHistory.create({
        propertyId: invoice.propertyId,
        invoiceId: invoice.id,
        serviceDate,
        serviceType: 'other', // Could be enhanced to detect service type from line items
        description: serviceDescription,
        totalCost,
        notes: `Automatically created from paid invoice #${invoice.invoiceNumber}`,
        customerSatisfaction: null, // Could be added later via follow-up
      });

      // Update property's last service date
      if (invoice.property) {
        await invoice.property.update({
          lastServiceDate: serviceDate,
        });
      }
    }

    res.json({ message: 'Invoice marked as paid', invoice });
  } catch (error) {
    next(error);
  }
};

exports.generatePDF = async (req, res, next) => {
  try {
    const invoice = await Invoice.findByPk(req.params.id, {
      include: [
        { model: Customer, as: 'customer' },
        { model: InvoiceLineItem, as: 'lineItems' },
      ],
    });

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    const pdfBuffer = await pdfService.generateInvoicePDF(invoice);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${invoice.invoiceNumber}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
};

exports.sendEmail = async (req, res, next) => {
  try {
    const invoice = await Invoice.findByPk(req.params.id, {
      include: [
        { model: Customer, as: 'customer' },
        { model: InvoiceLineItem, as: 'lineItems' },
      ],
    });

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    if (!invoice.customer.email) {
      return res.status(400).json({ message: 'Customer email not found' });
    }

    await emailService.sendInvoiceEmail(invoice);

    // Update sent date
    await invoice.update({ sentDate: new Date() });

    res.json({ message: 'Invoice sent successfully' });
  } catch (error) {
    next(error);
  }
};

// Invoice Photos Methods
exports.uploadInvoicePhoto = async (req, res, next) => {
  try {
    const { id: invoiceId } = req.params;
    const { description, category = 'receipt' } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: 'No photo uploaded' });
    }

    const invoice = await Invoice.findByPk(invoiceId);
    if (!invoice) {
      // Clean up uploaded file
      const fs = require('fs').promises;
      await fs.unlink(req.file.path).catch(() => {});
      return res.status(404).json({ message: 'Invoice not found' });
    }

    const photo = await InvoicePhoto.create({
      invoiceId,
      filename: req.file.filename,
      originalName: req.file.originalname,
      filePath: req.file.path,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      description,
      category,
    });

    // Return photo with URL
    const photoWithUrl = {
      ...photo.toJSON(),
      url: photo.url
    };

    res.status(201).json({ photo: photoWithUrl });
  } catch (error) {
    // Clean up uploaded file on error
    if (req.file) {
      const fs = require('fs').promises;
      await fs.unlink(req.file.path).catch(() => {});
    }
    next(error);
  }
};

exports.getInvoicePhotos = async (req, res, next) => {
  try {
    const { id: invoiceId } = req.params;
    const { category } = req.query;

    const whereClause = { invoiceId };
    if (category) {
      whereClause.category = category;
    }

    const photos = await InvoicePhoto.findAll({
      where: whereClause,
      attributes: ['id', 'filename', 'description', 'category', 'uploadedAt'],
      order: [['uploadedAt', 'DESC']],
    });

    // Ensure URLs are included
    const photosWithUrls = photos.map(photo => ({
      ...photo.toJSON(),
      url: photo.url
    }));
    
    res.json({ photos: photosWithUrls });
  } catch (error) {
    next(error);
  }
};

exports.deleteInvoicePhoto = async (req, res, next) => {
  try {
    const { photoId } = req.params;

    const photo = await InvoicePhoto.findByPk(photoId);
    if (!photo) {
      return res.status(404).json({ message: 'Photo not found' });
    }

    // Delete file from filesystem
    const fs = require('fs').promises;
    try {
      await fs.unlink(photo.filePath);
    } catch (error) {
      console.error(`Failed to delete photo file: ${photo.filePath}`);
    }

    await photo.destroy();
    res.json({ message: 'Photo deleted successfully' });
  } catch (error) {
    next(error);
  }
};
