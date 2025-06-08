const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const RecurringTemplate = sequelize.define('RecurringTemplate', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    customerId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Customers',
        key: 'id',
      },
    },
    templateName: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 100],
      },
    },
    baseInvoiceData: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
    taxRate: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0.00,
    },
    frequency: {
      type: DataTypes.ENUM('WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'),
      allowNull: false,
    },
    startDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    endDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    occurrences: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
      },
    },
    nextRunDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    completedOccurrences: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
  });

  return RecurringTemplate;
};
