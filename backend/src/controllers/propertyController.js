const {
  Property, PropertyPhoto, PropertyNote, PropertyServiceHistory, Customer, Invoice,
} = require('../models');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

// Configure multer for property photo uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads/property_photos');
    try {
      await fs.mkdir(uploadPath, { recursive: true });
      cb(null, uploadPath);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed'));
  },
});

// Get all properties for a customer
const getCustomerProperties = async (req, res) => {
  try {
    const { customerId } = req.params;
    const { page = 1, limit = 10, search = '' } = req.query;

    const offset = (page - 1) * limit;

    const whereCondition = {
      customerId,
      ...(search && {
        name: {
          [require('sequelize').Op.iLike]: `%${search}%`,
        },
      }),
    };

    const { count, rows: properties } = await Property.findAndCountAll({
      where: whereCondition,
      include: [
        {
          model: Customer,
          as: 'customer',
          attributes: ['id', 'name', 'email', 'phone'],
        },
        {
          model: PropertyPhoto,
          as: 'photos',
          attributes: ['id', 'filename', 'category', 'description', 'uploadedAt'],
          limit: 3, // Just show a preview
        },
        {
          model: PropertyNote,
          as: 'notes',
          attributes: ['id', 'title', 'category', 'priority'],
          limit: 3, // Just show a preview
        },
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset,
    });

    res.json({
      properties,
      totalCount: count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
    });
  } catch (error) {
    logger.error('Error fetching customer properties:', error);
    res.status(500).json({ message: 'Failed to fetch properties' });
  }
};

// Get single property with full details
const getProperty = async (req, res) => {
  try {
    const { id } = req.params;

    const property = await Property.findByPk(id, {
      include: [
        {
          model: Customer,
          as: 'customer',
          attributes: ['id', 'name', 'email', 'phone'],
        },
        {
          model: PropertyPhoto,
          as: 'photos',
          order: [['uploadedAt', 'DESC']],
        },
        {
          model: PropertyNote,
          as: 'notes',
          order: [['createdAt', 'DESC']],
        },
        {
          model: PropertyServiceHistory,
          as: 'serviceHistory',
          include: [
            {
              model: Invoice,
              as: 'invoice',
              attributes: ['id', 'invoiceNumber', 'status', 'invoiceDate'],
            },
          ],
          order: [['serviceDate', 'DESC']],
        },
        {
          model: Invoice,
          as: 'invoices',
          attributes: ['id', 'invoiceNumber', 'status', 'invoiceDate', 'dueDate'],
          order: [['invoiceDate', 'DESC']],
          limit: 10,
        },
      ],
    });

    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    res.json({ property });
  } catch (error) {
    logger.error('Error fetching property:', error);
    res.status(500).json({ message: 'Failed to fetch property' });
  }
};

// Create new property
const createProperty = async (req, res) => {
  try {
    const { customerId } = req.params;
    const propertyData = { ...req.body, customerId };

    // Validate customer exists
    const customer = await Customer.findByPk(customerId);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const property = await Property.create(propertyData);

    // Fetch the created property with associations
    const createdProperty = await Property.findByPk(property.id, {
      include: [
        {
          model: Customer,
          as: 'customer',
          attributes: ['id', 'name', 'email', 'phone'],
        },
      ],
    });

    logger.info(`Property created: ${property.id}`);
    res.status(201).json({ property: createdProperty });
  } catch (error) {
    logger.error('Error creating property:', error);
    res.status(500).json({ message: 'Failed to create property' });
  }
};

// Update property
const updateProperty = async (req, res) => {
  try {
    const { id } = req.params;

    const property = await Property.findByPk(id);
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    await property.update(req.body);

    // Fetch updated property with associations
    const updatedProperty = await Property.findByPk(id, {
      include: [
        {
          model: Customer,
          as: 'customer',
          attributes: ['id', 'name', 'email', 'phone'],
        },
      ],
    });

    logger.info(`Property updated: ${id}`);
    res.json({ property: updatedProperty });
  } catch (error) {
    logger.error('Error updating property:', error);
    res.status(500).json({ message: 'Failed to update property' });
  }
};

// Delete property
const deleteProperty = async (req, res) => {
  try {
    const { id } = req.params;

    const property = await Property.findByPk(id);
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    // Check if property has invoices
    const invoiceCount = await Invoice.count({ where: { propertyId: id } });
    if (invoiceCount > 0) {
      return res.status(400).json({
        message: 'Cannot delete property with existing invoices',
      });
    }

    await property.destroy();

    logger.info(`Property deleted: ${id}`);
    res.json({ message: 'Property deleted successfully' });
  } catch (error) {
    logger.error('Error deleting property:', error);
    res.status(500).json({ message: 'Failed to delete property' });
  }
};

// Upload property photo
const uploadPropertyPhoto = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      category = 'other', description = '', room = '', floor,
    } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: 'No photo file provided' });
    }

    const property = await Property.findByPk(id);
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    const photo = await PropertyPhoto.create({
      propertyId: id,
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      category,
      description,
      room: room || null,
      floor: floor ? parseInt(floor) : null,
    });

    logger.info(`Property photo uploaded: ${photo.id}`);
    res.status(201).json({ photo });
  } catch (error) {
    logger.error('Error uploading property photo:', error);
    res.status(500).json({ message: 'Failed to upload photo' });
  }
};

