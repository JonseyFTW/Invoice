const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PropertyPhoto = sequelize.define('PropertyPhoto', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
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
    }
  }, {
    indexes: [
      {
        fields: ['propertyId']
      },
      {
        fields: ['category']
      },
      {
        fields: ['dateTaken']
      }
    ]
  });

  return PropertyPhoto;
};