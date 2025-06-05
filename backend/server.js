require('dotenv').config();
const app = require('./src/app');
const { sequelize } = require('./src/models');
const logger = require('./src/utils/logger');
const cronService = require('./src/services/cronService');

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Test database connection
    await sequelize.authenticate();
    logger.info('Database connected successfully');
    
    // Sync database (in production, use migrations instead)
    if (process.env.NODE_ENV !== 'production') {
      await sequelize.sync({ alter: true });
      logger.info('Database synced');
    }
    
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