// Delete property photo
const deletePropertyPhoto = async (req, res) => {
  try {
    const { photoId } = req.params;

    const photo = await PropertyPhoto.findByPk(photoId);
    if (!photo) {
      return res.status(404).json({ message: 'Photo not found' });
    }

    // Delete file from filesystem
    const filePath = path.join(__dirname, '../../uploads/property_photos', photo.filename);
    try {
      await fs.unlink(filePath);
    } catch (error) {
      logger.warn(`Failed to delete photo file: ${filePath}`, error);
    }

    await photo.destroy();

    logger.info(`Property photo deleted: ${photoId}`);
    res.json({ message: 'Photo deleted successfully' });
  } catch (error) {
    logger.error('Error deleting property photo:', error);
    res.status(500).json({ message: 'Failed to delete photo' });
  }
};

// Create property note
const createPropertyNote = async (req, res) => {
  try {
    const { id } = req.params;
    const noteData = { ...req.body, propertyId: id };

    const property = await Property.findByPk(id);
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    const note = await PropertyNote.create(noteData);

    logger.info(`Property note created: ${note.id}`);
    res.status(201).json({ note });
  } catch (error) {
    logger.error('Error creating property note:', error);
    res.status(500).json({ message: 'Failed to create note' });
  }
};

// Update property note
const updatePropertyNote = async (req, res) => {
  try {
    const { noteId } = req.params;

    const note = await PropertyNote.findByPk(noteId);
    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    await note.update(req.body);

    logger.info(`Property note updated: ${noteId}`);
    res.json({ note });
  } catch (error) {
    logger.error('Error updating property note:', error);
    res.status(500).json({ message: 'Failed to update note' });
  }
};

// Delete property note
const deletePropertyNote = async (req, res) => {
  try {
    const { noteId } = req.params;

    const note = await PropertyNote.findByPk(noteId);
    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    await note.destroy();

    logger.info(`Property note deleted: ${noteId}`);
    res.json({ message: 'Note deleted successfully' });
  } catch (error) {
    logger.error('Error deleting property note:', error);
    res.status(500).json({ message: 'Failed to delete note' });
  }
};

// Create service history entry
const createServiceHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const serviceData = { ...req.body, propertyId: id };

    const property = await Property.findByPk(id);
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    const service = await PropertyServiceHistory.create(serviceData);

    // Update property's last service date
    await property.update({ lastServiceDate: serviceData.serviceDate });

    logger.info(`Service history created: ${service.id}`);
    res.status(201).json({ service });
  } catch (error) {
    logger.error('Error creating service history:', error);
    res.status(500).json({ message: 'Failed to create service history' });
  }
};

module.exports = {
  getCustomerProperties,
  getProperty,
  createProperty,
  updateProperty,
  deleteProperty,
  uploadPropertyPhoto: [upload.single('photo'), uploadPropertyPhoto],
  deletePropertyPhoto,
  createPropertyNote,
  updatePropertyNote,
  deletePropertyNote,
  createServiceHistory,
};
