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

// Static file serving with CORS - Allow all origins for static files
app.use('/uploads', (req, res, next) => {
  const allowedOrigins = [
    'http://localhost:3000',
    'https://invoice-frontend-staging.up.railway.app',
    'https://invoice-frontend-production-4123.up.railway.app',
    process.env.FRONTEND_URL
  ].filter(Boolean);
  
  const origin = req.headers.origin;
  console.log(`STATIC CORS DEBUG - Request from origin: ${origin}`);
  
  // Always set CORS headers for static files
  if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    console.log(`STATIC CORS DEBUG - Origin allowed: ${origin}`);
  } else if (!origin) {
    // For image requests without origin, allow all (this is safe for public static files)
    res.header('Access-Control-Allow-Origin', '*');
    console.log('STATIC CORS DEBUG - No origin, setting wildcard');
  } else {
    console.log(`STATIC CORS DEBUG - Unknown origin, setting wildcard: ${origin}`);
    res.header('Access-Control-Allow-Origin', '*');
  }
  
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
}, express.static(path.join(__dirname, '../uploads')));

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
