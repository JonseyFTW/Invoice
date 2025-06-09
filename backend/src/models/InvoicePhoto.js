const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const InvoicePhoto = sequelize.define('InvoicePhoto', {
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
      validate: {
        min: 0,
      },
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
  }, {
    indexes: [
      {
        fields: ['invoiceId'],
      },
      {
        fields: ['category'],
      },
      {
        fields: ['uploadedAt'],
      },
    ],
    getterMethods: {
      url() {
        const baseUrl = process.env.BACKEND_URL || 'http://localhost:5000';
        return `${baseUrl}/uploads/invoice_photos/${this.filename}`;
      }
    },
  });

  return InvoicePhoto;
};