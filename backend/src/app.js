const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const authRoutes = require('./routes/auth');
const customerRoutes = require('./routes/customer');
const propertyRoutes = require('./routes/properties');
const invoiceRoutes = require('./routes/invoices');
const expenseRoutes = require('./routes/expenses');
const recurringRoutes = require('./routes/recurring');
const reportRoutes = require('./routes/reports');
const healthRoutes = require('./routes/health');
const demoDataRoutes = require('./routes/demoData');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');

const app = express();

// Trust proxy (required for rate limiting behind nginx)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = [
      'http://localhost:3000',
      'https://invoice-frontend-staging.up.railway.app',
      'https://invoice-frontend-production-4123.up.railway.app',
      process.env.FRONTEND_URL
    ].filter(Boolean);
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
    return callback(new Error(msg), false);
  },
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP',
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static file serving with CORS
const staticCorsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      'http://localhost:3000',
      'https://invoice-frontend-staging.up.railway.app',
      'https://invoice-frontend-production-4123.up.railway.app',
      process.env.FRONTEND_URL
    ].filter(Boolean);
    
    console.log(`STATIC CORS DEBUG - Request from origin: ${origin}`);
    console.log(`STATIC CORS DEBUG - Allowed origins: ${allowedOrigins.join(', ')}`);
    
    // Allow requests with no origin (like direct access)
    if (!origin) {
      console.log('STATIC CORS DEBUG - No origin, allowing');
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin)) {
      console.log(`STATIC CORS DEBUG - Origin allowed: ${origin}`);
      return callback(null, true);
    }
    
    console.log(`STATIC CORS DEBUG - Origin NOT allowed: ${origin}`);
    const msg = 'The CORS policy for static files does not allow access from the specified Origin.';
    return callback(new Error(msg), false);
  },
  credentials: false,
  methods: ['GET'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept']
};

app.use('/uploads', cors(staticCorsOptions), express.static(path.join(__dirname, '../uploads')));

// Logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path} - ${req.ip}`);
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/recurring', recurringRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/demo-data', demoDataRoutes);

// Error handling
app.use(errorHandler);

module.exports = app;
