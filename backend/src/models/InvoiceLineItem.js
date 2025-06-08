const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const InvoiceLineItem = sequelize.define('InvoiceLineItem', {
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
    },
    description: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 500],
      },
    },
    quantity: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 1,
      validate: {
        min: 0,
      },
    },
    unitPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0,
      },
    },
    lineTotal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0,
      },
    },
  }, {
    hooks: {
      beforeSave: (lineItem) => {
        // Calculate line total automatically
        lineItem.lineTotal = parseFloat(lineItem.quantity) * parseFloat(lineItem.unitPrice);
      },
    },
  });

  return InvoiceLineItem;
};
