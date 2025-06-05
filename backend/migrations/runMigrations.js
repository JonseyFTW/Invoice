const { sequelize } = require('../src/models');
const logger = require('../src/utils/logger');

async function runMigrations() {
  try {
    logger.info('Starting database migrations...');
    
    // Test database connection
    await sequelize.authenticate();
    logger.info('Database connected successfully');
    
    // Sync all models
    await sequelize.sync({ force: false, alter: true });
    logger.info('Database tables synchronized');
    
    // Run any custom migrations here
    await createInitialData();
    
    logger.info('Database migrations completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Migration failed:', error);
    process.exit(1);
  }
}

async function createInitialData() {
  const { User } = require('../src/models');
  
  try {
    // Check if admin user exists
    const adminExists = await User.findOne({ where: { username: 'admin' } });
    
    if (!adminExists) {
      await User.create({
        username: 'admin',
        email: 'admin@example.com',
        password: 'changeme' // This will be hashed by the model hook
      });
      logger.info('Created default admin user');
    }
  } catch (error) {
    logger.error('Error creating initial data:', error);
  }
}

// Run migrations if this file is executed directly
if (require.main === module) {
  runMigrations();
}

module.exports = runMigrations;