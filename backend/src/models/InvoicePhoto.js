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
        // Try to get backend URL from environment variables
        let baseUrl = process.env.BACKEND_URL || process.env.RAILWAY_STATIC_URL;
        
        // Railway fallback based on environment
        if (!baseUrl && process.env.NODE_ENV === 'production') {
          // Check if we're on staging or production based on hostname or other env vars
          const isStaging = process.env.RAILWAY_ENVIRONMENT_NAME?.includes('staging') || 
                           process.env.FRONTEND_URL?.includes('staging');
          
          if (isStaging) {
            baseUrl = 'https://invoice-backend-staging.up.railway.app';
          } else {
            baseUrl = 'https://invoice-backend-production-75d7.up.railway.app';
          }
        }
        
        // Final fallback for development
        if (!baseUrl) {
          baseUrl = 'http://localhost:5000';
        }
        
        // Ensure the URL has a protocol
        if (baseUrl && !baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
          baseUrl = `https://${baseUrl}`;
        }
        
        return `${baseUrl}/uploads/invoice_photos/${this.filename}`;
      }
    },
  });

  return InvoicePhoto;
};