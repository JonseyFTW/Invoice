const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Invoice = sequelize.define('Invoice', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    invoiceNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    customerId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Customers',
        key: 'id'
      }
    },
    propertyId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Properties',
        key: 'id'
      }
    },
    invoiceDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    dueDate: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    taxRate: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0.00,
      validate: {
        min: 0,
        max: 100
      }
    },
    status: {
      type: DataTypes.ENUM('Unpaid', 'Paid', 'Overdue', 'Draft'),
      allowNull: false,
      defaultValue: 'Unpaid'
    },
    paymentDate: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    recurringTemplateId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'RecurringTemplates',
        key: 'id'
      }
    },
    sentDate: {
      type: DataTypes.DATE,
      allowNull: true
    }
  });

  // Virtual fields for calculations
  Invoice.prototype.getSubtotal = function() {
    if (!this.lineItems) return 0;
    return this.lineItems.reduce((sum, item) => sum + parseFloat(item.lineTotal), 0);
  };

  Invoice.prototype.getTaxAmount = function() {
    const subtotal = this.getSubtotal();
    return subtotal * (parseFloat(this.taxRate) / 100);
  };

  Invoice.prototype.getGrandTotal = function() {
    return this.getSubtotal() + this.getTaxAmount();
  };

  return Invoice;
};