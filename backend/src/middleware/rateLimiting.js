const rateLimit = require('express-rate-limit');
const cacheService = require('../services/cacheService');
const logger = require('../utils/logger');

// Custom rate limit store using Redis
class RedisStore {
  constructor() {
    this.cache = cacheService;
  }

  async increment(key, windowMs) {
    try {
      const result = await this.cache.incrementRateLimit(key, windowMs);
      return {
        totalHits: result.count,
        resetTime: new Date(result.reset)
      };
    } catch (error) {
      logger.error('Rate limit store error:', error);
      // Fallback to memory-based limiting
      return {
        totalHits: 1,
        resetTime: new Date(Date.now() + windowMs)
      };
    }
  }

  async decrement(key) {
    // Optional: implement if you need to decrease counters
    // For most use cases, this is not needed
  }

  async resetKey(key) {
    try {
      await this.cache.del(key);
    } catch (error) {
      logger.error('Rate limit reset error:', error);
    }
  }
}

// Rate limiting configurations
const rateLimitConfigs = {
  // General API rate limiting
  api: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // requests per window
    message: {
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      // Skip rate limiting for health checks
      return req.path === '/api/health';
    }
  },

  // Strict rate limiting for authentication
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // attempts per window
    message: {
      error: 'Too many authentication attempts, please try again later.',
      retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Don't count successful requests
    keyGenerator: (req) => {
      // Use IP + user agent for auth attempts
      return `auth:${req.ip}:${req.get('User-Agent') || 'unknown'}`;
    }
  },

  // File upload rate limiting
  upload: {
    windowMs: 60 * 1000, // 1 minute
    max: 10, // uploads per minute
    message: {
      error: 'Too many file uploads, please try again later.',
      retryAfter: '1 minute'
    }
  },

  // Email sending rate limiting
  email: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 50, // emails per hour
    message: {
      error: 'Email rate limit exceeded, please try again later.',
      retryAfter: '1 hour'
    }
  },

  // PDF generation rate limiting
  pdf: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 20, // PDFs per 5 minutes
    message: {
      error: 'PDF generation rate limit exceeded, please try again later.',
      retryAfter: '5 minutes'
    }
  },

  // Report generation rate limiting (more expensive operations)
  reports: {
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 5, // reports per 10 minutes
    message: {
      error: 'Report generation rate limit exceeded, please try again later.',
      retryAfter: '10 minutes'
    }
  }
};

// Create rate limiters
const createRateLimiter = (config) => {
  const store = cacheService.isConnected() ? new RedisStore() : undefined;
  
  return rateLimit({
    ...config,
    store,
    handler: (req, res) => {
      logger.warn(`Rate limit exceeded for ${req.ip} on ${req.path}`);
      
      res.status(429).json({
        error: config.message.error,
        retryAfter: config.message.retryAfter,
        limit: config.max,
        windowMs: config.windowMs
      });
    },
    onLimitReached: (req, res, options) => {
      logger.warn(`Rate limit reached for ${req.ip} on ${req.path}`);
    }
  });
};

// Export configured rate limiters
const rateLimiters = {
  api: createRateLimiter(rateLimitConfigs.api),
  auth: createRateLimiter(rateLimitConfigs.auth),
  upload: createRateLimiter(rateLimitConfigs.upload),
  email: createRateLimiter(rateLimitConfigs.email),
  pdf: createRateLimiter(rateLimitConfigs.pdf),
  reports: createRateLimiter(rateLimitConfigs.reports)
};

// Dynamic rate limiter based on user type
const createDynamicRateLimiter = (getUserType) => {
  return async (req, res, next) => {
    try {
      const userType = await getUserType(req);
      let config;

      switch (userType) {
        case 'admin':
          config = {
            windowMs: 15 * 60 * 1000,
            max: 1000 // Higher limit for admins
          };
          break;
        case 'premium':
          config = {
            windowMs: 15 * 60 * 1000,
            max: 500 // Higher limit for premium users
          };
          break;
        default:
          config = rateLimitConfigs.api;
      }

      const limiter = createRateLimiter(config);
      return limiter(req, res, next);
    } catch (error) {
      // Fallback to default rate limiting
      return rateLimiters.api(req, res, next);
    }
  };
};

// IP whitelist middleware
const createIPWhitelist = (whitelist = []) => {
  const whitelistedIPs = new Set([
    '127.0.0.1',
    '::1',
    'localhost',
    ...whitelist
  ]);

  return (req, res, next) => {
    const clientIP = req.ip || req.connection.remoteAddress;
    
    if (whitelistedIPs.has(clientIP)) {
      // Skip rate limiting for whitelisted IPs
      return next();
    }
    
    // Apply rate limiting
    return rateLimiters.api(req, res, next);
  };
};

// Adaptive rate limiting based on server load
const createAdaptiveRateLimiter = () => {
  return (req, res, next) => {
    // Simple server load check (you could use more sophisticated metrics)
    const memUsage = process.memoryUsage();
    const memUsagePercent = memUsage.heapUsed / memUsage.heapTotal;
    
    let config = rateLimitConfigs.api;
    
    if (memUsagePercent > 0.8) {
      // High load - stricter limits
      config = {
        ...config,
        max: Math.floor(config.max * 0.5)
      };
    } else if (memUsagePercent > 0.6) {
      // Medium load - slightly stricter
      config = {
        ...config,
        max: Math.floor(config.max * 0.75)
      };
    }
    
    const limiter = createRateLimiter(config);
    return limiter(req, res, next);
  };
};

// Rate limiting for specific routes
const routeSpecificLimiters = {
  '/api/auth/login': rateLimiters.auth,
  '/api/auth/register': rateLimiters.auth,
  '/api/invoices/*/pdf': rateLimiters.pdf,
  '/api/invoices/*/send-email': rateLimiters.email,
  '/api/expenses': rateLimiters.upload,
  '/api/reports/*': rateLimiters.reports
};

// Middleware to apply route-specific rate limiting
const applyRouteSpecificLimiting = (req, res, next) => {
  const path = req.path;
  
  // Check for exact matches first
  if (routeSpecificLimiters[path]) {
    return routeSpecificLimiters[path](req, res, next);
  }
  
  // Check for pattern matches
  for (const [pattern, limiter] of Object.entries(routeSpecificLimiters)) {
    if (pattern.includes('*')) {
      const regex = new RegExp(pattern.replace(/\*/g, '[^/]+'));
      if (regex.test(path)) {
        return limiter(req, res, next);
      }
    }
  }
  
  // Default rate limiting
  return rateLimiters.api(req, res, next);
};

// Rate limit status endpoint
const getRateLimitStatus = async (req, res) => {
  try {
    const key = `api:${req.ip}`;
    const windowMs = rateLimitConfigs.api.windowMs;
    const now = Math.floor(Date.now() / windowMs) * windowMs;
    
    // Get current count if using Redis
    let currentCount = 0;
    if (cacheService.isConnected()) {
      const result = await cacheService.get(`rate:${key}:${Math.floor(now / windowMs)}`);
      currentCount = result || 0;
    }
    
    res.json({
      ip: req.ip,
      currentCount,
      limit: rateLimitConfigs.api.max,
      windowMs: rateLimitConfigs.api.windowMs,
      remaining: Math.max(0, rateLimitConfigs.api.max - currentCount),
      resetTime: now + windowMs
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get rate limit status' });
  }
};

module.exports = {
  rateLimiters,
  createRateLimiter,
  createDynamicRateLimiter,
  createIPWhitelist,
  createAdaptiveRateLimiter,
  applyRouteSpecificLimiting,
  getRateLimitStatus,
  RedisStore
};