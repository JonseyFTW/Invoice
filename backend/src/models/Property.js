const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Property = sequelize.define('Property', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 100],
      },
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    city: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    state: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    zipCode: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    latitude: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: true,
      validate: {
        min: -90,
        max: 90,
      },
    },
    longitude: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: true,
      validate: {
        min: -180,
        max: 180,
      },
    },
    propertyType: {
      type: DataTypes.ENUM('residential', 'commercial', 'industrial', 'other'),
      defaultValue: 'residential',
    },
    squareFootage: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 0,
      },
    },
    yearBuilt: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1800,
        max: new Date().getFullYear() + 1,
      },
    },
    bedrooms: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 0,
      },
    },
    bathrooms: {
      type: DataTypes.DECIMAL(3, 1),
      allowNull: true,
      validate: {
        min: 0,
      },
    },
    floors: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    specialInstructions: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    accessNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    gateCode: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    keyLocation: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    contactOnSite: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    contactPhone: {
      type: DataTypes.STRING(20),
      allowNull: true,
      validate: {
        is: /^[\d\s\-\+\(\)\.]*$/,
      },
    },
    preferredServiceTime: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    lastServiceDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    nextServiceDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  }, {
    indexes: [
      {
        fields: ['customerId'],
      },
      {
        fields: ['latitude', 'longitude'],
      },
      {
        fields: ['propertyType'],
      },
      {
        fields: ['city', 'state'],
      },
      {
        fields: ['isActive'],
      },
    ],
  });

  return Property;
};
