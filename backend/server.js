require('dotenv').config();
const fs = require('fs');
const path = require('path');
const app = require('./src/app');
const { sequelize, User, Customer } = require('./src/models');
const logger = require('./src/utils/logger');
const cronService = require('./src/services/cronService');

const PORT = process.env.PORT || 5000;

// Ensure upload directories exist on startup
function createUploadDirectories() {
  const directories = [
    path.join(process.cwd(), 'uploads', 'receipts'),
    path.join(process.cwd(), 'uploads', 'invoice_pdfs'),
    path.join(process.cwd(), 'uploads', 'customer_photos'),
    path.join(process.cwd(), 'logs'),
  ];

  directories.forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      logger.info(`Created directory: ${dir}`);
    }
  });
}

async function createInitialData() {
  try {
    // Create default admin user if it doesn't exist
    const adminExists = await User.findOne({ where: { email: 'admin@example.com' } });
    if (!adminExists) {
      await User.create({
        username: 'admin',
        email: 'admin@example.com',
        password: 'changeme', // Will be hashed automatically by the model hook
        isActive: true,
      });
      logger.info('Default admin user created: admin@example.com / changeme');
    }

    // Create sample customers if none exist
    const customerCount = await Customer.count();
    if (customerCount === 0) {
      await Customer.bulkCreate([
        {
          name: 'John Smith',
          billingAddress: '456 Oak Avenue\nSpringfield, IL 62701',
          phone: '(555) 987-6543',
          email: 'john.smith@email.com',
        },
        {
          name: 'Jane Doe',
          billingAddress: '789 Pine Street\nSpringfield, IL 62702',
          phone: '(555) 123-7890',
          email: 'jane.doe@email.com',
        },
      ]);
      logger.info('Sample customers created');
    }
  } catch (error) {
    logger.error('Error creating initial data:', error);
  }
}

async function startServer() {
  try {
    // Test database connection
    await sequelize.authenticate();
    logger.info('Database connected successfully');

    // Create upload directories
    createUploadDirectories();

    // Sync database (always sync in development/docker environment)
    await sequelize.sync({ alter: true });
    logger.info('Database synced');

    // Create initial data
    await createInitialData();

    // Start cron jobs
    cronService.start();

    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Unable to start server:', error);
    process.exit(1);
  }
}

startServer();
