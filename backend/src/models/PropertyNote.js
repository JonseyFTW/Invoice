const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PropertyNote = sequelize.define('PropertyNote', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 200]
      }
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true
      }
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
        fields: ['priority']
      },
      {
        fields: ['reminderDate']
      }
    ]
  });

  return PropertyNote;
};