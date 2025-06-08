const { Sequelize } = require('sequelize');

const sequelize = new Sequelize({
  dialect: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'invoice_db',
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || 'password',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
});

// Import models
const User = require('./User')(sequelize);
const Customer = require('./Customer')(sequelize);
const CustomerPhoto = require('./CustomerPhoto')(sequelize);
const CustomerNote = require('./CustomerNote')(sequelize);
const Property = require('./Property')(sequelize);
const PropertyPhoto = require('./PropertyPhoto')(sequelize);
const PropertyNote = require('./PropertyNote')(sequelize);
const PropertyServiceHistory = require('./PropertyServiceHistory')(sequelize);
const Invoice = require('./Invoice')(sequelize);
const InvoiceLineItem = require('./InvoiceLineItem')(sequelize);
const Expense = require('./Expense')(sequelize);
const RecurringTemplate = require('./RecurringTemplate')(sequelize);

// Define associations
// Customer - Invoice (One to Many)
Customer.hasMany(Invoice, { foreignKey: 'customerId', as: 'invoices' });
Invoice.belongsTo(Customer, { foreignKey: 'customerId', as: 'customer' });

// Invoice - InvoiceLineItem (One to Many)
Invoice.hasMany(InvoiceLineItem, { foreignKey: 'invoiceId', as: 'lineItems', onDelete: 'CASCADE' });
InvoiceLineItem.belongsTo(Invoice, { foreignKey: 'invoiceId', as: 'invoice' });

// Invoice - Expense (One to Many)
Invoice.hasMany(Expense, { foreignKey: 'invoiceId', as: 'expenses' });
Expense.belongsTo(Invoice, { foreignKey: 'invoiceId', as: 'invoice' });

// Customer - RecurringTemplate (One to Many)
Customer.hasMany(RecurringTemplate, { foreignKey: 'customerId', as: 'recurringTemplates' });
RecurringTemplate.belongsTo(Customer, { foreignKey: 'customerId', as: 'customer' });

// RecurringTemplate - Invoice (One to Many for generated invoices)
RecurringTemplate.hasMany(Invoice, { foreignKey: 'recurringTemplateId', as: 'generatedInvoices' });
Invoice.belongsTo(RecurringTemplate, { foreignKey: 'recurringTemplateId', as: 'recurringTemplate' });

// Customer - CustomerPhoto (One to Many)
Customer.hasMany(CustomerPhoto, { foreignKey: 'customerId', as: 'photos', onDelete: 'CASCADE' });
CustomerPhoto.belongsTo(Customer, { foreignKey: 'customerId', as: 'customer' });

// Customer - CustomerNote (One to Many)
Customer.hasMany(CustomerNote, { foreignKey: 'customerId', as: 'notes', onDelete: 'CASCADE' });
CustomerNote.belongsTo(Customer, { foreignKey: 'customerId', as: 'customer' });

// Customer - Property (One to Many)
Customer.hasMany(Property, { foreignKey: 'customerId', as: 'properties', onDelete: 'CASCADE' });
Property.belongsTo(Customer, { foreignKey: 'customerId', as: 'customer' });

// Property - PropertyPhoto (One to Many)
Property.hasMany(PropertyPhoto, { foreignKey: 'propertyId', as: 'photos', onDelete: 'CASCADE' });
PropertyPhoto.belongsTo(Property, { foreignKey: 'propertyId', as: 'property' });

// Property - PropertyNote (One to Many)
Property.hasMany(PropertyNote, { foreignKey: 'propertyId', as: 'notes', onDelete: 'CASCADE' });
PropertyNote.belongsTo(Property, { foreignKey: 'propertyId', as: 'property' });

// Property - PropertyServiceHistory (One to Many)
Property.hasMany(PropertyServiceHistory, { foreignKey: 'propertyId', as: 'serviceHistory', onDelete: 'CASCADE' });
PropertyServiceHistory.belongsTo(Property, { foreignKey: 'propertyId', as: 'property' });

// Invoice - PropertyServiceHistory (One to Many)
Invoice.hasMany(PropertyServiceHistory, { foreignKey: 'invoiceId', as: 'serviceHistory' });
PropertyServiceHistory.belongsTo(Invoice, { foreignKey: 'invoiceId', as: 'invoice' });

// Property - Invoice (One to Many) - Change from Customer to Property for invoices
Property.hasMany(Invoice, { foreignKey: 'propertyId', as: 'invoices' });
Invoice.belongsTo(Property, { foreignKey: 'propertyId', as: 'property' });

module.exports = {
  sequelize,
  User,
  Customer,
  CustomerPhoto,
  CustomerNote,
  Property,
  PropertyPhoto,
  PropertyNote,
  PropertyServiceHistory,
  Invoice,
  InvoiceLineItem,
  Expense,
  RecurringTemplate,
};
