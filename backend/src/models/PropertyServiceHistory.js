const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PropertyServiceHistory = sequelize.define('PropertyServiceHistory', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    serviceDate: {
      type: DataTypes.DATE,
      allowNull: false,
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
        'other',
      ),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    roomsServiced: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    materialsUsed: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    timeSpent: {
      type: DataTypes.DECIMAL(4, 2),
      allowNull: true,
      comment: 'Hours spent on service',
    },
    laborCost: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    materialCost: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    totalCost: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    technicians: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'JSON array of technician names',
    },
    beforePhotos: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'JSON array of photo IDs',
    },
    afterPhotos: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'JSON array of photo IDs',
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    warrantyInfo: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    followUpRequired: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    followUpDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    customerSatisfaction: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
        max: 5,
      },
      comment: '1-5 rating scale',
    },
    customerFeedback: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  }, {
    indexes: [
      {
        fields: ['propertyId'],
      },
      {
        fields: ['invoiceId'],
      },
      {
        fields: ['serviceDate'],
      },
      {
        fields: ['serviceType'],
      },
      {
        fields: ['followUpRequired', 'followUpDate'],
      },
    ],
  });

  return PropertyServiceHistory;
};
