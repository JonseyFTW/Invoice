const { Customer, CustomerPhoto, CustomerNote, Property } = require('../models');
const { validationResult } = require('express-validator');
const { Op } = require('sequelize');
const fs = require('fs').promises;
const path = require('path');

exports.getCustomers = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {};
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const { count, rows: customers } = await Customer.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['name', 'ASC']]
    });

    res.json({
      customers,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      totalCount: count
    });
  } catch (error) {
    next(error);
  }
};

exports.getCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findByPk(req.params.id, {
      include: [
        {
          model: CustomerPhoto,
          as: 'photos',
          order: [['uploadedAt', 'DESC']]
        },
        {
          model: CustomerNote,
          as: 'notes',
          where: { isArchived: false },
          required: false,
          order: [['priority', 'DESC'], ['createdAt', 'DESC']]
        }
      ]
    });
    
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    res.json({ customer });
  } catch (error) {
    next(error);
  }
};

exports.createCustomer = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const customer = await Customer.create(req.body);
    res.status(201).json({ customer });
  } catch (error) {
    next(error);
  }
};

exports.updateCustomer = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const customer = await Customer.findByPk(req.params.id);
    
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    await customer.update(req.body);
    res.json({ customer });
  } catch (error) {
    next(error);
  }
};

exports.deleteCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findByPk(req.params.id, {
      include: [{ model: CustomerPhoto, as: 'photos' }]
    });
    
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    // Delete all customer photos from filesystem
    if (customer.photos && customer.photos.length > 0) {
      for (const photo of customer.photos) {
        try {
          await fs.unlink(photo.filePath);
        } catch (error) {
          console.error(`Failed to delete photo file: ${photo.filePath}`);
        }
      }
    }

    await customer.destroy();
    res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// Customer Photos Methods
exports.uploadCustomerPhoto = async (req, res, next) => {
  try {
    const { id: customerId } = req.params;
    const { description, category = 'other' } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: 'No photo uploaded' });
    }

    const customer = await Customer.findByPk(customerId);
    if (!customer) {
      // Clean up uploaded file
      await fs.unlink(req.file.path).catch(() => {});
      return res.status(404).json({ message: 'Customer not found' });
    }

    const photo = await CustomerPhoto.create({
      customerId,
      filename: req.file.filename,
      originalName: req.file.originalname,
      filePath: req.file.path,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      description,
      category
    });

    res.status(201).json({ photo });
  } catch (error) {
    // Clean up uploaded file on error
    if (req.file) {
      await fs.unlink(req.file.path).catch(() => {});
    }
    next(error);
  }
};

exports.getCustomerPhotos = async (req, res, next) => {
  try {
    const { id: customerId } = req.params;
    const { category } = req.query;

    const whereClause = { customerId };
    if (category) {
      whereClause.category = category;
    }

    const photos = await CustomerPhoto.findAll({
      where: whereClause,
      order: [['uploadedAt', 'DESC']]
    });

    res.json({ photos });
  } catch (error) {
    next(error);
  }
};

exports.deleteCustomerPhoto = async (req, res, next) => {
  try {
    const { photoId } = req.params;

    const photo = await CustomerPhoto.findByPk(photoId);
    if (!photo) {
      return res.status(404).json({ message: 'Photo not found' });
    }

    // Delete file from filesystem
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

// Customer Notes Methods
exports.createCustomerNote = async (req, res, next) => {
  try {
    const { id: customerId } = req.params;
    const { title, content, category = 'other', priority = 'medium' } = req.body;

    const customer = await Customer.findByPk(customerId);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const note = await CustomerNote.create({
      customerId,
      title,
      content,
      category,
      priority
    });

    res.status(201).json({ note });
  } catch (error) {
    next(error);
  }
};

exports.getCustomerNotes = async (req, res, next) => {
  try {
    const { id: customerId } = req.params;
    const { category, includeArchived = false } = req.query;

    const whereClause = { customerId };
    if (category) {
      whereClause.category = category;
    }
    if (!includeArchived) {
      whereClause.isArchived = false;
    }

    const notes = await CustomerNote.findAll({
      where: whereClause,
      order: [['priority', 'DESC'], ['createdAt', 'DESC']]
    });

    res.json({ notes });
  } catch (error) {
    next(error);
  }
};

exports.updateCustomerNote = async (req, res, next) => {
  try {
    const { noteId } = req.params;
    const { title, content, category, priority, isArchived } = req.body;

    const note = await CustomerNote.findByPk(noteId);
    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    await note.update({
      title,
      content,
      category,
      priority,
      isArchived
    });

    res.json({ note });
  } catch (error) {
    next(error);
  }
};

exports.deleteCustomerNote = async (req, res, next) => {
  try {
    const { noteId } = req.params;

    const note = await CustomerNote.findByPk(noteId);
    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    await note.destroy();
    res.json({ message: 'Note deleted successfully' });
  } catch (error) {
    next(error);
  }
};

exports.getCustomerProperties = async (req, res, next) => {
  try {
    const { customerId } = req.params;

    const customer = await Customer.findByPk(customerId);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const properties = await Property.findAll({
      where: { 
        customerId,
        isActive: true 
      },
      attributes: ['id', 'name', 'address', 'city', 'state', 'propertyType'],
      order: [['name', 'ASC']]
    });

    res.json({ properties });
  } catch (error) {
    next(error);
  }
};