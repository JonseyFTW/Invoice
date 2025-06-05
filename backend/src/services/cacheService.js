const redis = require('redis');
const logger = require('../utils/logger');

class CacheService {
  constructor() {
    this.client = null;
    this.connected = false;
    this.defaultTTL = 3600; // 1 hour
  }

  async connect() {
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      
      this.client = redis.createClient({
        url: redisUrl,
        retry_strategy: (options) => {
          if (options.error && options.error.code === 'ECONNREFUSED') {
            logger.error('Redis connection refused');
            return new Error('Redis connection refused');
          }
          if (options.total_retry_time > 1000 * 60 * 60) {
            return new Error('Redis retry time exhausted');
          }
          if (options.attempt > 10) {
            return undefined;
          }
          return Math.min(options.attempt * 100, 3000);
        }
      });

      this.client.on('error', (err) => {
        logger.error('Redis client error:', err);
        this.connected = false;
      });

      this.client.on('connect', () => {
        logger.info('Redis client connected');
        this.connected = true;
      });

      this.client.on('reconnecting', () => {
        logger.info('Redis client reconnecting');
      });

      this.client.on('ready', () => {
        logger.info('Redis client ready');
        this.connected = true;
      });

      await this.client.connect();
      
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      this.connected = false;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.disconnect();
      this.connected = false;
      logger.info('Redis client disconnected');
    }
  }

  isConnected() {
    return this.connected;
  }

  async get(key) {
    if (!this.connected) {
      logger.warn('Redis not connected, cache get failed');
      return null;
    }

    try {
      const value = await this.client.get(key);
      if (value) {
        return JSON.parse(value);
      }
      return null;
    } catch (error) {
      logger.error('Cache get error:', error);
      return null;
    }
  }

  async set(key, value, ttl = this.defaultTTL) {
    if (!this.connected) {
      logger.warn('Redis not connected, cache set failed');
      return false;
    }

    try {
      const serialized = JSON.stringify(value);
      await this.client.setEx(key, ttl, serialized);
      return true;
    } catch (error) {
      logger.error('Cache set error:', error);
      return false;
    }
  }

  async del(key) {
    if (!this.connected) {
      logger.warn('Redis not connected, cache delete failed');
      return false;
    }

    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      logger.error('Cache delete error:', error);
      return false;
    }
  }

  async exists(key) {
    if (!this.connected) {
      return false;
    }

    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Cache exists error:', error);
      return false;
    }
  }

  async flushAll() {
    if (!this.connected) {
      logger.warn('Redis not connected, cache flush failed');
      return false;
    }

    try {
      await this.client.flushAll();
      logger.info('Cache flushed');
      return true;
    } catch (error) {
      logger.error('Cache flush error:', error);
      return false;
    }
  }

  async increment(key, amount = 1) {
    if (!this.connected) {
      return null;
    }

    try {
      return await this.client.incrBy(key, amount);
    } catch (error) {
      logger.error('Cache increment error:', error);
      return null;
    }
  }

  async expire(key, ttl) {
    if (!this.connected) {
      return false;
    }

    try {
      await this.client.expire(key, ttl);
      return true;
    } catch (error) {
      logger.error('Cache expire error:', error);
      return false;
    }
  }

  async mget(keys) {
    if (!this.connected) {
      return [];
    }

    try {
      const values = await this.client.mGet(keys);
      return values.map(value => value ? JSON.parse(value) : null);
    } catch (error) {
      logger.error('Cache mget error:', error);
      return [];
    }
  }

  async mset(keyValuePairs, ttl = this.defaultTTL) {
    if (!this.connected) {
      return false;
    }

    try {
      const pipeline = this.client.multi();
      
      for (const [key, value] of Object.entries(keyValuePairs)) {
        const serialized = JSON.stringify(value);
        pipeline.setEx(key, ttl, serialized);
      }
      
      await pipeline.exec();
      return true;
    } catch (error) {
      logger.error('Cache mset error:', error);
      return false;
    }
  }

  // Specific cache methods for the invoice app
  async cacheInvoice(invoice) {
    const key = `invoice:${invoice.id}`;
    return await this.set(key, invoice, 1800); // 30 minutes
  }

  async getCachedInvoice(invoiceId) {
    const key = `invoice:${invoiceId}`;
    return await this.get(key);
  }

  async invalidateInvoiceCache(invoiceId) {
    const key = `invoice:${invoiceId}`;
    return await this.del(key);
  }

  async cacheCustomer(customer) {
    const key = `customer:${customer.id}`;
    return await this.set(key, customer, 3600); // 1 hour
  }

  async getCachedCustomer(customerId) {
    const key = `customer:${customerId}`;
    return await this.get(key);
  }

  async invalidateCustomerCache(customerId) {
    const key = `customer:${customerId}`;
    return await this.del(key);
  }

  async cacheReportData(reportType, data, ttl = 900) { // 15 minutes for reports
    const key = `report:${reportType}`;
    return await this.set(key, data, ttl);
  }

  async getCachedReportData(reportType) {
    const key = `report:${reportType}`;
    return await this.get(key);
  }

  async invalidateReportCache() {
    if (!this.connected) {
      return false;
    }

    try {
      const keys = await this.client.keys('report:*');
      if (keys.length > 0) {
        await this.client.del(keys);
      }
      return true;
    } catch (error) {
      logger.error('Error invalidating report cache:', error);
      return false;
    }
  }

  // Session management
  async setSession(sessionId, data, ttl = 86400) { // 24 hours
    const key = `session:${sessionId}`;
    return await this.set(key, data, ttl);
  }

  async getSession(sessionId) {
    const key = `session:${sessionId}`;
    return await this.get(key);
  }

  async deleteSession(sessionId) {
    const key = `session:${sessionId}`;
    return await this.del(key);
  }

  // Rate limiting support
  async incrementRateLimit(key, windowMs) {
    if (!this.connected) {
      return { count: 0, reset: Date.now() + windowMs };
    }

    try {
      const multi = this.client.multi();
      const now = Date.now();
      const window = Math.floor(now / windowMs);
      const rateKey = `rate:${key}:${window}`;
      
      multi.incr(rateKey);
      multi.expire(rateKey, Math.ceil(windowMs / 1000));
      
      const results = await multi.exec();
      const count = results[0][1];
      const reset = (window + 1) * windowMs;
      
      return { count, reset };
    } catch (error) {
      logger.error('Rate limit error:', error);
      return { count: 0, reset: Date.now() + windowMs };
    }
  }

  // Health check
  async healthCheck() {
    if (!this.connected) {
      return { status: 'disconnected', latency: null };
    }

    try {
      const start = Date.now();
      await this.client.ping();
      const latency = Date.now() - start;
      
      return { status: 'connected', latency };
    } catch (error) {
      return { status: 'error', latency: null, error: error.message };
    }
  }

  // Statistics
  async getStats() {
    if (!this.connected) {
      return null;
    }

    try {
      const info = await this.client.info();
      const keyspace = await this.client.info('keyspace');
      
      return {
        connected: this.connected,
        info,
        keyspace
      };
    } catch (error) {
      logger.error('Error getting cache stats:', error);
      return null;
    }
  }
}

module.exports = new CacheService();