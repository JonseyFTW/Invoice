const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create Properties table
    await queryInterface.createTable('Properties', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      customerId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'Customers',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      address: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      city: {
        type: DataTypes.STRING(100),
        allowNull: true
      },
      state: {
        type: DataTypes.STRING(50),
        allowNull: true
      },
      zipCode: {
        type: DataTypes.STRING(20),
        allowNull: true
      },
      latitude: {
        type: DataTypes.DECIMAL(10, 8),
        allowNull: true
      },
      longitude: {
        type: DataTypes.DECIMAL(11, 8),
        allowNull: true
      },
      propertyType: {
        type: DataTypes.ENUM('residential', 'commercial', 'industrial', 'other'),
        defaultValue: 'residential'
      },
      squareFootage: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      yearBuilt: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      bedrooms: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      bathrooms: {
        type: DataTypes.DECIMAL(3, 1),
        allowNull: true
      },
      floors: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      specialInstructions: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      accessNotes: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      gateCode: {
        type: DataTypes.STRING(50),
        allowNull: true
      },
      keyLocation: {
        type: DataTypes.STRING(100),
        allowNull: true
      },
      contactOnSite: {
        type: DataTypes.STRING(100),
        allowNull: true
      },
      contactPhone: {
        type: DataTypes.STRING(20),
        allowNull: true
      },
      preferredServiceTime: {
        type: DataTypes.STRING(100),
        allowNull: true
      },
      lastServiceDate: {
        type: DataTypes.DATE,
        allowNull: true
      },
      nextServiceDate: {
        type: DataTypes.DATE,
        allowNull: true
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Create PropertyPhotos table
    await queryInterface.createTable('PropertyPhotos', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      propertyId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'Properties',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      filename: {
        type: DataTypes.STRING,
        allowNull: false
      },
      originalName: {
        type: DataTypes.STRING,
        allowNull: false
      },
      mimeType: {
        type: DataTypes.STRING,
        allowNull: false
      },
      size: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      category: {
        type: DataTypes.ENUM(
          'exterior_front',
          'exterior_back',
          'exterior_side',
          'interior_room',
          'before_work',
          'after_work',
          'during_work',
          'damage',
          'materials',
          'equipment',
          'access_point',
          'other'
        ),
        defaultValue: 'other'
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      room: {
        type: DataTypes.STRING(50),
        allowNull: true
      },
      floor: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      dateTaken: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      },
      uploadedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Create PropertyNotes table
    await queryInterface.createTable('PropertyNotes', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      propertyId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'Properties',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      title: {
        type: DataTypes.STRING(200),
        allowNull: false
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      category: {
        type: DataTypes.ENUM(
          'paint_codes',
          'materials',
          'measurements',
          'access_info',
          'special_instructions',
          'damage_notes',
          'maintenance_history',
          'client_preferences',
          'safety_concerns',
          'other'
        ),
        defaultValue: 'other'
      },
      priority: {
        type: DataTypes.ENUM('low', 'medium', 'high'),
        defaultValue: 'medium'
      },
      isPrivate: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      reminderDate: {
        type: DataTypes.DATE,
        allowNull: true
      },
      room: {
        type: DataTypes.STRING(50),
        allowNull: true
      },
      floor: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Create PropertyServiceHistories table
    await queryInterface.createTable('PropertyServiceHistories', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      propertyId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'Properties',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      invoiceId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'Invoices',
          key: 'id'
        }
      },
      serviceDate: {
        type: DataTypes.DATE,
        allowNull: false
      },
      serviceType: {
        type: DataTypes.ENUM(
          'painting',
          'repair',
          'maintenance',
          'inspection',
          'estimate',
          'consultation',
          'cleanup',
          'preparation',
          'other'
        ),
        allowNull: false
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      roomsServiced: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      materialsUsed: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      timeSpent: {
        type: DataTypes.DECIMAL(4, 2),
        allowNull: true
      },
      laborCost: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
      },
      materialCost: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
      },
      totalCost: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
      },
      technicians: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      beforePhotos: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      afterPhotos: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      warrantyInfo: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      followUpRequired: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      followUpDate: {
        type: DataTypes.DATE,
        allowNull: true
      },
      customerSatisfaction: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      customerFeedback: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Add propertyId column to Invoices table
    await queryInterface.addColumn('Invoices', 'propertyId', {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Properties',
        key: 'id'
      }
    });

    // Add indexes
    await queryInterface.addIndex('Properties', ['customerId']);
    await queryInterface.addIndex('Properties', ['latitude', 'longitude']);
    await queryInterface.addIndex('Properties', ['propertyType']);
    await queryInterface.addIndex('Properties', ['city', 'state']);
    await queryInterface.addIndex('Properties', ['isActive']);
    
    await queryInterface.addIndex('PropertyPhotos', ['propertyId']);
    await queryInterface.addIndex('PropertyPhotos', ['category']);
    await queryInterface.addIndex('PropertyPhotos', ['dateTaken']);
    
    await queryInterface.addIndex('PropertyNotes', ['propertyId']);
    await queryInterface.addIndex('PropertyNotes', ['category']);
    await queryInterface.addIndex('PropertyNotes', ['priority']);
    await queryInterface.addIndex('PropertyNotes', ['reminderDate']);
    
    await queryInterface.addIndex('PropertyServiceHistories', ['propertyId']);
    await queryInterface.addIndex('PropertyServiceHistories', ['invoiceId']);
    await queryInterface.addIndex('PropertyServiceHistories', ['serviceDate']);
    await queryInterface.addIndex('PropertyServiceHistories', ['serviceType']);
    await queryInterface.addIndex('PropertyServiceHistories', ['followUpRequired', 'followUpDate']);
    
    await queryInterface.addIndex('Invoices', ['propertyId']);
  },

  down: async (queryInterface, Sequelize) => {
    // Remove propertyId column from Invoices
    await queryInterface.removeColumn('Invoices', 'propertyId');
    
    // Drop tables in reverse dependency order
    await queryInterface.dropTable('PropertyServiceHistories');
    await queryInterface.dropTable('PropertyNotes');
    await queryInterface.dropTable('PropertyPhotos');
    await queryInterface.dropTable('Properties');
  }
};