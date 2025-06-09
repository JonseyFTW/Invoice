const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, _Sequelize) => {
    // console.log('Creating InvoicePhotos table...');
    
    await queryInterface.createTable('InvoicePhotos', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      invoiceId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'Invoices',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      filename: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      originalName: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      filePath: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      mimeType: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      fileSize: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      category: {
        type: DataTypes.ENUM(
          'receipt',
          'before_work', 
          'after_work',
          'damage',
          'materials',
          'other'
        ),
        defaultValue: 'receipt',
      },
      uploadedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    });

    // Add indexes
    await queryInterface.addIndex('InvoicePhotos', ['invoiceId']);
    await queryInterface.addIndex('InvoicePhotos', ['category']);
    await queryInterface.addIndex('InvoicePhotos', ['uploadedAt']);

    // console.log('✅ InvoicePhotos table created successfully');
  },

  down: async (queryInterface, _Sequelize) => {
    // console.log('Dropping InvoicePhotos table...');
    await queryInterface.dropTable('InvoicePhotos');
    // console.log('✅ InvoicePhotos table dropped successfully');
  }
};